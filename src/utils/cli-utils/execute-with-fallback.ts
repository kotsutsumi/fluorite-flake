import type { CliAvailabilityCheck } from './cli-availability-check.js';

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
