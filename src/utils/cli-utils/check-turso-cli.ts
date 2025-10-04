import type { CliAvailabilityCheck } from './cli-availability-check.js';

/**
 * Turso CLIの可用性をチェックします
 * 注意: 現在はプレースホルダー実装です
 * @returns CLI可用性チェック結果
 */
export async function checkTursoCli(): Promise<CliAvailabilityCheck> {
    return { available: false, fallbackMessage: 'CLIアダプターは無効です' };
}
