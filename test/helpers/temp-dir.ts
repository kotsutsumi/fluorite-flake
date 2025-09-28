import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';

/**
 * Track cleanup paths for automatic cleanup after tests
 */
const cleanupPaths = new Set<string>();

/**
 * Create a temporary directory for testing
 * Directory will be automatically cleaned up after tests
 */
export async function createTempDir(prefix = 'ff-test-'): Promise<string> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
    cleanupPaths.add(tempDir);
    return tempDir;
}

/**
 * Create a temporary project directory with basic package.json
 */
export async function createTempProject(
    projectName = 'test-project',
    options: {
        framework?: 'nextjs' | 'expo' | 'tauri' | 'flutter';
        packageManager?: 'npm' | 'pnpm' | 'yarn' | 'bun';
    } = {}
): Promise<string> {
    const projectPath = await createTempDir(`ff-${projectName}-`);

    // Create basic package.json
    const packageJson = {
        name: projectName,
        version: '0.0.0',
        private: true,
        scripts: {},
        ...(options.packageManager && {
            packageManager: options.packageManager === 'pnpm' ? 'pnpm@9.0.0' : undefined,
        }),
    };

    await fs.writeJSON(path.join(projectPath, 'package.json'), packageJson, { spaces: 2 });

    // Create framework-specific files if needed
    if (options.framework === 'nextjs') {
        // Create .env.local for Next.js projects
        await fs.writeFile(path.join(projectPath, '.env.local'), '');
        await fs.writeFile(path.join(projectPath, '.env'), '');
    }

    if (options.framework === 'flutter') {
        // Create pubspec.yaml for Flutter projects
        await fs.writeFile(
            path.join(projectPath, 'pubspec.yaml'),
            `name: ${projectName}
description: A test Flutter project
version: 0.0.0

environment:
  sdk: '>=3.0.0 <4.0.0'
`
        );
    }

    return projectPath;
}

/**
 * Clean up a specific temporary directory
 */
export async function cleanupTempDir(dirPath: string): Promise<void> {
    if (cleanupPaths.has(dirPath)) {
        try {
            await fs.remove(dirPath);
            cleanupPaths.delete(dirPath);
        } catch (error) {
            console.warn(`Failed to cleanup temp directory: ${dirPath}`, error);
        }
    }
}

/**
 * Clean up all temporary directories created during tests
 * Call this in afterAll or global teardown
 */
export async function cleanupAllTempDirs(): Promise<void> {
    const promises = Array.from(cleanupPaths).map((dirPath) =>
        fs.remove(dirPath).catch((err) => console.warn(`Failed to cleanup ${dirPath}:`, err))
    );
    await Promise.all(promises);
    cleanupPaths.clear();
}

/**
 * Read file content from a project
 */
export async function readProjectFile(projectPath: string, filePath: string): Promise<string> {
    return fs.readFile(path.join(projectPath, filePath), 'utf8');
}

/**
 * Read JSON file from a project
 */
export async function readProjectJson<T = Record<string, unknown>>(
    projectPath: string,
    filePath: string
): Promise<T> {
    return fs.readJSON(path.join(projectPath, filePath));
}

/**
 * Check if a file exists in the project
 */
export async function projectFileExists(projectPath: string, filePath: string): Promise<boolean> {
    return fs.pathExists(path.join(projectPath, filePath));
}

/**
 * List files in a project directory
 */
export async function listProjectFiles(projectPath: string, dirPath = '.'): Promise<string[]> {
    const fullPath = path.join(projectPath, dirPath);
    try {
        const files = await fs.readdir(fullPath);
        return files;
    } catch {
        return [];
    }
}

/**
 * Write a file to the project
 */
export async function writeProjectFile(
    projectPath: string,
    filePath: string,
    content: string
): Promise<void> {
    const fullPath = path.join(projectPath, filePath);
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, content);
}

/**
 * Copy test fixtures to a project
 */
export async function copyFixture(
    fixtureName: string,
    projectPath: string,
    targetPath = '.'
): Promise<void> {
    const fixturePath = path.join(__dirname, '../fixtures', fixtureName);
    const targetFullPath = path.join(projectPath, targetPath);

    if (await fs.pathExists(fixturePath)) {
        await fs.copy(fixturePath, targetFullPath);
    } else {
        throw new Error(`Fixture not found: ${fixtureName}`);
    }
}
