/**
 * テンプレートディレクトリのコピーと整形
 */

import { constants as fsConstants } from "node:fs";
import {
    access,
    chmod,
    mkdir,
    readdir,
    readFile,
    stat,
    writeFile,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { CopyTemplateOptions, CopyTemplateResult } from "./types.js";

/**
 * ファイルパスがパターンと一致するかチェック
 */
function isExcludedByPattern(filePath: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
        // シンプルなグロブパターン（**を含む）をサポート
        // 先にドット（.）をエスケープしてから、ワイルドカードを処理
        const regexPattern = pattern
            .replace(/\./g, "\\.")
            .replace(/\*\*/g, ".*")
            .replace(/\*/g, "[^/]*");

        const regex = new RegExp(`^${regexPattern}$`);
        if (regex.test(filePath)) {
            return true;
        }
    }
    return false;
}

/**
 * テンプレートのルートディレクトリを解決
 */
async function resolveTemplateRoot(): Promise<string> {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const candidates = [
        resolve(currentDir, "../../templates"),
        resolve(currentDir, "../../../templates"),
    ];

    for (const candidate of candidates) {
        try {
            await access(candidate, fsConstants.R_OK);
            return candidate;
        } catch {
            // スキップして次の候補を確認
        }
    }

    throw new Error(
        `テンプレートディレクトリが見つかりません: ${candidates.join(", ")}`
    );
}

/**
 * ディレクトリ配下のファイル・ディレクトリを列挙
 */
async function collectEntries(
    root: string,
    relative = "",
    excludePatterns: string[] = []
): Promise<CopyTemplateResult> {
    const currentPath = relative ? join(root, relative) : root;
    const dirents = await readdir(currentPath, { withFileTypes: true });

    const files: string[] = [];
    const directories: string[] = relative ? [relative] : [];

    for (const dirent of dirents) {
        const nextRelative = relative
            ? join(relative, dirent.name)
            : dirent.name;

        // 除外パターンをチェック
        if (isExcludedByPattern(nextRelative, excludePatterns)) {
            continue;
        }

        if (dirent.isDirectory()) {
            const nested = await collectEntries(
                root,
                nextRelative,
                excludePatterns
            );
            files.push(...nested.files);
            directories.push(...nested.directories);
        } else {
            files.push(nextRelative);
        }
    }

    return { files, directories };
}

/**
 * プレースホルダーを置換
 */
async function applyVariables(
    targetDirectory: string,
    files: string[],
    variables: Record<string, string>
): Promise<void> {
    for (const relativePath of files) {
        const filePath = join(targetDirectory, relativePath);
        try {
            await stat(filePath);
        } catch {
            continue;
        }

        const original = await readFile(filePath, "utf8");
        const updated = Object.entries(variables).reduce(
            (content, [key, value]) => content.split(key).join(value),
            original
        );

        if (updated !== original) {
            await writeFile(filePath, updated, "utf8");
        }
    }
}

/**
 * テンプレートを指定ディレクトリへコピー
 */
export async function copyTemplateDirectory(
    options: CopyTemplateOptions
): Promise<CopyTemplateResult> {
    const templateRoot = await resolveTemplateRoot();
    const sourceSegments = options.variant
        ? [options.templateName, options.variant]
        : [options.templateName];
    const sourceDir = resolve(templateRoot, ...sourceSegments);

    try {
        await access(sourceDir, fsConstants.R_OK);
    } catch {
        throw new Error(`テンプレートが見つかりません: ${sourceDir}`);
    }

    // ファイル一覧を取得（除外パターンを適用）
    const entries = await collectEntries(
        sourceDir,
        "",
        options.excludePatterns || []
    );

    // ターゲットディレクトリを作成
    await mkdir(options.targetDirectory, { recursive: true });

    // ディレクトリを作成
    for (const dirPath of entries.directories) {
        const targetDir = join(options.targetDirectory, dirPath);
        await mkdir(targetDir, { recursive: true });
    }

    // ファイルをコピー
    for (const filePath of entries.files) {
        const sourcePath = join(sourceDir, filePath);
        const targetPath = join(options.targetDirectory, filePath);

        // ディレクトリが存在しない場合は作成
        const targetDirPath = dirname(targetPath);
        await mkdir(targetDirPath, { recursive: true });

        // ファイルをコピー
        const content = await readFile(sourcePath);
        await writeFile(targetPath, content);
    }

    if (options.executableFiles?.length) {
        for (const relativePath of options.executableFiles) {
            const filePath = join(options.targetDirectory, relativePath);
            try {
                await chmod(filePath, 0o755);
            } catch {
                // 実行属性が不要な環境もあるためスキップ
            }
        }
    }

    if (options.variables && options.variableFiles?.length) {
        await applyVariables(
            options.targetDirectory,
            options.variableFiles,
            options.variables
        );
    }

    // 実際にコピーしたファイル一覧を返す
    return entries;
}

// EOF
