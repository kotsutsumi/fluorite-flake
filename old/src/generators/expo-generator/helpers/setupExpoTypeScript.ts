import path from 'node:path';
import fs from 'fs-extra';

import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * Expo用TypeScript設定ファイル（tsconfig.json）を設定する
 * strict モードを有効にし、パスエイリアスを設定してExpo環境に最適化したTypeScript設定を構築
 * @param config プロジェクト設定
 */
export async function setupExpoTypeScript(config: ProjectConfig) {
    const tsConfig = {
        extends: 'expo/tsconfig.base',
        compilerOptions: {
            strict: true,
            paths: {
                '@/*': ['./'],
            },
        },
        include: ['**/*.ts', '**/*.tsx', '.expo/types/**/*.ts', 'expo-env.d.ts'],
        exclude: ['node_modules'],
    };

    await fs.writeJSON(path.join(config.projectPath, 'tsconfig.json'), tsConfig, {
        spaces: 2,
    });

    // Expo環境型定義ファイルの作成
    const expoEnvContent = `/// <reference types="expo/types" />
`;

    await fs.writeFile(path.join(config.projectPath, 'expo-env.d.ts'), expoEnvContent);
}
