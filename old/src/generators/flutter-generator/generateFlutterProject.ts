/**
 * Flutterプロジェクトを生成するメイン関数
 * クロスプラットフォームモバイルアプリケーションの基本構造、設定、テストセットアップを統合的に行う
 */

import fs from 'fs-extra';
import type { ProjectConfig } from '../../commands/create/types.js';
import {
    createFlutterApp,
    createFlutterAppStructure,
    createFlutterGitignore,
    createFlutterReadme,
    generatePubspecYaml,
    setupAnalysisOptions,
    setupPatrolTesting,
} from './helpers/index.js';

/**
 * Flutterプロジェクトを生成するメイン関数
 * クロスプラットフォームモバイルアプリケーションの基本構造、設定、テストセットアップを行う
 * @param config プロジェクト設定
 */
export async function generateFlutterProject(config: ProjectConfig) {
    // プロジェクトディレクトリの作成
    await fs.ensureDir(config.projectPath);

    // Flutterアプリ構造の作成
    await createFlutterAppStructure(config);

    // pubspec.yamlのセットアップ
    await generatePubspecYaml(config);

    // コード解析オプションのセットアップ
    await setupAnalysisOptions(config);

    // メインFlutterアプリファイルの作成
    await createFlutterApp(config);

    // .gitignoreのセットアップ
    await createFlutterGitignore(config);

    // 手順書付きREADMEの作成
    await createFlutterReadme(config);

    // Patrol E2Eテストのセットアップ
    await setupPatrolTesting(config);
}
