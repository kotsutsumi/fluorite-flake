import path from 'node:path';
import fs from 'fs-extra';

import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * Tauri設定ファイル（tauri.conf.json）を作成する
 * @param config プロジェクト設定
 */
export async function setupTauriConfig(config: ProjectConfig) {
    const tauriConfig = {
        productName: config.projectName,
        version: '0.0.0',
        identifier: `com.${config.projectName.toLowerCase()}.app`,
        build: {
            beforeDevCommand: 'npm run dev:web',
            beforeBuildCommand: 'npm run build:web',
            devUrl: 'http://localhost:1420',
            frontendDist: '../dist',
        },
        bundle: {
            active: true,
            targets: 'all',
            category: 'DeveloperTool',
            copyright: '',
            deb: {
                depends: [],
            },
            externalBin: [],
            icon: [
                'icons/32x32.png',
                'icons/128x128.png',
                'icons/128x128@2x.png',
                'icons/icon.icns',
                'icons/icon.ico',
            ],
            resources: [],
            shortDescription: '',
            longDescription: '',
        },
        security: {
            csp: null,
        },
        app: {
            windows: [
                {
                    fullscreen: false,
                    resizable: true,
                    title: config.projectName,
                    width: 800,
                    height: 600,
                    minWidth: 400,
                    minHeight: 300,
                },
            ],
            security: {
                csp: null,
            },
        },
        plugins: {},
    };

    await fs.writeJSON(path.join(config.projectPath, 'src-tauri/tauri.conf.json'), tauriConfig, {
        spaces: 2,
    });
}
