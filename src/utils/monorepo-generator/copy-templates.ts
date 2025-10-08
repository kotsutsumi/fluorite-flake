/**
 * monorepoテンプレートファイルをコピーするユーティリティ
 */
import fs from "node:fs";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import type { ProjectConfig } from "../../commands/create/types.js";

/**
 * パッケージルートディレクトリを動的に検索する
 */
function findPackageRoot(startPath: string): string {
    let currentPath = startPath;

    while (currentPath !== path.dirname(currentPath)) {
        const packageJsonPath = path.join(currentPath, "package.json");
        if (fs.existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
                // fluorite-flakeパッケージかどうか確認
                if (packageJson.name === "fluorite-flake") {
                    return currentPath;
                }
            } catch {
                // package.jsonの読み込みに失敗した場合は続行
            }
        }
        currentPath = path.dirname(currentPath);
    }

    // フォールバック: 従来の方法
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    return path.join(__dirname, "..", "..", "..");
}

/**
 * monorepoテンプレートファイルをコピー
 * @param config プロジェクト設定
 * @param pnpmVersion pnpmバージョン（省略時は"latest"）
 */
export function copyMonorepoTemplates(config: ProjectConfig, pnpmVersion?: string): void {
    const { directory, name } = config;

    // パッケージルートディレクトリを取得
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const packageRoot = findPackageRoot(__dirname);

    // templatesディレクトリのパスを決定
    const templateDir = path.join(packageRoot, "templates", "monorepo");

    // pnpmバージョンを処理（フォールバック: "latest"）
    const finalPnpmVersion = pnpmVersion || "latest";
    const majorVersionMatch = finalPnpmVersion.match(/^(\d+)/);
    const majorVersion = majorVersionMatch ? majorVersionMatch[1] : "10";

    // package.json.templateを処理してコピー
    const packageJsonTemplate = fs.readFileSync(path.join(templateDir, "package.json.template"), "utf-8");

    // プレースホルダーを置換
    const packageJson = packageJsonTemplate
        .replace(/\{\{PROJECT_NAME\}\}/g, name)
        .replace(/\{\{PNPM_VERSION\}\}/g, finalPnpmVersion)
        .replace(/\{\{PNPM_MAJOR_VERSION\}\}/g, majorVersion);

    fs.writeFileSync(path.join(directory, "package.json"), packageJson, "utf-8");

    // その他のファイルをそのままコピー
    const filesToCopy = [
        { src: "pnpm-workspace.yaml", dest: "pnpm-workspace.yaml" },
        { src: "turbo.json", dest: "turbo.json" },
        { src: "biome.json.template", dest: "biome.json" },
        { src: "tsconfig.base.json", dest: "tsconfig.base.json" },
    ];

    // .gitignore を個別にコピー（shared/monorepo テンプレートから）
    const sharedMonorepoTemplateDir = path.join(packageRoot, "templates", "shared", "monorepo");
    const gitignoreSourcePath = path.join(sharedMonorepoTemplateDir, "gitignore");
    const gitignoreDestPath = path.join(directory, ".gitignore");

    if (fs.existsSync(gitignoreSourcePath)) {
        fs.copyFileSync(gitignoreSourcePath, gitignoreDestPath);
    }

    for (const file of filesToCopy) {
        const sourcePath = path.join(templateDir, file.src);
        const destPath = path.join(directory, file.dest);

        if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, destPath);
        }
    }
}

// EOF
