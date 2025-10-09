import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { printHeader } from "../../../src/header.js";

// chalkライブラリのモック設定
vi.mock("chalk", () => ({
    default: {
        bold: {
            cyan: vi.fn((text: string) => `[BOLD_CYAN]${text}[/BOLD_CYAN]`),
        },
        gray: vi.fn((text: string) => `[GRAY]${text}[/GRAY]`),
        cyan: vi.fn((text: string) => `[CYAN]${text}[/CYAN]`),
        white: vi.fn((text: string) => `[WHITE]${text}[/WHITE]`),
    },
}));

// package.jsonのモック設定
vi.mock("../../../package.json", () => ({
    default: {
        version: "0.5.0",
    },
}));

describe("ヘッダーユーティリティ", () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {
            /* 意図的に空 - console.logのモック */
        });
        vi.clearAllMocks();
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    describe("printHeader", () => {
        it("正しいフォーマットでヘッダーを表示するべき", () => {
            // ヘッダー表示機能の基本動作テスト
            // 5回のconsole.log呼び出しで構成される完全なヘッダーレイアウト:
            // 1. 空行
            // 2. タイトル行（矢印 + アプリ名 + バージョン）
            // 3. アンダーライン（白色のダッシュ）
            // 4. タグライン（灰色、2スペースインデント）
            // 5. 空行
            printHeader();

            // console.logが適切な回数呼び出されることを確認
            expect(consoleSpy).toHaveBeenCalledTimes(5);

            // 呼び出し順序をチェック
            const calls = consoleSpy.mock.calls;

            // 1回目の呼び出し: 空行
            expect(calls[0]).toEqual([""]);

            // 2回目の呼び出し: アプリ名とバージョンを含むタイトル行
            expect(calls[1][0]).toContain("[CYAN]>[/CYAN]");
            expect(calls[1][0]).toContain("[BOLD_CYAN]Fluorite Flake[/BOLD_CYAN]");
            expect(calls[1][0]).toContain("[GRAY]v0.5.0[/GRAY]");

            // 3回目の呼び出し: 適切なインデントでタグライン
            expect(calls[2][0]).toContain("  [GRAY]Boilerplate generator CLI for Fluorite[/GRAY]");

            // 4回目の呼び出し: アンダーライン（白色のダッシュ）
            expect(calls[3][0]).toContain("[WHITE]");
            expect(calls[3][0]).toContain("─");

            // 5回目の呼び出し: 空行
            expect(calls[4]).toEqual([""]);
        });

        it("各要素に正しい色を使用するべき", () => {
            // 色付け機能の詳細テスト
            // タイトル行: シアン矢印 + 太字シアンアプリ名 + 灰色バージョン
            // アンダーライン: 白色ダッシュ文字
            // タグライン: 灰色テキスト
            printHeader();

            const calls = consoleSpy.mock.calls;
            const titleLine = calls[1][0];
            const tagline = calls[2][0];
            const underline = calls[3][0];

            // タイトル行は色付き要素を含むべき
            expect(titleLine).toContain("[CYAN]>[/CYAN]"); // 矢印
            expect(titleLine).toContain("[BOLD_CYAN]Fluorite Flake[/BOLD_CYAN]"); // アプリ名
            expect(titleLine).toContain("[GRAY]v0.5.0[/GRAY]"); // バージョン

            // アンダーラインは白色であるべき
            expect(underline).toContain("[WHITE]");
            expect(underline).toContain("─");

            // タグラインは灰色であるべき
            expect(tagline).toContain("[GRAY]Boilerplate generator CLI for Fluorite[/GRAY]");
        });

        it("バージョンを正しくフォーマットするべき", () => {
            // バージョン表示形式の検証テスト
            // 'v'プレフィックス付きで灰色表示されることを確認
            printHeader();

            const calls = consoleSpy.mock.calls;
            const titleLine = calls[1][0];

            // バージョンは'v'プレフィックス付きで灰色表示されるべき
            expect(titleLine).toContain("[GRAY]v0.5.0[/GRAY]");
        });

        it("適切な間隔とインデントを含むべき", () => {
            // レイアウト構造の検証テスト
            // - 開始と終了の空行
            // - タグラインの2スペースインデント
            // - 全体的な視覚的バランス
            printHeader();

            const calls = consoleSpy.mock.calls;

            // 空行で始まるべき
            expect(calls[0]).toEqual([""]);

            // タグラインは2スペースのインデントを持つべき
            expect(calls[2][0]).toMatch(/^ {2}/);

            // 空行で終わるべき
            expect(calls[4]).toEqual([""]);
        });

        it("適切な長さのアンダーラインを生成するべき", () => {
            // アンダーライン生成機能のテスト
            // - 複数のダッシュ文字で構成
            // - 白色でスタイリング
            // - タイトル行の長さに応じた適切な長さ
            printHeader();

            const calls = consoleSpy.mock.calls;
            const underline = calls[3][0];

            // アンダーラインは複数のダッシュ文字を含むべき
            expect(underline).toMatch(/─+/);
            expect(underline).toContain("[WHITE]");
        });
    });
});

// EOF
