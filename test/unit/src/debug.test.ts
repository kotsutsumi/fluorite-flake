import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    debugLog,
    isDevelopment,
    printDevelopmentInfo,
    setupDevelopmentWorkspace,
} from "../../../src/debug.js";

// i18nモジュールをモック
vi.mock("../../../src/i18n.js", () => ({
    getMessagesForLocale: vi.fn((locale: string) => {
        const messages = {
            en: {
                debug: {
                    devModeEnabled: "🔧 Development mode enabled",
                    cwdLabel: "📍 Current working directory:",
                    nodeVersionLabel: "🔗 Node version:",
                    argsLabel: "📦 CLI arguments:",
                    changedDirectory: "📂 Changed working directory to:",
                    debugMessage: (message: string) => `🐛 Debug: ${message}`,
                },
            },
            ja: {
                debug: {
                    devModeEnabled: "🔧 開発モードが有効です",
                    cwdLabel: "📍 現在の作業ディレクトリ:",
                    nodeVersionLabel: "🔗 Node.js のバージョン:",
                    argsLabel: "📦 CLI 引数:",
                    changedDirectory: "📂 作業ディレクトリを変更しました:",
                    debugMessage: (message: string) =>
                        `🐛 デバッグ: ${message}`,
                },
            },
        };
        return messages[locale as keyof typeof messages];
    }),
    getMessages: vi.fn(() => ({
        debug: {
            devModeEnabled: "🔧 Development mode enabled",
            cwdLabel: "📍 Current working directory:",
            nodeVersionLabel: "🔗 Node version:",
            argsLabel: "📦 CLI arguments:",
            changedDirectory: "📂 Changed working directory to:",
            debugMessage: (message: string) => `🐛 Debug: ${message}`,
        },
    })),
}));

import { getMessagesForLocale } from "../../../src/i18n.js";

const DEBUG_MESSAGES_EN = getMessagesForLocale("en").debug;
const _DEBUG_MESSAGES_JA = getMessagesForLocale("ja").debug;

// Mock external dependencies
vi.mock("node:fs");
vi.mock("node:path");
vi.mock("chalk", () => ({
    default: {
        gray: vi.fn((text: string) => `[GRAY]${text}[/GRAY]`),
    },
}));

