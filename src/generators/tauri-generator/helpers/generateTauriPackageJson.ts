import path from 'node:path';
import fs from 'fs-extra';

import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * Tauri用のpackage.jsonファイルを生成する（フロントエンド依存関係とスクリプトを含む）
 * @param config プロジェクト設定
 */
export async function generateTauriPackageJson(config: ProjectConfig) {
    const packageJson = {
        name: config.projectName,
        private: true,
        version: '0.0.0',
        type: 'module',
        scripts: {
            dev: 'tauri dev',
            build: 'tauri build',
            preview: 'vite preview',
            tauri: 'tauri',
            'build:web': 'vite build',
            'dev:web': 'vite',
            'check:rust': 'cd src-tauri && cargo check',
            'build:rust': 'cd src-tauri && cargo build',
        },
        dependencies: {
            '@tauri-apps/api': '^2.1.1',
            '@tauri-apps/plugin-shell': '^2.0.0',
            react: '^18.3.1',
            'react-dom': '^18.3.1',
        },
        devDependencies: {
            '@tauri-apps/cli': '^2.1.0',
            '@vitejs/plugin-react': '^4.3.4',
            typescript: '^5.7.2',
            vite: '^6.0.5',
            '@types/react': '^18.3.17',
            '@types/react-dom': '^18.3.5',
        },
    };

    await fs.writeJSON(path.join(config.projectPath, 'package.json'), packageJson, {
        spaces: 2,
    });
}
