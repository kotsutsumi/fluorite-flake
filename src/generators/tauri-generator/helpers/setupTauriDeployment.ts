import path from 'node:path';
import fs from 'fs-extra';

import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * GitHub Actions のワークフローとリリース用スクリプトを作成し、
 * Tauri プロジェクトのデプロイ体験を整える。
 */
export async function setupTauriDeployment(config: ProjectConfig) {
    const workflowDir = path.join(config.projectPath, '.github', 'workflows');
    await fs.ensureDir(workflowDir);

    const workflowLines = [
        '# Tauri アプリをタグ作成時にビルド・リリースするワークフロー',
        'name: Tauri Release',
        '',
        'on:',
        '  push:',
        '    tags:',
        "      - 'v*.*.*'",
        '  workflow_dispatch:',
        '',
        'jobs:',
        '  build:',
        '    runs-on: ${{ matrix.os }}',
        '    strategy:',
        '      matrix:',
        '        os: [macos-latest, ubuntu-latest, windows-latest]',
        '    steps:',
        ...createWorkflowSteps(config),
    ];

    const workflowContent = workflowLines.join('\n');
    await fs.writeFile(path.join(workflowDir, 'release.yml'), workflowContent);

    const scriptsDir = path.join(config.projectPath, 'scripts');
    await fs.ensureDir(scriptsDir);

    const releaseScript = `#!/bin/bash
set -euo pipefail

# Tauri のリリースビルドをまとめて実行する補助スクリプト
PACKAGE_MANAGER="${config.packageManager}"

echo "🚀 Installing dependencies with ${config.packageManager}..."

case "$PACKAGE_MANAGER" in
  pnpm)
    pnpm install --frozen-lockfile || pnpm install
    pnpm tauri build
    ;;
  npm)
    npm install
    npm run tauri -- build
    ;;
  yarn)
    yarn install --immutable || yarn install
    yarn tauri build
    ;;
  bun)
    bun install
    bun run tauri build
    ;;
  *)
    echo "⚠️ Unsupported package manager: $PACKAGE_MANAGER. Falling back to pnpm."
    pnpm install
    pnpm tauri build
    ;;
esac
`;

    const releaseScriptPath = path.join(scriptsDir, 'build-release.sh');
    await fs.writeFile(releaseScriptPath, releaseScript, { mode: 0o755 });
    await fs.chmod(releaseScriptPath, 0o755);
}

/**
 * GitHub Actions の steps セクションを構築し、配列として返す。
 */
function createWorkflowSteps(config: ProjectConfig): string[] {
    return [
        '      - uses: actions/checkout@v4',
        '      - uses: actions/setup-node@v4',
        '        with:',
        "          node-version: '20'",
        ...createPackageManagerSetupLines(config.packageManager),
        '      - name: Install dependencies',
        `        run: ${resolveInstallCommand(config.packageManager)}`,
        '      - name: Build release artifacts',
        `        run: ${resolveBuildCommand(config.packageManager)}`,
        '      - name: Publish release via Tauri Action',
        '        uses: tauri-apps/tauri-action@v0',
        '        with:',
        '          tagName: ${{ github.ref_name }}',
        '          releaseName: Release ${{ github.ref_name }}',
        "          releaseBody: 'See the attached assets for download instructions.'",
        '          releaseDraft: false',
        '          prerelease: false',
    ];
}

/**
 * パッケージマネージャーに応じたインストールコマンドを返す。
 */
function resolveInstallCommand(packageManager: ProjectConfig['packageManager']): string {
    switch (packageManager) {
        case 'npm':
            return 'npm ci || npm install';
        case 'yarn':
            return 'yarn install --immutable || yarn install';
        case 'bun':
            return 'bun install';
        default:
            return 'pnpm install --frozen-lockfile || pnpm install';
    }
}

/**
 * パッケージマネージャーに応じたビルドコマンドを返す。
 */
function resolveBuildCommand(packageManager: ProjectConfig['packageManager']): string {
    switch (packageManager) {
        case 'npm':
            return 'npm run tauri -- build';
        case 'yarn':
            return 'yarn tauri build';
        case 'bun':
            return 'bun run tauri build';
        default:
            return 'pnpm tauri build';
    }
}

/**
 * パッケージマネージャーごとのセットアップ step (pnpm / bun) を返す。
 */
function createPackageManagerSetupLines(packageManager: ProjectConfig['packageManager']): string[] {
    switch (packageManager) {
        case 'pnpm':
            return ['      - uses: pnpm/action-setup@v4', '        with:', '          version: 9'];
        case 'bun':
            return ['      - uses: oven-sh/setup-bun@v1'];
        default:
            return [];
    }
}
