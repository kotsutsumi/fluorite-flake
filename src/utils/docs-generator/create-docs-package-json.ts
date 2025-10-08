/**
 * Nextraドキュメント用のpackage.json生成処理
 */

import fs from "node:fs";
import path from "node:path";

/**
 * ドキュメント用package.jsonの設定オプション
 */
export interface DocsPackageJsonOptions {
    /** プロジェクト名 */
    projectName: string;
    /** 出力先ディレクトリパス */
    outputPath: string;
    /** モノレポ構造での配置かどうか */
    isMonorepo: boolean;
    /** Reactのバージョン */
    reactVersion?: string;
    /** Next.jsのバージョン */
    nextVersion?: string;
    /** Nextraのバージョン */
    nextraVersion?: string;
}

/**
 * Nextraドキュメント用のpackage.jsonを生成する
 *
 * @param options - package.json設定オプション
 * @returns 生成に成功した場合はtrue、失敗した場合はfalse
 */
export async function createDocsPackageJson(options: DocsPackageJsonOptions): Promise<boolean> {
    try {
        // 出力先ディレクトリの設定
        const docsPath = options.isMonorepo
            ? path.join(options.outputPath, "apps", "docs")
            : path.join(options.outputPath, "docs");

        // package.jsonの内容を生成
        const packageJson = generatePackageJsonContent(options);

        // package.jsonファイルの書き込み
        const packageJsonPath = path.join(docsPath, "package.json");
        fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf-8");

        console.log(`✅ ドキュメント用package.jsonを生成しました: ${packageJsonPath}`);
        return true;
    } catch (error) {
        console.error("❌ ドキュメント用package.jsonの生成に失敗しました:", error);
        return false;
    }
}

/**
 * package.jsonの内容を生成する
 *
 * @param options - 設定オプション
 * @returns package.jsonオブジェクト
 */
function generatePackageJsonContent(options: DocsPackageJsonOptions): Record<string, any> {
    // バージョンのデフォルト値設定
    const reactVersion = options.reactVersion || "^19.1.0";
    const nextVersion = options.nextVersion || "^15.5.4";
    const nextraVersion = options.nextraVersion || "^4.6.0";

    // プロジェクト名の設定
    const packageName = options.isMonorepo ? `${options.projectName}-docs` : `${options.projectName}-docs`;

    // 基本的なpackage.json構造
    const packageJson: Record<string, any> = {
        name: packageName,
        version: "0.1.0",
        description: `Documentation site for ${options.projectName}`,
        private: true,
        scripts: {
            dev: "next dev",
            build: "next build",
            start: "next start",
            lint: "next lint",
            export: "next build && next export",
        },
        dependencies: {
            next: nextVersion,
            react: reactVersion,
            "react-dom": reactVersion,
            nextra: nextraVersion,
            "nextra-theme-docs": nextraVersion,
        },
        devDependencies: {
            "@types/node": "^22",
            "@types/react": "^19",
            "@types/react-dom": "^19",
            eslint: "^9",
            "eslint-config-next": nextVersion,
            typescript: "^5",
        },
        engines: {
            node: ">=20.0.0",
            pnpm: ">=9.0.0",
        },
    };

    // モノレポの場合の調整
    if (options.isMonorepo) {
        // workspaceに配置される場合は、一部依存関係をpeerDependenciesに移動
        packageJson.peerDependencies = {
            react: reactVersion,
            "react-dom": reactVersion,
        };

        // 開発用の依存関係から react と react-dom を削除
        delete packageJson.dependencies.react;
        delete packageJson.dependencies["react-dom"];
    }

    return packageJson;
}

/**
 * 既存のpackage.jsonからバージョン情報を取得する
 *
 * @param projectPath - プロジェクトのルートパス
 * @returns バージョン情報オブジェクト
 */
export function extractVersionsFromProject(projectPath: string): {
    reactVersion?: string;
    nextVersion?: string;
    nextraVersion?: string;
} {
    try {
        const packageJsonPath = path.join(projectPath, "package.json");

        if (!fs.existsSync(packageJsonPath)) {
            return {};
        }

        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

        return {
            reactVersion: deps.react,
            nextVersion: deps.next,
            nextraVersion: deps.nextra,
        };
    } catch (error) {
        console.warn("バージョン情報の取得に失敗しました:", error);
        return {};
    }
}

// EOF
