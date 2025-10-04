import fs from 'fs-extra';

import type { ProjectConfig } from '../../commands/create/types.js';
import { createPackageManagerArtifacts } from './helpers/createPackageManagerArtifacts.js';
import { createTauriAppStructure } from './helpers/createTauriAppStructure.js';
import { createTauriGitignore } from './helpers/createTauriGitignore.js';
import { createWebFrontend } from './helpers/createWebFrontend.js';
import { generateTauriPackageJson } from './helpers/generateTauriPackageJson.js';
import { setupRustBackend } from './helpers/setupRustBackend.js';
import { setupTauriConfig } from './helpers/setupTauriConfig.js';
import { setupTauriDeployment } from './helpers/setupTauriDeployment.js';
import { setupTauriTypeScript } from './helpers/setupTauriTypeScript.js';
import { setupVite } from './helpers/setupVite.js';

/**
 * Tauriプロジェクトを生成するメイン関数
 * RustバックエンドとReactフロントエンドを組み合わせたデスクトップアプリを作成
 * @param config プロジェクト設定
 */
export async function generateTauriProject(config: ProjectConfig) {
    // プロジェクトディレクトリの作成
    await fs.ensureDir(config.projectPath);

    // Tauriアプリ構造の作成
    await createTauriAppStructure(config);

    // Tauri用package.jsonのセットアップ
    await generateTauriPackageJson(config);

    // TypeScript設定
    await setupTauriTypeScript(config);

    // Tauri設定
    await setupTauriConfig(config);

    // Rustバックエンドのセットアップ
    await setupRustBackend(config);

    // Vite設定
    await setupVite(config);

    // 初期Webフロントエンドの作成
    await createWebFrontend(config);

    // .gitignoreのセットアップ
    await createTauriGitignore(config);

    // テストモードで欠落しがちなロックファイルなどを補完する
    await createPackageManagerArtifacts(config);

    if (config.deployment) {
        // GitHub Actions とリリーススクリプトを用意して配布フローを整える
        await setupTauriDeployment(config);
    }
}
