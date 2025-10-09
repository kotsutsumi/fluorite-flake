/**
 * スピナー制御ユーティリティの型定義
 */

/**
 * スピナー制御インターフェース
 */
export type SpinnerController = {
    /** スピナーを一時停止 */
    pause: () => void;
    /** スピナーを再開 */
    resume: () => void;
    /** スピナーメッセージを更新 */
    updateMessage: (message: string) => void;
    /** スピナーの現在の状態を取得 */
    isActive: () => boolean;
};

/**
 * スピナー制御オプション
 */
export type SpinnerControlOptions = {
    /** 操作前のメッセージ */
    beforeMessage?: string;
    /** 操作後のメッセージ */
    afterMessage?: string;
    /** エラー発生時にスピナーを自動停止するか */
    stopOnError?: boolean;
};

/**
 * スピナー状態
 */
export type SpinnerState = "active" | "paused" | "stopped";

// EOF
