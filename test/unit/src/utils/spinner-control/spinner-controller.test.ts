/**
 * スピナー制御ロジックの詳細テスト
 *
 * SpinnerControllerImplクラスの各メソッドの動作を詳細に検証します。
 * pnpm進捗ログとの競合回避機能が正しく動作することを確認します。
 */

import type { Ora } from "ora";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SpinnerControllerImpl } from "../../../../../src/utils/spinner-control/spinner-controller.js";

// oraスピナーのモック作成ヘルパー
const createMockSpinner = (initialState: Partial<Ora> = {}): Ora => {
    const defaultSpinner = {
        isSpinning: true,
        text: "",
        start: vi.fn().mockReturnThis(),
        stop: vi.fn().mockReturnThis(),
        succeed: vi.fn().mockReturnThis(),
        fail: vi.fn().mockReturnThis(),
    };

    return { ...defaultSpinner, ...initialState } as any as Ora;
};

describe("SpinnerControllerImpl", () => {
    let mockSpinner: Ora;
    let controller: SpinnerControllerImpl;

    beforeEach(() => {
        mockSpinner = createMockSpinner();
        controller = new SpinnerControllerImpl(mockSpinner);
    });

    describe("初期化", () => {
        it("コンストラクタで正しく初期化される", () => {
            // 実行: 新しいインスタンスを作成
            const newController = new SpinnerControllerImpl(mockSpinner);

            // 検証: 初期状態が正しく設定される
            expect(newController.getState()).toBe("active");
            expect(newController.isActive()).toBe(true);
        });
    });

    describe("pause/resume サイクル", () => {
        it("pause → resume のサイクルが正常に動作する", () => {
            // 前提: スピナーがアクティブで特定のテキストを持つ
            mockSpinner.isSpinning = true;
            mockSpinner.text = "処理中...";

            // 実行: 一時停止
            controller.pause();

            // 検証: 状態が一時停止に変更される
            expect(controller.getState()).toBe("paused");
            expect(controller.isActive()).toBe(false);
            expect(mockSpinner.stop).toHaveBeenCalledOnce();

            // 実行: 再開
            controller.resume();

            // 検証: 状態がアクティブに戻る
            expect(controller.getState()).toBe("active");
            expect(mockSpinner.start).toHaveBeenCalledWith("処理中...");
        });

        it("複数回のpauseは1回のstopしか呼ばない", () => {
            // 実行: 複数回pause
            controller.pause();
            controller.pause();
            controller.pause();

            // 検証: stopは1回だけ呼ばれる
            expect(mockSpinner.stop).toHaveBeenCalledOnce();
            expect(controller.getState()).toBe("paused");
        });

        it("複数回のresumeは1回のstartしか呼ばない", () => {
            // 前提: 一時停止状態
            controller.pause();
            vi.clearAllMocks();

            // 実行: 複数回resume
            controller.resume();
            controller.resume();
            controller.resume();

            // 検証: startは1回だけ呼ばれる
            expect(mockSpinner.start).toHaveBeenCalledOnce();
            expect(controller.getState()).toBe("active");
        });
    });

    describe("メッセージ更新", () => {
        it("アクティブ状態でのメッセージ更新", () => {
            // 前提: スピナーがアクティブ
            mockSpinner.isSpinning = true;

            // 実行: メッセージを更新
            controller.updateMessage("新しいメッセージ");

            // 検証: スピナーのテキストが更新される
            expect(mockSpinner.text).toBe("新しいメッセージ");
        });

        it("非アクティブ状態でのメッセージ更新は無視される", () => {
            // 前提: スピナーが非アクティブ
            mockSpinner.isSpinning = false;
            const originalText = mockSpinner.text;

            // 実行: メッセージを更新
            controller.updateMessage("無視されるメッセージ");

            // 検証: テキストは変更されない
            expect(mockSpinner.text).toBe(originalText);
        });

        it("一時停止中のメッセージ更新は次回再開時に反映される", () => {
            // 前提: スピナーを一時停止
            controller.pause();

            // 実行: メッセージを更新
            controller.updateMessage("一時停止中の更新");

            // 実行: 再開
            controller.resume();

            // 検証: 更新されたメッセージで再開される
            expect(mockSpinner.start).toHaveBeenCalledWith("一時停止中の更新");
        });

        it("複数回のメッセージ更新で最後の値が使用される", () => {
            // 前提: 一時停止状態
            controller.pause();

            // 実行: 複数回メッセージを更新
            controller.updateMessage("最初のメッセージ");
            controller.updateMessage("2番目のメッセージ");
            controller.updateMessage("最後のメッセージ");

            // 実行: 再開
            controller.resume();

            // 検証: 最後のメッセージが使用される
            expect(mockSpinner.start).toHaveBeenCalledWith("最後のメッセージ");
        });
    });

    describe("状態管理", () => {
        it("stop()で完全停止状態になる", () => {
            // 実行: 完全停止
            controller.stop();

            // 検証: 状態が停止に変更される
            expect(controller.getState()).toBe("stopped");
            expect(controller.isActive()).toBe(false);
            expect(mockSpinner.stop).toHaveBeenCalledOnce();
        });

        it("停止状態からのresume()は無効", () => {
            // 前提: 完全停止
            controller.stop();
            vi.clearAllMocks();

            // 実行: 再開を試行
            controller.resume();

            // 検証: startは呼ばれない
            expect(mockSpinner.start).not.toHaveBeenCalled();
            expect(controller.getState()).toBe("stopped");
        });

        it("succeed()で成功状態になる", () => {
            // 実行: 成功で終了
            controller.succeed("完了しました");

            // 検証: 成功メッセージで終了される
            expect(mockSpinner.succeed).toHaveBeenCalledWith("完了しました");
            expect(controller.getState()).toBe("stopped");
        });

        it("fail()で失敗状態になる", () => {
            // 実行: 失敗で終了
            controller.fail("エラーが発生しました");

            // 検証: 失敗メッセージで終了される
            expect(mockSpinner.fail).toHaveBeenCalledWith(
                "エラーが発生しました"
            );
            expect(controller.getState()).toBe("stopped");
        });
    });

    describe("エッジケース", () => {
        it("空のテキストでpause/resumeが正常動作する", () => {
            // 前提: 空のテキスト
            mockSpinner.text = "";

            // 実行: pause/resume
            controller.pause();
            controller.resume();

            // 検証: 空文字列で再開される
            expect(mockSpinner.start).toHaveBeenCalledWith("");
        });

        it("非スピニング状態のスピナーでpauseは無効", () => {
            // 前提: 非スピニング状態
            mockSpinner.isSpinning = false;

            // 実行: pause
            controller.pause();

            // 検証: stopは呼ばれず、状態も変わらない
            expect(mockSpinner.stop).not.toHaveBeenCalled();
            expect(controller.getState()).toBe("active");
        });

        it("undefinedメッセージでのupdateMessage", () => {
            // 実行: undefinedメッセージで更新
            controller.updateMessage(undefined as any);

            // 検証: スピナーのテキストがundefinedになる
            expect(mockSpinner.text).toBeUndefined();
        });
    });

    describe("実際のpnpmワークフローシミュレーション", () => {
        it("pnpm installシナリオのシミュレーション", () => {
            // シナリオ: pnpm install実行前後のスピナー制御
            mockSpinner.text = "依存関係をインストール中...";

            // ステップ1: コマンド実行前にpause
            controller.pause();
            expect(mockSpinner.stop).toHaveBeenCalledOnce();
            expect(controller.getState()).toBe("paused");

            // ステップ2: pnpmコマンド実行中はスピナー停止
            // (実際のコマンド実行をシミュレート)

            // ステップ3: コマンド完了後にresume
            controller.resume();
            expect(mockSpinner.start).toHaveBeenCalledWith(
                "依存関係をインストール中..."
            );
            expect(controller.getState()).toBe("active");

            // ステップ4: 最終的に成功で終了
            controller.succeed("インストール完了");
            expect(mockSpinner.succeed).toHaveBeenCalledWith(
                "インストール完了"
            );
        });

        it("複数のpnpmコマンド実行シナリオ", () => {
            const commands = [
                "依存関係をインストール中...",
                "Prismaクライアントを生成中...",
                "データベーススキーマをプッシュ中...",
                "シードデータを投入中...",
            ];

            // 各コマンドでpause/resumeサイクルを実行
            for (const message of commands) {
                controller.updateMessage(message);
                controller.pause();
                // pnpmコマンド実行をシミュレート
                controller.resume();
            }

            // 検証: 各コマンドでstop/startが呼ばれた
            expect(mockSpinner.stop).toHaveBeenCalledTimes(commands.length);
            expect(mockSpinner.start).toHaveBeenCalledTimes(commands.length);

            // 検証: 最後のメッセージで終了
            expect(mockSpinner.start).toHaveBeenLastCalledWith(
                "シードデータを投入中..."
            );
        });
    });
});

// EOF
