/**
 * monorepoディレクトリ構造を作成するユーティリティ
 */
import fs from "node:fs";
import path from "node:path";

import type { ProjectConfig } from "../../commands/create/types.js";

/**
 * monorepoディレクトリ構造を作成
 */
export function createMonorepoStructure(config: ProjectConfig): void {
    const { directory, shouldGenerateDocs } = config;

    // 基本ディレクトリ構造を作成
    const dirs = [
        directory,
        path.join(directory, "apps"),
        path.join(directory, "packages"),
        path.join(directory, "apps", "web"),
    ];

    // ドキュメント生成が有効な場合はdocsディレクトリも追加
    if (shouldGenerateDocs) {
        dirs.push(path.join(directory, "apps", "docs"));
    }

    for (const dir of dirs) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
}

// EOF
