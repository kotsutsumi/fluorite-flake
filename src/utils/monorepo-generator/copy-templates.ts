import fs from "node:fs";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import type { ProjectConfig } from "../../commands/create/types.js";

// 現在のファイルのディレクトリを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * monorepoテンプレートファイルをコピー
 */
export function copyMonorepoTemplates(config: ProjectConfig): void {
    const { directory, name } = config;
    // プロジェクトルートのtemplatesディレクトリを参照
    const templateDir = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "templates",
        "monorepo"
    );

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
