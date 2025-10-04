/**
 * テスト全体のグローバルセットアップ。環境変数をテストモードへ切り替え、
 * 実行終了時にはテンポラリディレクトリを掃除するテアダウン関数を提供する。
 */
import { cleanupAllTempDirs } from './temp-dir.js';

/**
 * Vitest の `globalSetup` などから呼び出すエントリーポイント。
 * 環境変数を統一し、副作用を避けるための情報をログ出力する。
 */
export async function setup() {
    // テスト向けの環境変数を設定する
    process.env.FLUORITE_TEST_MODE = 'true';
    process.env.FLUORITE_CLOUD_MODE = 'mock';
    process.env.FLUORITE_AUTO_PROVISION = 'false';
    process.env.NODE_ENV = 'test';

    // ローカル実行時のみ簡易ログを表示し、本番環境への誤適用を防ぐ
    if (!process.env.CI && !process.env.VITEST) {
        console.log('🧪 Running tests in local environment');
    }

    return async () => {
        // テスト完了後に一時ディレクトリをまとめて削除する
        await cleanupAllTempDirs();
        console.log('✅ Test cleanup completed');
    };
}
