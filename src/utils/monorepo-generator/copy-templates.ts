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
                const packageJson = JSON.parse(
                    fs.readFileSync(packageJsonPath, "utf-8")
                );
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
 */
export function copyMonorepoTemplates(config: ProjectConfig): void {
    const { directory, name } = config;

    // パッケージルートディレクトリを取得
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const packageRoot = findPackageRoot(__dirname);

    // templatesディレクトリのパスを決定
    const templateDir = path.join(packageRoot, "templates", "monorepo");

    // package.json.templateを処理してコピー
    const packageJsonTemplate = fs.readFileSync(
        path.join(templateDir, "package.json.template"),
        "utf-8"
    );
    const packageJson = packageJsonTemplate.replace(
        /\{\{PROJECT_NAME\}\}/g,
        name
    );
    fs.writeFileSync(
        path.join(directory, "package.json"),
        packageJson,
        "utf-8"
    );

    // その他のファイルをそのままコピー
    const filesToCopy = [
        { src: "pnpm-workspace.yaml", dest: "pnpm-workspace.yaml" },
        { src: "turbo.json", dest: "turbo.json" },
        { src: "biome.json.template", dest: "biome.json" },
        { src: "tsconfig.base.json", dest: "tsconfig.base.json" },
    ];

    for (const file of filesToCopy) {
        const sourcePath = path.join(templateDir, file.src);
        const destPath = path.join(directory, file.dest);

        if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, destPath);
        }
    }
}

// EOF