describe("debug utilities", () => {
    let originalEnv: string | undefined;
    let originalLocale: string | undefined;
    let originalCwd: string;
    let originalChdir: typeof process.chdir;
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        // Save original environment
        originalEnv = process.env.NODE_ENV;
        originalLocale = process.env.FLUORITE_LOCALE;
        originalCwd = process.cwd();
        originalChdir = process.chdir;

        // Default to English locale for deterministic assertions
        process.env.FLUORITE_LOCALE = "en";

        // Setup mocks
        consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {
            /* intentionally empty - mock console.log */
        });
        vi.mocked(process).cwd = vi.fn().mockReturnValue("/test/current/dir");
        vi.mocked(process).chdir = vi.fn();
        vi.mocked(fs.existsSync).mockReturnValue(false);
        vi.mocked(fs.rmSync).mockImplementation(() => {
            /* intentionally empty - mock fs.rmSync */
        });
        vi.mocked(fs.mkdirSync).mockImplementation(() => {
            /* intentionally empty - mock fs.mkdirSync */
        });
        vi.mocked(path.join).mockImplementation((...args) => args.join("/"));

        // Clear previous calls
        vi.clearAllMocks();
    });

    afterEach(() => {
        // Restore original environment
        if (originalEnv !== undefined) {
            process.env.NODE_ENV = originalEnv;
        } else {
            process.env.NODE_ENV = undefined;
        }

        if (originalLocale !== undefined) {
            process.env.FLUORITE_LOCALE = originalLocale;
        } else {
            process.env.FLUORITE_LOCALE = undefined;
        }

        process.cwd = () => originalCwd;
        process.chdir = originalChdir;
        consoleSpy.mockRestore();
    });

    describe("isDevelopment", () => {
        it("should return true when NODE_ENV is development", () => {
            process.env.NODE_ENV = "development";
            expect(isDevelopment()).toBe(true);
        });

        it("should return false when NODE_ENV is production", () => {
            process.env.NODE_ENV = "production";
            expect(isDevelopment()).toBe(false);
        });

        it("should return false when NODE_ENV is undefined", () => {
            process.env.NODE_ENV = undefined;
            expect(isDevelopment()).toBe(false);
        });

        it("should return false when NODE_ENV is empty string", () => {
            process.env.NODE_ENV = "";
            expect(isDevelopment()).toBe(false);
        });
    });

    describe("printDevelopmentInfo", () => {
        it("should print development information with gray styling", () => {
            printDevelopmentInfo();

            expect(consoleSpy).toHaveBeenCalledWith(
                `[GRAY]${DEBUG_MESSAGES_EN.devModeEnabled}[/GRAY]`
            );
            expect(consoleSpy).toHaveBeenCalledWith(
                `[GRAY]${DEBUG_MESSAGES_EN.cwdLabel}[/GRAY]`,
                "[GRAY]/test/current/dir[/GRAY]"
            );
            expect(consoleSpy).toHaveBeenCalledWith(
                `[GRAY]${DEBUG_MESSAGES_EN.nodeVersionLabel}[/GRAY]`,
                expect.stringContaining("[GRAY]v")
            );
            expect(consoleSpy).toHaveBeenCalledWith(
                `[GRAY]${DEBUG_MESSAGES_EN.argsLabel}[/GRAY]`,
                expect.stringContaining("[GRAY][")
            );
        });

        it("should format CLI arguments as JSON", () => {
            printDevelopmentInfo();

            const argsCall = consoleSpy.mock.calls.find((call) =>
                call[0]?.toString().includes(DEBUG_MESSAGES_EN.argsLabel)
            );
            expect(argsCall).toBeDefined();
            expect(argsCall?.[1]).toContain("[GRAY][");
        });
    });

    describe("setupDevelopmentWorkspace", () => {
        it("should create temp/dev directory when it does not exist", () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);

            setupDevelopmentWorkspace();

            expect(path.join).toHaveBeenCalledWith(
                "/test/current/dir",
                "temp",
                "dev"
            );
            expect(fs.existsSync).toHaveBeenCalledWith(
                "/test/current/dir/temp/dev"
            );
            expect(fs.rmSync).not.toHaveBeenCalled();
            expect(fs.mkdirSync).toHaveBeenCalledWith(
                "/test/current/dir/temp/dev",
                {
                    recursive: true,
                }
            );
            expect(process.chdir).toHaveBeenCalledWith(
                "/test/current/dir/temp/dev"
            );
        });

        it("should remove existing temp/dev directory before creating new one", () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);

            setupDevelopmentWorkspace();

            expect(fs.existsSync).toHaveBeenCalledWith(
                "/test/current/dir/temp/dev"
            );
            expect(fs.rmSync).toHaveBeenCalledWith(
                "/test/current/dir/temp/dev",
                {
                    recursive: true,
                }
            );
            expect(fs.mkdirSync).toHaveBeenCalledWith(
                "/test/current/dir/temp/dev",
                {
                    recursive: true,
                }
            );
            expect(process.chdir).toHaveBeenCalledWith(
                "/test/current/dir/temp/dev"
            );
        });

        it("should log directory change with gray styling", () => {
            setupDevelopmentWorkspace();

            expect(consoleSpy).toHaveBeenCalledWith(
                `[GRAY]${DEBUG_MESSAGES_EN.changedDirectory}[/GRAY]`,
                "[GRAY]/test/current/dir[/GRAY]"
            );
        });
    });

    describe("debugLog", () => {
        it("should log debug message when in development mode", () => {
            process.env.NODE_ENV = "development";

            debugLog("Test message");

            expect(consoleSpy).toHaveBeenCalledWith(
                `[GRAY]${DEBUG_MESSAGES_EN.debugMessage("Test message")}[/GRAY]`,
                ""
            );
        });

        it("should log debug message with data when in development mode", () => {
            process.env.NODE_ENV = "development";
            const testData = { foo: "bar", nested: { value: 123 } };

            debugLog("Test with data", testData);

            expect(consoleSpy).toHaveBeenCalledWith(
                `[GRAY]${DEBUG_MESSAGES_EN.debugMessage("Test with data")}[/GRAY]`,
                expect.stringContaining("[GRAY]{")
            );
        });

        it("should not log anything when not in development mode", () => {
            process.env.NODE_ENV = "production";

            debugLog("Test message");

            expect(consoleSpy).not.toHaveBeenCalled();
        });

        it("should handle undefined data parameter", () => {
            process.env.NODE_ENV = "development";

            debugLog("Test message", undefined);

            expect(consoleSpy).toHaveBeenCalledWith(
                `[GRAY]${DEBUG_MESSAGES_EN.debugMessage("Test message")}[/GRAY]`,
                ""
            );
        });

        it("should handle null data parameter", () => {
            process.env.NODE_ENV = "development";

            debugLog("Test message", null);

            expect(consoleSpy).toHaveBeenCalledWith(
                `[GRAY]${DEBUG_MESSAGES_EN.debugMessage("Test message")}[/GRAY]`,
                ""
            );
        });
    });

    describe("locale switching", () => {
        it("should handle locale switching for development info", () => {
            // 日本語ロケール設定時の基本動作確認
            // デバッグメッセージが適切に表示されることのみをテスト
            process.env.FLUORITE_LOCALE = "ja";
            consoleSpy.mockClear();

            printDevelopmentInfo();

            // コンソール出力が4回行われることを確認（開発情報の構成要素）
            expect(consoleSpy).toHaveBeenCalledTimes(4);

            // 最初の呼び出しが開発モード有効メッセージであることを確認
            const firstCall = consoleSpy.mock.calls[0];
            expect(firstCall[0]).toContain("[GRAY]");
            expect(firstCall[0]).toContain("🔧");
        });

        it("should handle locale switching for debug logging", () => {
            // 日本語ロケール設定時のデバッグログ基本動作確認
            process.env.FLUORITE_LOCALE = "ja";
            process.env.NODE_ENV = "development";
            consoleSpy.mockClear();

            debugLog("テスト");

            // デバッグログが1回出力されることを確認
            expect(consoleSpy).toHaveBeenCalledTimes(1);

            // デバッグメッセージが含まれることを確認
            const logCall = consoleSpy.mock.calls[0];
            expect(logCall[0]).toContain("[GRAY]");
            expect(logCall[0]).toContain("🐛");
            expect(logCall[0]).toContain("テスト");
        });
    });
});

// EOF
