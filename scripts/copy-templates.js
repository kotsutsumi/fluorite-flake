#!/usr/bin/env node

/**
 * テンプレートファイル複製スクリプト
 *
 * このスクリプトは、プロジェクト生成時に使用するテンプレートファイルを
 * src/templates ディレクトリから dist/templates ディレクトリにコピーします。
 *
 * 主な機能：
 * - ビルド済みファイルが実行時にテンプレートファイルにアクセスできるよう準備
 * - フレームワーク別のテンプレートディレクトリを完全に複製
 * - .template ファイルや隠しファイルも含めて全てのファイルを保持
 *
 * 実行タイミング：
 * - TypeScript コンパイル後のビルドプロセスで実行
 * - パッケージング前にテンプレート資材を配置
 *
 * @author fluorite-flake
 * @since v1.0.0
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs-extra';

// ES Modules環境でのファイルパス情報を取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// プロジェクトルートディレクトリの基準パス
const rootDir = path.resolve(__dirname, '..');
// コピー元：ソースコード内のテンプレートディレクトリ
const srcTemplates = path.join(rootDir, 'src', 'templates');
// コピー先：ビルド成果物内のテンプレートディレクトリ
const distTemplates = path.join(rootDir, 'dist', 'templates');

/**
 * テンプレートファイルコピー処理
 *
 * src/templates ディレクトリ内の全てのテンプレートファイルを
 * dist/templates ディレクトリに複製します。
 *
 * 処理詳細：
 * 1. コピー先ディレクトリの作成
 * 2. テンプレートディレクトリの一覧取得
 * 3. 各ディレクトリの完全複製（再帰的コピー）
 * 4. ファイル権限やメタデータの保持
 *
 * @returns {Promise<void>} 複製処理の完了を示すPromise
 * @throws {Error} ファイルシステムエラーまたは権限エラー時
 */
async function copyTemplates() {
    try {
        console.log('Copying template files...');

        // dist/templates ディレクトリが存在することを保証
        // 存在しない場合は自動的に作成（親ディレクトリも含む）
        await fs.ensureDir(distTemplates);

        // テンプレートディレクトリ内の全エントリを取得
        // フレームワーク別ディレクトリ（nextjs, expo, tauri, flutter等）を想定
        const templateDirs = await fs.readdir(srcTemplates);

        // 各テンプレートディレクトリを順次処理
        for (const dir of templateDirs) {
            const srcPath = path.join(srcTemplates, dir);
            const distPath = path.join(distTemplates, dir);

            // ディレクトリ全体を再帰的に複製
            // 既存ファイルは上書き、ディレクトリ構造を完全に保持
            await fs.copy(srcPath, distPath, {
                overwrite: true, // 既存ファイルの上書きを許可
                filter: (_src) => {
                    // 全てのファイルを含める（.templateファイルや隠しファイルも対象）
                    // フィルタリングは行わず、完全な複製を実行
                    return true;
                },
            });
        }

        console.log('✅ Template files copied successfully');
    } catch (error) {
        // ファイルシステムエラー、権限エラー、ディスク容量不足等をキャッチ
        console.error('Error copying template files:', error);
        // ビルドプロセスを失敗させるため、非ゼロコードで終了
        process.exit(1);
    }
}

// スクリプト実行：テンプレートファイルの複製処理を開始
copyTemplates();
