/**
 * シェルヘルパーユーティリティのテスト
 * プラットフォーム固有のシェル選択をテスト
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs", async () => {
    const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
    return {
        ...actual,
        accessSync: vi.fn(actual.accessSync),
    };
});

import { accessSync, constants } from "node:fs";

import { getShellForPlatform } from "../../../../src/utils/shell-helper/index.js";

describe("シェルヘルパーユーティリティ", () => {
    // プラットフォームや環境変数をバックアップ
    const originalPlatform = process.platform;
    const originalComSpec = process.env.ComSpec;
    const originalShell = process.env.SHELL;

    beforeEach(() => {
        vi.restoreAllMocks();
    });

    describe("getShellForPlatform", () => {
        it("WindowsプラットフォームでCOMSPECを優先すること", () => {
            Object.defineProperty(process, "platform", {
                value: "win32",
                configurable: true,
            });
            const expected = "cmd.exe";
            process.env.ComSpec = expected;
            process.env.SHELL = undefined;

            const result = getShellForPlatform();

            expect(result).toBe(expected);
        });

        it("macOSプラットフォームで/bin/shにフォールバックすること", () => {
            Object.defineProperty(process, "platform", {
                value: "darwin",
                configurable: true,
            });
            process.env.SHELL = undefined;

            const result = getShellForPlatform();

            expect(result).toBe("/bin/sh");
        });

        it("SHELL環境変数に指定されたシェルを優先すること", () => {
            Object.defineProperty(process, "platform", {
                value: "linux",
                configurable: true,
            });
            process.env.SHELL = "/custom/bin/fish";

            const accessMock = vi.mocked(accessSync);
            accessMock.mockImplementation((path: string) => {
                if (path === "/custom/bin/fish") {
                    return;
                }
                throw new Error("ENOENT");
            });

            const result = getShellForPlatform();

            expect(accessMock).toHaveBeenCalledWith(
                "/custom/bin/fish",
                constants.X_OK
            );
            expect(result).toBe("/custom/bin/fish");
        });

        it("候補が全滅した場合にshを返すこと", () => {
            Object.defineProperty(process, "platform", {
                value: "linux",
                configurable: true,
            });
            process.env.SHELL = undefined;

            const accessMock = vi.mocked(accessSync);
            accessMock.mockImplementation(() => {
                throw new Error("ENOENT");
            });

            const result = getShellForPlatform();

            expect(result).toBe("sh");
        });
    });

    // テスト後にプラットフォームと環境変数を復元
    afterEach(() => {
        Object.defineProperty(process, "platform", {
            value: originalPlatform,
            configurable: true,
        });

        if (originalComSpec === undefined) {
            process.env.ComSpec = undefined;
        } else {
            process.env.ComSpec = originalComSpec;
        }

        if (originalShell === undefined) {
            process.env.SHELL = undefined;
        } else {
            process.env.SHELL = originalShell;
        }
    });
});

// EOF
