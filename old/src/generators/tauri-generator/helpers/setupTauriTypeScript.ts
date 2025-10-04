import path from 'node:path';
import fs from 'fs-extra';

import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * Tauri用TypeScript設定ファイルを設定する
 * @param config プロジェクト設定
 */
export async function setupTauriTypeScript(config: ProjectConfig) {
    const tsConfig = {
        compilerOptions: {
            target: 'ES2020',
            useDefineForClassFields: true,
            lib: ['ES2020', 'DOM', 'DOM.Iterable'],
            module: 'ESNext',
            skipLibCheck: true,
            moduleResolution: 'bundler',
            allowImportingTsExtensions: true,
            resolveJsonModule: true,
            isolatedModules: true,
            noEmit: true,
            jsx: 'react-jsx',
            strict: true,
            noUnusedLocals: true,
            noUnusedParameters: true,
            noFallthroughCasesInSwitch: true,
            paths: {
                '@/*': ['./src/*'],
            },
        },
        include: ['src/**/*.ts', 'src/**/*.tsx'],
        references: [{ path: './tsconfig.node.json' }],
    };

    await fs.writeJSON(path.join(config.projectPath, 'tsconfig.json'), tsConfig, {
        spaces: 2,
    });

    // Node.js用TypeScript設定
    const nodeConfig = {
        compilerOptions: {
            composite: true,
            skipLibCheck: true,
            module: 'ESNext',
            moduleResolution: 'bundler',
            allowSyntheticDefaultImports: true,
            strict: true,
            noEmit: true,
        },
        include: ['vite.config.ts'],
    };

    await fs.writeJSON(path.join(config.projectPath, 'tsconfig.node.json'), nodeConfig, {
        spaces: 2,
    });
}
