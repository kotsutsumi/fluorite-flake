import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../src/commands/create/types.js';
import { createProject } from '../../src/commands/create/index.js';
import { createTempDir } from './temp-dir.js';

/**
 * Generate a project using the create command directly
 * This is useful for testing the actual project generation logic
 */
export async function generateProject(
    config: Partial<ProjectConfig>
): Promise<{ projectPath: string; config: ProjectConfig }> {
    // Create a temporary directory for the project
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

    // Set test environment
    const originalEnv = { ...process.env };
    process.env.FLUORITE_TEST_MODE = 'true';
    process.env.FLUORITE_CLOUD_MODE = 'mock';
    process.env.FLUORITE_AUTO_PROVISION = 'false';

    try {
        await createProject(fullConfig);
        return { projectPath, config: fullConfig };
    } finally {
        // Restore original environment
        Object.assign(process.env, originalEnv);
    }
}

/**
 * Generate multiple projects with different configurations
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
 * Verify that a generated project has expected files and structure
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
 * Verify package.json dependencies
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
 * Verify environment files for Next.js projects
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
 * Test project configuration presets
 */
export const TEST_CONFIGS = {
    // Minimal configurations
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

    // With database configurations
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

    // With storage configurations
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

    // Full-featured configurations
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
