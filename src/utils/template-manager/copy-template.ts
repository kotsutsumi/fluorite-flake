/**
 * テンプレートディレクトリのコピーと整形
 */

import { constants as fsConstants } from "node:fs";
import {
    access,
    chmod,
    cp,
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
    relative = ""
): Promise<CopyTemplateResult> {
    const currentPath = relative ? join(root, relative) : root;
    const dirents = await readdir(currentPath, { withFileTypes: true });

    const files: string[] = [];
    const directories: string[] = relative ? [relative] : [];

    for (const dirent of dirents) {
        const nextRelative = relative
            ? join(relative, dirent.name)
            : dirent.name;
        if (dirent.isDirectory()) {
            const nested = await collectEntries(root, nextRelative);
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

    await mkdir(options.targetDirectory, { recursive: true });
    await cp(sourceDir, options.targetDirectory, { recursive: true });

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

    const { files, directories } = await collectEntries(
        options.targetDirectory
    );
    return { files, directories };
}

// EOF
