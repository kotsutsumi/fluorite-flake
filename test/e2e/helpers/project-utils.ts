/**
 * プロジェクト操作ユーティリティ
 * E2Eテストでプロジェクトファイルの操作・検証を行うためのヘルパー
 */

import fs from "node:fs/promises";
import path from "node:path";

// package.json の型定義
export type PackageJson = {
    name?: string;
    version?: string;
    description?: string;
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    keywords?: string[];
    author?: string;
    license?: string;
    [key: string]: unknown;
};

// プロジェクト検証結果
export type ProjectValidation = {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    files: {
        exists: string[];
        missing: string[];
    };
    dependencies: {
        production: string[];
        development: string[];
        missing: string[];
    };
};

/**
 * ファイルの存在確認
 */
export async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

/**
 * ディレクトリの存在確認
 */
export async function directoryExists(dirPath: string): Promise<boolean> {
    try {
        const stat = await fs.stat(dirPath);
        return stat.isDirectory();
    } catch {
        return false;
    }
}

/**
 * package.json を読み取る
 */
export async function readPackageJson(
    projectPath: string
): Promise<PackageJson> {
    const packageJsonPath = path.join(projectPath, "package.json");
    const content = await fs.readFile(packageJsonPath, "utf8");
    return JSON.parse(content) as PackageJson;
}

/**
 * package.json に依存関係が含まれているかチェック
 */
export function hasDependency(
    packageJson: PackageJson,
    packageName: string,
    type: "dependencies" | "devDependencies" | "both" = "both"
): boolean {
    const deps = packageJson.dependencies || {};
    const devDeps = packageJson.devDependencies || {};

    switch (type) {
        case "dependencies":
            return packageName in deps;
        case "devDependencies":
            return packageName in devDeps;
        case "both":
            return packageName in deps || packageName in devDeps;
        default:
            return false;
    }
}

/**
 * TypeScript設定ファイルの存在確認
 */
export async function hasTypeScriptConfig(
    projectPath: string
): Promise<boolean> {
    const tsconfigPath = path.join(projectPath, "tsconfig.json");
    return await fileExists(tsconfigPath);
}

/**
 * Next.js プロジェクトかどうかチェック
 */
export async function isNextJsProject(projectPath: string): Promise<boolean> {
    try {
        const packageJson = await readPackageJson(projectPath);
        return hasDependency(packageJson, "next");
    } catch {
        return false;
    }
}

/**
 * Expo プロジェクトかどうかチェック
 */
export async function isExpoProject(projectPath: string): Promise<boolean> {
    try {
        const packageJson = await readPackageJson(projectPath);
        return hasDependency(packageJson, "expo");
    } catch {
        return false;
    }
}

/**
 * Tauri プロジェクトかどうかチェック
 */
export async function isTauriProject(projectPath: string): Promise<boolean> {
    try {
        const packageJson = await readPackageJson(projectPath);
        const hasTauriDep = hasDependency(
            packageJson,
            "@tauri-apps/cli",
            "devDependencies"
        );
        const tauriConfigExists = await fileExists(
            path.join(projectPath, "src-tauri", "tauri.conf.json")
        );
        return hasTauriDep && tauriConfigExists;
    } catch {
        return false;
    }
}

/**
 * モノレポプロジェクトかどうかチェック
 */
export async function isMonorepoProject(projectPath: string): Promise<boolean> {
    try {
        const packageJson = await readPackageJson(projectPath);
        const hasWorkspaces = "workspaces" in packageJson;
        const appsExists = await directoryExists(
            path.join(projectPath, "apps")
        );
        const packagesExists = await directoryExists(
            path.join(projectPath, "packages")
        );
        return hasWorkspaces && (appsExists || packagesExists);
    } catch {
        return false;
    }
}

/**
 * プロジェクト構造を検証する
 */
export async function validateProjectStructure(
    projectPath: string,
    expectedFiles: string[],
    expectedDependencies: string[] = []
): Promise<ProjectValidation> {
    const validation: ProjectValidation = {
        isValid: true,
        errors: [],
        warnings: [],
        files: {
            exists: [],
            missing: [],
        },
        dependencies: {
            production: [],
            development: [],
            missing: [],
        },
    };

    // ファイル存在確認
    for (const file of expectedFiles) {
        const filePath = path.join(projectPath, file);
        if (await fileExists(filePath)) {
            validation.files.exists.push(file);
        } else {
            validation.files.missing.push(file);
            validation.errors.push(`Missing required file: ${file}`);
            validation.isValid = false;
        }
    }

    // 依存関係確認
    try {
        const packageJson = await readPackageJson(projectPath);
        const allDeps = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies,
        };

        validation.dependencies.production = Object.keys(
            packageJson.dependencies || {}
        );
        validation.dependencies.development = Object.keys(
            packageJson.devDependencies || {}
        );

        for (const dep of expectedDependencies) {
            if (dep in allDeps) {
                // 依存関係が存在する場合はOK
            } else {
                validation.dependencies.missing.push(dep);
                validation.warnings.push(`Missing expected dependency: ${dep}`);
            }
        }
    } catch (error) {
        validation.errors.push(`Failed to read package.json: ${error}`);
        validation.isValid = false;
    }

    return validation;
}

