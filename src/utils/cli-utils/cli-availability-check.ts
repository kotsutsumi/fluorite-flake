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
