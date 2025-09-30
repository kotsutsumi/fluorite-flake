import path from 'node:path';
import fs from 'fs-extra';

import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * 指定したパッケージマネージャーごとのスクリプト実行コマンドを返すヘルパー。
 * Yarn は `yarn <script>`、Bun は `bun run <script>` のように呼び出し方が異なるため、
 * ここで統一的に扱う。
 */
function resolveScriptCommand(
    packageManager: ProjectConfig['packageManager'],
    script: string
): string {
    if (packageManager === 'yarn') {
        return `yarn ${script}`;
    }

    if (packageManager === 'bun') {
        return `bun run ${script}`;
    }

    return `${packageManager} run ${script}`;
}

/**
 * Tauri設定ファイル（tauri.conf.json）を作成する
 * @param config プロジェクト設定
 */
export async function setupTauriConfig(config: ProjectConfig) {
    // Tauriのビルドフックで利用するパッケージマネージャー依存コマンドを事前に算出する
    const beforeDevCommand = resolveScriptCommand(config.packageManager, 'dev:web');
    const beforeBuildCommand = resolveScriptCommand(config.packageManager, 'build:web');
    const tauriConfig = {
        productName: config.projectName,
        version: '0.0.0',
        identifier: `com.${config.projectName.toLowerCase()}.app`,
        build: {
            beforeDevCommand: beforeDevCommand,
            beforeBuildCommand: beforeBuildCommand,
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
