/**
 * TypeScript設定ファイル（tsconfig.json）とNext.js型定義を設定するヘルパー関数
 * Next.js用に最適化されたTypeScript設定を生成する
 */

import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * TypeScript設定ファイル（tsconfig.json）とNext.js型定義を設定する
 * @param config プロジェクト設定
 */
export async function setupTypeScript(config: ProjectConfig): Promise<void> {
    const tsConfig = {
        compilerOptions: {
            lib: ['dom', 'dom.iterable', 'esnext'],
            allowJs: true,
            skipLibCheck: true,
            strict: true,
            noEmit: true,
            esModuleInterop: true,
            module: 'esnext',
            moduleResolution: 'bundler',
            resolveJsonModule: true,
            isolatedModules: true,
            jsx: 'preserve',
            incremental: true,
            plugins: [
                {
                    name: 'next',
                },
            ],
            paths: {
                '@/*': ['./src/*'],
            },
        },
        include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
        exclude: ['node_modules'],
    };

    await fs.writeJSON(path.join(config.projectPath, 'tsconfig.json'), tsConfig, {
        spaces: 2,
    });

    // Next.js環境型定義ファイルの作成
    const nextEnvContent = `/// <reference types="next" />
/// <reference types="next/image-types/global" />

// 注意: このファイルは編集しないでください
// 詳細は https://nextjs.org/docs/app/building-your-application/configuring/typescript を参照してください。
`;

    await fs.writeFile(path.join(config.projectPath, 'next-env.d.ts'), nextEnvContent);
}
