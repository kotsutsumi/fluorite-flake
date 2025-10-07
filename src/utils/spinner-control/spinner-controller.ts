/**
 * スピナー制御ロジック
 */

import type { Ora } from "ora";
import type {
    SpinnerController,
    SpinnerControlOptions,
    SpinnerState,
} from "./types.js";

/**
 * スピナー制御実装クラス
 */
export class SpinnerControllerImpl implements SpinnerController {
    private readonly spinner: Ora;
    private state: SpinnerState = "active";
    private pausedText = "";

    constructor(spinner: Ora) {
        this.spinner = spinner;
    }

    /**
     * スピナーを一時停止
     * pnpmコマンド実行前に呼び出してログ競合を回避
     */
    pause(): void {
        if (this.state === "active" && this.spinner.isSpinning) {
            // 現在のテキストを保存
            this.pausedText = this.spinner.text;
            // スピナーを停止
            this.spinner.stop();
            this.state = "paused";
        }
    }

    /**
     * スピナーを再開
     * pnpmコマンド実行後に呼び出してスピナーを復活
     */
    resume(): void {
        if (this.state === "paused") {
            // 保存されたテキストでスピナーを再開
            this.spinner.start(this.pausedText);
            this.state = "active";
        }
    }

    /**
     * スピナーメッセージを更新
     * スピナーが動作中の場合のみ更新
     */
    updateMessage(message: string): void {
        if (this.state === "active" && this.spinner.isSpinning) {
            this.spinner.text = message;
        } else if (this.state === "paused") {
            // 一時停止中の場合は次回再開時用に保存
            this.pausedText = message;
        }
    }

    /**
     * スピナーがアクティブかどうかを判定
     */
    isActive(): boolean {
        return this.state === "active" && this.spinner.isSpinning;
    }

    /**
     * スピナーの現在の状態を取得
     */
    getState(): SpinnerState {
        return this.state;
    }

    /**
     * スピナーを完全に停止
     */
    stop(): void {
        if (this.spinner.isSpinning) {
            this.spinner.stop();
        }
        this.state = "stopped";
    }

    /**
     * スピナーを成功状態で終了
     */
    succeed(message?: string): void {
        this.spinner.succeed(message);
        this.state = "stopped";
    }

    /**
     * スピナーを失敗状態で終了
     */
    fail(message?: string): void {
        this.spinner.fail(message);
        this.state = "stopped";
    }
}

/**
 * スピナー制御のファクトリー関数
 * @param spinner ora スピナーインスタンス
 * @returns スピナー制御インターフェース
 */
export function createSpinnerController(spinner: Ora): SpinnerController {
    return new SpinnerControllerImpl(spinner);
}

/**
 * 外部コマンド実行用のスピナー制御ヘルパー
 * pnpmなどの外部コマンド実行時にスピナーを適切に制御
 */
export async function withSpinnerControl<T>(
    controller: SpinnerController,
    operation: () => Promise<T>,
    options: SpinnerControlOptions = {}
): Promise<T> {
    const { beforeMessage, afterMessage, stopOnError = true } = options;

    try {
        // 操作前のメッセージ設定
        if (beforeMessage) {
            controller.updateMessage(beforeMessage);
        }

        // スピナーを一時停止
        controller.pause();

        // 外部操作を実行
        const result = await operation();

        // スピナーを再開
        controller.resume();

        // 操作後のメッセージ設定
        if (afterMessage) {
            controller.updateMessage(afterMessage);
        }

        return result;
    } catch (error) {
        // エラー時の処理
        if (stopOnError && controller.isActive()) {
            controller.pause();
        } else {
            controller.resume();
        }
        throw error;
    }
}

// EOF
