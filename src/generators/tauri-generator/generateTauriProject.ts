import fs from 'fs-extra';

import type { ProjectConfig } from '../../commands/create/types.js';
import { createTauriAppStructure } from './helpers/createTauriAppStructure.js';
import { generateTauriPackageJson } from './helpers/generateTauriPackageJson.js';
import { setupTauriTypeScript } from './helpers/setupTauriTypeScript.js';
import { setupTauriConfig } from './helpers/setupTauriConfig.js';
import { setupRustBackend } from './helpers/setupRustBackend.js';
import { setupVite } from './helpers/setupVite.js';
import { createWebFrontend } from './helpers/createWebFrontend.js';
import { createTauriGitignore } from './helpers/createTauriGitignore.js';

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
}
