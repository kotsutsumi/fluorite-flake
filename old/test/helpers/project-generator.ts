/**
 * プロジェクト生成テスト用ヘルパー群。`create` コマンドを直接呼び出して一時ディレクトリへ出力し、
 * 生成物の構成確認や依存関係検証を補助する。複数構成の生成・検証ユーティリティも併せて提供する。
 */
import path from 'node:path';
import fs from 'fs-extra';
import { createProject } from '../../src/commands/create/index.js';
import type { ProjectConfig } from '../../src/commands/create/types.js';
import { withProjectLock } from './project-lock.js';
import { createTempDir } from './temp-dir.js';

/**
 * `create` コマンドを使ってプロジェクトを生成し、設定と生成先パスを返す。
 * 実際のテンプレート展開を検証する際に利用する。
 */
export async function generateProject(
    config: Partial<ProjectConfig>
): Promise<{ projectPath: string; config: ProjectConfig }> {
    return await withProjectLock(async () => {
        // プロジェクト用の一時ディレクトリを作成する
        const tempDir = await createTempDir('ff-gen-');
        const projectName = config.projectName || 'test-project';
        const projectPath = path.join(tempDir, projectName);

        const fullConfig: ProjectConfig = {
            projectName,
            projectPath,
            framework: 'nextjs',
            database: 'none',
            deployment: false,
            storage: 'none',
            auth: false,
            packageManager: 'pnpm',
            mode: 'full',
            ...config,
        } as ProjectConfig;

        // テスト用の環境変数を差し替える
        const originalEnv = { ...process.env };
        process.env.FLUORITE_TEST_MODE = 'true';
        process.env.FLUORITE_CLOUD_MODE = 'mock';
        process.env.FLUORITE_AUTO_PROVISION = 'false';

        try {
            await createProject(fullConfig);
            return { projectPath, config: fullConfig };
        } finally {
            // 実行前の環境変数へ復元する
            Object.assign(process.env, originalEnv);
        }
    });
}

/**
 * 複数パターンの設定でプロジェクトを連続生成し、結果をまとめて返す。
 */
export async function generateProjects(
    configs: Array<Partial<ProjectConfig> & { name: string }>
): Promise<Array<{ name: string; projectPath: string; config: ProjectConfig }>> {
    const results = [];

    for (const configWithName of configs) {
        const { name, ...config } = configWithName;
        const { projectPath, config: fullConfig } = await generateProject({
            projectName: name,
            ...config,
        });

        results.push({ name, projectPath, config: fullConfig });
    }

    return results;
}

/**
 * 生成されたプロジェクトに想定ファイルが揃っているか検証する。
 */
export async function verifyProjectStructure(
    projectPath: string,
    expectedFiles: string[]
): Promise<{ valid: boolean; missingFiles: string[]; extraFiles?: string[] }> {
    const missingFiles: string[] = [];

    for (const file of expectedFiles) {
        const filePath = path.join(projectPath, file);
        if (!(await fs.pathExists(filePath))) {
            missingFiles.push(file);
        }
    }

    return {
        valid: missingFiles.length === 0,
        missingFiles,
    };
}

/**
 * package.json に必要な依存関係が記載されているかを検証する。
 */
export async function verifyDependencies(
    projectPath: string,
    expectedDeps: {
        dependencies?: string[];
        devDependencies?: string[];
    }
): Promise<{ valid: boolean; missing: string[]; packageJson: Record<string, unknown> }> {
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJson = await fs.readJSON(packageJsonPath);
    const missing: string[] = [];

    if (expectedDeps.dependencies) {
        for (const dep of expectedDeps.dependencies) {
            if (!packageJson.dependencies?.[dep]) {
                missing.push(`dependency: ${dep}`);
            }
        }
    }

    if (expectedDeps.devDependencies) {
        for (const dep of expectedDeps.devDependencies) {
            if (!packageJson.devDependencies?.[dep]) {
                missing.push(`devDependency: ${dep}`);
            }
        }
    }

    return {
        valid: missing.length === 0,
        missing,
        packageJson,
    };
}

/**
 * Next.js プロジェクト向けの環境変数ファイルが揃っているか確認する。
 */
export async function verifyEnvFiles(
    projectPath: string,
    framework: string
): Promise<{ valid: boolean; files: string[]; missing: string[] }> {
    const envFiles = ['.env', '.env.local'];

    if (framework === 'nextjs') {
        envFiles.push('.env.development', '.env.staging', '.env.production', '.env.prod');
    }

    const existing: string[] = [];
    const missing: string[] = [];

    for (const file of envFiles) {
        const filePath = path.join(projectPath, file);
        if (await fs.pathExists(filePath)) {
            existing.push(file);
        } else if (framework === 'nextjs') {
            missing.push(file);
        }
    }

    return {
        valid: framework === 'nextjs' ? missing.length === 0 : existing.length > 0,
        files: existing,
        missing,
    };
}

/**
 * テストで利用するプリセット設定群。
 */
export const TEST_CONFIGS = {
    // 最小構成パターン
    minimal: {
        nextjs: {
            framework: 'nextjs' as const,
            database: 'none' as const,
            storage: 'none' as const,
            deployment: false,
            auth: false,
        },
        expo: {
            framework: 'expo' as const,
            database: 'none' as const,
            storage: 'none' as const,
            deployment: false,
            auth: false,
        },
        tauri: {
            framework: 'tauri' as const,
            database: 'none' as const,
            storage: 'none' as const,
            deployment: false,
            auth: false,
        },
        flutter: {
            framework: 'flutter' as const,
            database: 'none' as const,
            storage: 'none' as const,
            deployment: false,
            auth: false,
        },
    },

    // データベースを含む構成
    withDatabase: {
        nextjsTurso: {
            framework: 'nextjs' as const,
            database: 'turso' as const,
            orm: 'prisma' as const,
            storage: 'none' as const,
            deployment: false,
            auth: false,
        },
        nextjsSupabase: {
            framework: 'nextjs' as const,
            database: 'supabase' as const,
            orm: 'drizzle' as const,
            storage: 'none' as const,
            deployment: false,
            auth: false,
        },
    },

    // ストレージを含む構成
    withStorage: {
        nextjsVercelBlob: {
            framework: 'nextjs' as const,
            database: 'none' as const,
            storage: 'vercel-blob' as const,
            deployment: false,
            auth: false,
        },
        nextjsS3: {
            framework: 'nextjs' as const,
            database: 'none' as const,
            storage: 'aws-s3' as const,
            deployment: false,
            auth: false,
        },
    },

    // フル機能構成
    fullFeatured: {
        nextjs: {
            framework: 'nextjs' as const,
            database: 'turso' as const,
            orm: 'prisma' as const,
            storage: 'vercel-blob' as const,
            deployment: true,
            auth: true,
        },
        expo: {
            framework: 'expo' as const,
            database: 'supabase' as const,
            orm: 'drizzle' as const,
            storage: 'supabase-storage' as const,
            deployment: false,
            auth: true,
        },
    },
};
