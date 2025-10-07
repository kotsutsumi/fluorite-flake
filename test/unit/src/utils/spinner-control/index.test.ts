/**
 * スピナー制御ユーティリティのテスト
 *
 * このテストファイルでは、oraスピナーとpnpm進捗ログの競合を解決する
 * スピナー制御機能の動作を検証します。
 */

import type { Ora } from "ora";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import {
    createSpinnerController,
    SpinnerControllerImpl,
    withSpinnerControl,
} from "../../../../../src/utils/spinner-control/index.js";

// oraスピナーのモック
const createMockSpinner = (): Ora =>
    ({
        isSpinning: true,
        text: "",
        start: vi.fn().mockReturnThis(),
        stop: vi.fn().mockReturnThis(),
        succeed: vi.fn().mockReturnThis(),
        fail: vi.fn().mockReturnThis(),
    }) as any as Ora;

describe("スピナー制御ユーティリティ", () => {
    let mockSpinner: Ora;

    beforeEach(() => {
        mockSpinner = createMockSpinner();
    });

    describe("createSpinnerController", () => {
        it("スピナー制御インスタンスを正常に作成する", () => {
            // 実行: スピナー制御インスタンスを作成
            const controller = createSpinnerController(mockSpinner);

            // 検証: 正しいインスタンスが作成される
            expect(controller).toBeInstanceOf(SpinnerControllerImpl);
        });
    });

    describe("SpinnerController", () => {
        let controller: ReturnType<typeof createSpinnerController>;

        beforeEach(() => {
            controller = createSpinnerController(mockSpinner);
        });

        describe("pause/resume", () => {
            it("スピナーを正常に一時停止できる", () => {
                // 前提: スピナーがアクティブな状態
                mockSpinner.isSpinning = true;
                mockSpinner.text = "テスト中...";

                // 実行: スピナーを一時停止
                controller.pause();

                // 検証: スピナーが停止される
                expect(mockSpinner.stop).toHaveBeenCalledOnce();
            });

            it("一時停止中のスピナーを正常に再開できる", () => {
                // 前提: スピナーを一時停止
                mockSpinner.text = "テスト中...";
                controller.pause();

                // 実行: スピナーを再開
                controller.resume();

                // 検証: 元のテキストでスピナーが再開される
                expect(mockSpinner.start).toHaveBeenCalledWith("テスト中...");
            });

            it("非アクティブなスピナーの停止は無視される", () => {
                // 前提: スピナーが非アクティブ
                mockSpinner.isSpinning = false;

                // 実行: スピナーを一時停止
                controller.pause();

                // 検証: stopが呼ばれない
                expect(mockSpinner.stop).not.toHaveBeenCalled();
            });

            it("非一時停止状態でのresumeは無視される", () => {
                // 実行: 一時停止していない状態でresume
                controller.resume();

                // 検証: startが呼ばれない
                expect(mockSpinner.start).not.toHaveBeenCalled();
            });
        });

        describe("updateMessage", () => {
            it("アクティブなスピナーのメッセージを更新できる", () => {
                // 前提: スピナーがアクティブ
                mockSpinner.isSpinning = true;

                // 実行: メッセージを更新
                controller.updateMessage("新しいメッセージ");

                // 検証: スピナーのテキストが更新される
                expect(mockSpinner.text).toBe("新しいメッセージ");
            });

            it("一時停止中のメッセージ更新は次回再開時に適用される", () => {
                // 前提: スピナーを一時停止
                controller.pause();

                // 実行: メッセージを更新
                controller.updateMessage("一時停止中の更新");

                // 実行: スピナーを再開
                controller.resume();

                // 検証: 更新されたメッセージで再開される
                expect(mockSpinner.start).toHaveBeenCalledWith(
                    "一時停止中の更新"
                );
            });
        });

        describe("isActive", () => {
            it("アクティブなスピナーでtrueを返す", () => {
                // 前提: スピナーがアクティブ
                mockSpinner.isSpinning = true;

                // 実行・検証: アクティブ状態を確認
                expect(controller.isActive()).toBe(true);
            });

            it("一時停止中のスピナーでfalseを返す", () => {
                // 前提: スピナーを一時停止
                controller.pause();

                // 実行・検証: 非アクティブ状態を確認
                expect(controller.isActive()).toBe(false);
            });

            it("非動作中のスピナーでfalseを返す", () => {
                // 前提: スピナーが非動作中
                mockSpinner.isSpinning = false;

                // 実行・検証: 非アクティブ状態を確認
                expect(controller.isActive()).toBe(false);
            });
        });
    });

    describe("withSpinnerControl", () => {
        let controller: ReturnType<typeof createSpinnerController>;
        let mockOperation: Mock;

        beforeEach(() => {
            controller = createSpinnerController(mockSpinner);
            mockOperation = vi.fn();
        });

        it("成功時にスピナーを適切に制御する", async () => {
            // 前提: 成功する操作をモック
            const expectedResult = "成功結果";
            mockOperation.mockResolvedValue(expectedResult);

            // 実行: スピナー制御付きで操作を実行
            const result = await withSpinnerControl(controller, mockOperation);

            // 検証: 期待された結果が返される
            expect(result).toBe(expectedResult);
            // 検証: 操作が実行される
            expect(mockOperation).toHaveBeenCalledOnce();
        });

        it("エラー時にスピナーを適切に制御する", async () => {
            // 前提: エラーが発生する操作をモック
            const error = new Error("テストエラー");
            mockOperation.mockRejectedValue(error);

            // 実行・検証: エラーがスローされる
            await expect(
                withSpinnerControl(controller, mockOperation)
            ).rejects.toThrow("テストエラー");

            // 検証: 操作が実行される
            expect(mockOperation).toHaveBeenCalledOnce();
        });

        it("オプションのメッセージが適切に設定される", async () => {
            // 前提: 成功する操作をモック
            mockOperation.mockResolvedValue("結果");
            mockSpinner.isSpinning = true;

            // 実行: メッセージオプション付きで操作を実行
            await withSpinnerControl(controller, mockOperation, {
                beforeMessage: "操作前メッセージ",
                afterMessage: "操作後メッセージ",
            });

            // 検証: メッセージが適切に設定される
            // 注意: テキスト設定の順序を考慮してアサーション
            expect(mockSpinner.text).toBe("操作後メッセージ");
        });

        it("stopOnErrorオプションが正常に動作する", async () => {
            // 前提: エラーが発生する操作をモック
            const error = new Error("テストエラー");
            mockOperation.mockRejectedValue(error);

            // 実行・検証: stopOnError: falseでエラーが発生
            await expect(
                withSpinnerControl(controller, mockOperation, {
                    stopOnError: false,
                })
            ).rejects.toThrow("テストエラー");

            // 検証: 操作が実行される
            expect(mockOperation).toHaveBeenCalledOnce();
        });
    });
});

// EOF
