import chalk from 'chalk';
import ora, { type Ora } from 'ora';

/**
 * スピナーのライフサイクルを管理し、重複やプロンプトとの干渉を防ぎます
 */
export class SpinnerManager {
    /** シングルトンインスタンス */
    private static instance: SpinnerManager;
    /** 現在アクティブなスピナー */
    private activeSpinner?: Ora;
    /** スピナーが一時停止中かどうか */
    private suspended = false;

    /** プライベートコンストラクタ（シングルトン実装） */
    private constructor() {}

    /**
     * シングルトンインスタンスを取得します
     * @returns SpinnerManagerのインスタンス
     */
    static getInstance(): SpinnerManager {
        if (!SpinnerManager.instance) {
            SpinnerManager.instance = new SpinnerManager();
        }
        return SpinnerManager.instance;
    }

    /**
     * 指定されたメッセージでスピナーを開始します
     * 既にアクティブなスピナーがある場合は、テキストを更新します
     * @param message 表示するメッセージ
     */
    start(message: string): void {
        if (this.suspended) {
            // 一時停止中は単純にメッセージを表示（対話式プロンプト用）
            console.log(chalk.cyan(`\n${message}`));
            return;
        }

        if (this.activeSpinner) {
            // 新しいスピナーを作成する代わりに既存のテキストを更新
            this.activeSpinner.text = message;
        } else {
            // 新しいスピナーを作成
            this.activeSpinner = ora(message).start();
        }
    }

    /**
     * スピナーのテキストを更新します
     * @param message 更新するメッセージ
     */
    update(message: string): void {
        if (this.suspended) {
            console.log(chalk.gray(`  ${message}`));
            return;
        }

        if (this.activeSpinner) {
            this.activeSpinner.text = message;
        } else {
            console.log(chalk.gray(`  ${message}`));
        }
    }

    /**
     * 成功メッセージでスピナーを停止します
     * @param message 表示する成功メッセージ
     */
    succeed(message?: string): void {
        if (this.suspended) {
            console.log(chalk.green(`✅ ${message || 'Done'}`));
            return;
        }

        if (this.activeSpinner) {
            this.activeSpinner.succeed(message);
            this.activeSpinner = undefined;
        } else {
            console.log(chalk.green(`✅ ${message || 'Done'}`));
        }
    }

    /**
     * 失敗メッセージでスピナーを停止します
     * @param message 表示する失敗メッセージ
     */
    fail(message?: string): void {
        if (this.suspended) {
            console.log(chalk.red(`❌ ${message || 'Failed'}`));
            return;
        }

        if (this.activeSpinner) {
            this.activeSpinner.fail(message);
            this.activeSpinner = undefined;
        } else {
            console.log(chalk.red(`❌ ${message || 'Failed'}`));
        }
    }

    /**
     * 警告メッセージでスピナーを停止します
     * @param message 表示する警告メッセージ
     */
    warn(message?: string): void {
        if (this.suspended) {
            console.log(chalk.yellow(`⚠️  ${message || 'Warning'}`));
            return;
        }

        if (this.activeSpinner) {
            this.activeSpinner.warn(message);
            this.activeSpinner = undefined;
        } else {
            console.log(chalk.yellow(`⚠️  ${message || 'Warning'}`));
        }
    }

    /**
     * 情報メッセージでスピナーを停止します
     * @param message 表示する情報メッセージ
     */
    info(message?: string): void {
        if (this.suspended) {
            console.log(chalk.blue(`ℹ️  ${message || 'Info'}`));
            return;
        }

        if (this.activeSpinner) {
            this.activeSpinner.info(message);
            this.activeSpinner = undefined;
        } else {
            console.log(chalk.blue(`ℹ️  ${message || 'Info'}`));
        }
    }

    /**
     * メッセージなしでスピナーを停止します
     */
    stop(): void {
        if (this.activeSpinner) {
            this.activeSpinner.stop();
            this.activeSpinner = undefined;
        }
    }

    /**
     * 対話式プロンプトのためにスピナーを一時的に停止します
     */
    suspend(): void {
        if (this.activeSpinner) {
            this.activeSpinner.stop();
            this.activeSpinner = undefined;
        }
        this.suspended = true;
    }

    /**
     * 対話式プロンプト後にスピナーを再開します
     * @param message 再開時に表示するメッセージ
     */
    resume(message?: string): void {
        this.suspended = false;
        if (message) {
            this.start(message);
        }
    }

    /**
     * スピナーが現在アクティブかどうかをチェックします
     * @returns アクティブな場合はtrue
     */
    isActive(): boolean {
        return !!this.activeSpinner && !this.suspended;
    }

    /**
     * スピナーが一時停止中かどうかをチェックします
     * @returns 一時停止中の場合はtrue
     */
    isSuspended(): boolean {
        return this.suspended;
    }

    /**
     * アクティブなスピナーをクリアし、状態をリセットします
     */
    clear(): void {
        this.stop();
        this.suspended = false;
    }
}

/**
 * シングルトンインスタンスをエクスポート
 * 全体で統一されたスピナー管理を提供します
 */
export const spinner = SpinnerManager.getInstance();
