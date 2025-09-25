/**
 * Shared utilities for project structure creation and management
 */

import path from 'node:path';
import fs from 'fs-extra';

/**
 * Create multiple directories in a project
 */
export async function createDirectoryStructure(
    basePath: string,
    directories: string[]
): Promise<void> {
    await Promise.all(directories.map((dir) => fs.ensureDir(path.join(basePath, dir))));
}

/**
 * Common directory structures for different frameworks
 */
export const DIRECTORY_STRUCTURES = {
    nextjs: [
        'src/app',
        'src/lib',
        'src/components',
        'src/components/ui',
        'src/utils',
        'public',
        'scripts',
    ],
    expo: ['app', 'components', 'constants', 'hooks', 'assets/images', 'assets/fonts'],
    tauri: [
        'src/components',
        'src/styles',
        'src/utils',
        'public',
        'src-tauri/src',
        'src-tauri/icons',
    ],
    flutter: [
        'lib',
        'lib/screens',
        'lib/widgets',
        'lib/models',
        'lib/services',
        'lib/utils',
        'test',
        'assets/images',
        'assets/fonts',
        'android',
        'ios',
        'web',
        'linux',
        'macos',
        'windows',
    ],
} as const;

/**
 * Create standard directory structure for a framework
 */
export async function createFrameworkDirectories(
    projectPath: string,
    framework: keyof typeof DIRECTORY_STRUCTURES
): Promise<void> {
    const directories = DIRECTORY_STRUCTURES[framework];
    await createDirectoryStructure(projectPath, [...directories]);
}

/**
 * Check if directory exists and is not empty
 */
export async function isDirectoryEmpty(dirPath: string): Promise<boolean> {
    try {
        const files = await fs.readdir(dirPath);
        return files.length === 0;
    } catch {
        // Directory doesn't exist, consider it empty
        return true;
    }
}

/**
 * Safely remove directory if it exists
 */
export async function removeDirectoryIfExists(dirPath: string): Promise<void> {
    try {
        await fs.remove(dirPath);
    } catch {
        // Ignore errors if directory doesn't exist
    }
}

/**
 * Copy template files recursively
 */
export async function copyTemplateFiles(
    sourcePath: string,
    targetPath: string,
    options?: {
        overwrite?: boolean;
        filter?: (src: string, dest: string) => boolean;
    }
): Promise<void> {
    await fs.copy(sourcePath, targetPath, {
        overwrite: options?.overwrite ?? false,
        filter: options?.filter,
    });
}

/**
 * Create a file with parent directories
 */
export async function writeFileWithDirs(filePath: string, content: string): Promise<void> {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content);
}

/**
 * Get relative path from project root
 */
export function getProjectRelativePath(projectPath: string, filePath: string): string {
    return path.relative(projectPath, filePath);
}

/**
 * Normalize project name for different contexts
 */
export function normalizeProjectName(
    name: string,
    context: 'package' | 'directory' | 'class' = 'package'
): string {
    switch (context) {
        case 'package':
            return name
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, '-')
                .replace(/^-+|-+$/g, '');
        case 'directory':
            return name
                .toLowerCase()
                .replace(/[^a-z0-9_-]/g, '_')
                .replace(/^_+|_+$/g, '');
        case 'class':
            return name.replace(/[^a-zA-Z0-9]/g, '').replace(/^[^a-zA-Z]/, 'A');
        default:
            return name;
    }
}
