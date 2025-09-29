/**
 * クラウドリソースのプロビジョニングエラーを表すカスタムエラークラス
 * インフラやクラウドサービスの作成・設定で発生するエラーを扱います
 */
export class ProvisioningError extends Error {
    /**
     * ProvisioningErrorインスタンスを作成します
     * @param message エラーメッセージ
     * @param cause エラーの原因（オプション）
     */
    constructor(
        message: string,
        readonly cause?: unknown
    ) {
        super(message);
        this.name = 'ProvisioningError';
    }
}
