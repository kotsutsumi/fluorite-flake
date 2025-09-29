/**
 * CLI可用性チェックとフォールバック機能を提供するユーティリティ
 *
 * 注意: コンパイルエラーによりCLIアダプターは一時的に無効化されています
 * TODO: CLIアダプターの修正後に再有効化する
 */

/*
 * CLIアダプターにコンパイルエラーがある間、このファイル全体がコメントアウトされています。
 * CLIアダプターが修正された際のインフラストラクチャは準備済みです。
 */

// 型定義をエクスポート
export type { CliAvailabilityCheck } from './cli-availability-check.js';

// CLI チェック関数をエクスポート
export { checkVercelCli } from './check-vercel-cli.js';
export { checkTursoCli } from './check-turso-cli.js';
export { checkSupabaseCli } from './check-supabase-cli.js';
export { checkAwsCli } from './check-aws-cli.js';
export { checkWranglerCli } from './check-wrangler-cli.js';
export { checkGitHubCli } from './check-github-cli.js';

// ユーティリティ関数をエクスポート
export { executeWithFallback } from './execute-with-fallback.js';