/**
 * プロジェクトファイルの内容を読み取る
 */
export async function readProjectFile(
    projectPath: string,
    relativePath: string
): Promise<string> {
    const filePath = path.join(projectPath, relativePath);
    return await fs.readFile(filePath, "utf8");
}

/**
 * プロジェクトファイルの内容に特定の文字列が含まれているかチェック
 */
export async function projectFileContains(
    projectPath: string,
    relativePath: string,
    searchString: string
): Promise<boolean> {
    try {
        const content = await readProjectFile(projectPath, relativePath);
        return content.includes(searchString);
    } catch {
        return false;
    }
}

/**
 * プロジェクトのサイズを計算する
 */
export async function calculateProjectSize(projectPath: string): Promise<{
    totalSize: number;
    fileCount: number;
    directoryCount: number;
}> {
    let totalSize = 0;
    let fileCount = 0;
    let directoryCount = 0;

    async function walkDirectory(dir: string): Promise<void> {
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });

            for (const entry of entries) {
                const entryPath = path.join(dir, entry.name);

                // node_modules や .git は除外
                if (entry.name === "node_modules" || entry.name === ".git") {
                    continue;
                }

                if (entry.isFile()) {
                    const stat = await fs.stat(entryPath);
                    totalSize += stat.size;
                    fileCount++;
                } else if (entry.isDirectory()) {
                    directoryCount++;
                    await walkDirectory(entryPath);
                }
            }
        } catch {
            // アクセスできないディレクトリはスキップ
        }
    }

    await walkDirectory(projectPath);

    return {
        totalSize,
        fileCount,
        directoryCount,
    };
}

/**
 * プロジェクトのgit初期化状態を確認
 */
export async function isGitInitialized(projectPath: string): Promise<boolean> {
    const gitDirPath = path.join(projectPath, ".git");
    return await directoryExists(gitDirPath);
}

/**
 * プロジェクト内の特定パターンのファイルを検索
 */
export async function findProjectFiles(
    projectPath: string,
    pattern: RegExp,
    recursive = true
): Promise<string[]> {
    const foundFiles: string[] = [];

    async function searchInDirectory(dir: string, prefix = ""): Promise<void> {
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });

            for (const entry of entries) {
                const relativePath = path.join(prefix, entry.name);
                const fullPath = path.join(dir, entry.name);

                if (entry.isFile() && pattern.test(entry.name)) {
                    foundFiles.push(relativePath);
                } else if (entry.isDirectory() && recursive) {
                    // node_modules や .git は除外
                    if (
                        entry.name !== "node_modules" &&
                        entry.name !== ".git"
                    ) {
                        await searchInDirectory(fullPath, relativePath);
                    }
                }
            }
        } catch {
            // アクセスできないディレクトリはスキップ
        }
    }

    await searchInDirectory(projectPath);
    return foundFiles.sort();
}

/**
 * プロジェクトの基本情報を取得
 */
export async function getProjectInfo(projectPath: string): Promise<{
    name?: string;
    type: string;
    hasTypeScript: boolean;
    isMonorepo: boolean;
    size: {
        totalSize: number;
        fileCount: number;
        directoryCount: number;
    };
    gitInitialized: boolean;
}> {
    const size = await calculateProjectSize(projectPath);
    const hasTypeScript = await hasTypeScriptConfig(projectPath);
    const isMonorepo = await isMonorepoProject(projectPath);
    const gitInitialized = await isGitInitialized(projectPath);

    let projectType = "unknown";
    let projectName: string | undefined;

    try {
        const packageJson = await readPackageJson(projectPath);
        projectName = packageJson.name;

        if (await isNextJsProject(projectPath)) {
            projectType = "nextjs";
        } else if (await isExpoProject(projectPath)) {
            projectType = "expo";
        } else if (await isTauriProject(projectPath)) {
            projectType = "tauri";
        }
    } catch {
        // package.json が読めない場合
    }

    return {
        name: projectName,
        type: projectType,
        hasTypeScript,
        isMonorepo,
        size,
        gitInitialized,
    };
}

// EOF
