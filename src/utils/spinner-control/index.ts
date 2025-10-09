/**
 * スピナー制御ユーティリティ
 *
 * oraスピナーとpnpm進捗ログの競合問題を解決するためのユーティリティ。
 * 外部コマンド実行時にスピナーを適切に停止・再開することで、
 * ログの視認性を向上させる。
 */

export {
    createSpinnerController,
    SpinnerControllerImpl,
    withSpinnerControl,
} from "./spinner-controller.js";

export type {
    SpinnerController,
    SpinnerControlOptions,
    SpinnerState,
} from "./types.js";

// EOF
