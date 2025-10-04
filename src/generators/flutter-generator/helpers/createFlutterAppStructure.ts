/**
 * Flutterアプリケーションの基本ディレクトリ構造を作成するヘルパー関数
 * Flutter標準のプロジェクト構造に沿って必要なディレクトリを作成する
 */

import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * Flutterアプリケーションの基本ディレクトリ構造を作成する
 * @param config プロジェクト設定
 */
export async function createFlutterAppStructure(config: ProjectConfig) {
    // 作成するディレクトリリスト（Flutter標準構造）
    const dirs = [
        'lib', // Dartメインソースコード
        'lib/screens', // 画面ウィジェット
        'lib/widgets', // 再利用可能なウィジェット
        'lib/models', // データモデル
        'lib/services', // ビジネスロジックサービス
        'lib/utils', // ユーティリティ関数
        'lib/constants', // 定数定義
        'test', // テストファイル
        'assets', // アセットファイル
        'assets/images', // 画像アセット
        'assets/fonts', // フォントアセット
        'android', // Androidプラットフォーム設定
        `android/app/src/main/kotlin/com/example/${config.projectName.toLowerCase()}`, // Androidアプリパッケージ
        'ios', // iOSプラットフォーム設定
        'ios/Runner', // iOSアプリターゲット
        'web', // Webプラットフォーム設定
        'linux', // Linuxデスクトップ設定
        'macos', // macOSデスクトップ設定
        'windows', // Windowsデスクトップ設定
    ];

    // 各ディレクトリを作成
    for (const dir of dirs) {
        await fs.ensureDir(path.join(config.projectPath, dir));
    }
}
