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

/**
 * CLI可用性チェックの結果を表すインターフェース
 */
export interface CliAvailabilityCheck {
    /** CLIが利用可能かどうか */
    available: boolean;
    /** CLIのバージョン情報（利用可能な場合） */
    version?: string;
    /** CLIアダプターオブジェクト（利用可能な場合） */
    adapter?: unknown;
    /** 利用不可の場合のフォールバックメッセージ */
    fallbackMessage?: string;
}

/**
 * Vercel CLIの可用性をチェックします
 * 注意: 現在はプレースホルダー実装です
 * @returns CLI可用性チェック結果
 */
export async function checkVercelCli(): Promise<CliAvailabilityCheck> {
    return { available: false, fallbackMessage: 'CLIアダプターは無効です' };
}

/**
 * Turso CLIの可用性をチェックします
 * 注意: 現在はプレースホルダー実装です
 * @returns CLI可用性チェック結果
 */
export async function checkTursoCli(): Promise<CliAvailabilityCheck> {
    return { available: false, fallbackMessage: 'CLIアダプターは無効です' };
}

/**
 * Supabase CLIの可用性をチェックします
 * 注意: 現在はプレースホルダー実装です
 * @returns CLI可用性チェック結果
 */
export async function checkSupabaseCli(): Promise<CliAvailabilityCheck> {
    return { available: false, fallbackMessage: 'CLIアダプターは無効です' };
}

/**
 * AWS CLIの可用性をチェックします
 * 注意: 現在はプレースホルダー実装です
 * @returns CLI可用性チェック結果
 */
export async function checkAwsCli(): Promise<CliAvailabilityCheck> {
    return { available: false, fallbackMessage: 'CLIアダプターは無効です' };
}

/**
 * Wrangler CLIの可用性をチェックします
 * 注意: 現在はプレースホルダー実装です
 * @returns CLI可用性チェック結果
 */
export async function checkWranglerCli(): Promise<CliAvailabilityCheck> {
    return { available: false, fallbackMessage: 'CLIアダプターは無効です' };
}

/**
 * GitHub CLIの可用性をチェックします
 * 注意: 現在はプレースホルダー実装です
 * @returns CLI可用性チェック結果
 */
export async function checkGitHubCli(): Promise<CliAvailabilityCheck> {
    return { available: false, fallbackMessage: 'CLIアダプターは無効です' };
}

/**
 * CLIが利用可能な場合はアダプター操作を実行し、不可能な場合はフォールバック操作を実行します
 * 注意: 現在はフォールバック操作のみを実行する実装です
 * @param _cliCheck CLI可用性をチェックする関数（現在未使用）
 * @param _adapterOperation アダプターを使用した操作関数（現在未使用）
 * @param fallbackOperation フォールバック操作関数
 * @returns 操作結果
 */
export async function executeWithFallback<T>(
    _cliCheck: () => Promise<CliAvailabilityCheck>,
    _adapterOperation: (adapter: unknown) => Promise<T>,
    fallbackOperation: () => Promise<T>
): Promise<T> {
    return await fallbackOperation();
}
