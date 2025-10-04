import fs from 'fs-extra';

import type { ProjectConfig } from '../../commands/create/types.js';
import { createExpoAppStructure } from './helpers/createExpoAppStructure.js';
import { createExpoGitignore } from './helpers/createExpoGitignore.js';
import { createInitialExpoApp } from './helpers/createInitialExpoApp.js';
import { generateExpoPackageJson } from './helpers/generateExpoPackageJson.js';
import { setupBabel } from './helpers/setupBabel.js';
import { setupExpoAuth } from './helpers/setupExpoAuth.js';
import { setupExpoConfig } from './helpers/setupExpoConfig.js';
import { setupExpoTypeScript } from './helpers/setupExpoTypeScript.js';
import { setupMaestroTesting } from './helpers/setupMaestroTesting.js';
import { setupMetro } from './helpers/setupMetro.js';

/**
 * Expoプロジェクトを生成するメイン関数
 * React Native アプリケーションの基本構造、設定、テストセットアップを行う
 * @param config プロジェクト設定
 */
export async function generateExpoProject(config: ProjectConfig) {
    // プロジェクトディレクトリの作成
    await fs.ensureDir(config.projectPath);

    // Expoアプリ構造の作成
    await createExpoAppStructure(config);

    // Expo用package.jsonのセットアップ
    await generateExpoPackageJson(config);

    // TypeScript設定
    await setupExpoTypeScript(config);

    // Expo設定ファイルの作成
    await setupExpoConfig(config);

    // Metroバンドラーの設定
    await setupMetro(config);

    // Babel設定
    await setupBabel(config);

    // 初期アプリ構造の作成
    await createInitialExpoApp(config);

    // .gitignoreファイルのセットアップ
    await createExpoGitignore(config);

    // Maestro E2Eテストのセットアップ
    await setupMaestroTesting(config);

    if (config.auth) {
        await setupExpoAuth(config);
    }
}
