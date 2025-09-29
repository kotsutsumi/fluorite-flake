/**
 * CLI可用性チェックとフォールバック機能を提供するユーティリティ
 *
 * この ファイルは後方互換性のために保持されています。
 * 新しい実装は ./cli-utils/ ディレクトリに分割されています。
 */

// 型定義とすべての関数を再エクスポート
export type { CliAvailabilityCheck } from './cli-utils/index.js';
export {
    checkVercelCli,
    checkTursoCli,
    checkSupabaseCli,
    checkAwsCli,
    checkWranglerCli,
    checkGitHubCli,
    executeWithFallback,
} from './cli-utils/index.js';
