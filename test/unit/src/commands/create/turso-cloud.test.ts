/**
 * Prerequisites: Node.js >= 20 with Vitest. External Turso services and CLI are mocked.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clack/prompts", () => {
    return {
        note: vi.fn(),
        log: {
            message: vi.fn(),
            info: vi.fn(),
            success: vi.fn(),
            step: vi.fn(),
            warn: vi.fn(),
            warning: vi.fn(),
            error: vi.fn(),
        },
    };
});

vi.mock("execa", () => ({
    execa: vi.fn(),
}));

vi.mock("@tursodatabase/api", () => {
    class MockTursoClientError extends Error {
        status?: number;

        constructor(message: string, options?: { status?: number }) {
            super(message);
            this.name = "TursoClientError";
            this.status = options?.status;
        }
    }

    return {
        createClient: vi.fn(),
        TursoClientError: MockTursoClientError,
    };
});

import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { randomUUID } from "node:crypto";

import { log, note } from "@clack/prompts";
import { execa } from "execa";
import { createClient } from "@tursodatabase/api";
import { initializeTursoCloud } from "../../../../../src/commands/create/database-provisioning/index.js";

type SpyFn = ReturnType<typeof vi.fn>;

const execaMock = vi.mocked(execa);
const createClientMock = vi.mocked(createClient);
const tmpRoot = mkdtempSync(path.join(os.tmpdir(), "fluorite-turso-test-"));

describe("initializeTursoCloud", () => {
    let homeDir: string;
    let homedirSpy: ReturnType<typeof vi.spyOn>;
    let hostnameSpy: ReturnType<typeof vi.spyOn>;
    let previousLocale: string | undefined;

    beforeEach(async () => {
        vi.clearAllMocks();
        createClientMock.mockReset();
        execaMock.mockReset();
        previousLocale = process.env.FLUORITE_LOCALE;
        process.env.FLUORITE_LOCALE = "en";
        homeDir = path.join(tmpRoot, randomUUID());
        await fs.ensureDir(homeDir);
        homedirSpy = vi.spyOn(os, "homedir").mockReturnValue(homeDir);
        hostnameSpy = vi.spyOn(os, "hostname").mockReturnValue("test-machine");
    });

    afterEach(() => {
        homedirSpy.mockRestore();
        hostnameSpy.mockRestore();
        if (previousLocale === undefined) {
            delete process.env.FLUORITE_LOCALE;
        } else {
            process.env.FLUORITE_LOCALE = previousLocale;
        }
        rmSync(homeDir, { recursive: true, force: true });
    });

    afterEach(async () => {
        await fs.emptyDir(tmpRoot);
    });

    it("reuses existing token when validation succeeds", async () => {
        const configDir = path.join(homeDir, ".fluorite");
        const configPath = path.join(configDir, "flake.json");
        await fs.ensureDir(configDir);
        await fs.writeJson(
            configPath,
            {
                truso: {
                    access_key: "valid-token",
                },
                other: "value",
            },
            { spaces: 4 }
        );

        const validateMock = vi.fn().mockResolvedValue({ valid: true, expiry: Math.floor(Date.now() / 1000) + 3600 });
        createClientMock.mockImplementationOnce(({ token }) => {
            expect(token).toBe("valid-token");
            return {
                apiTokens: {
                    validate: validateMock,
                    list: vi.fn(),
                    revoke: vi.fn(),
                    create: vi.fn(),
                },
            };
        });

        const result = await initializeTursoCloud();

        expect(result).toEqual({ status: "reused", token: "valid-token" });
        expect(validateMock).toHaveBeenCalledOnce();
        expect(execaMock).not.toHaveBeenCalled();
        expect(note).not.toHaveBeenCalled();
        expect(log.success).toHaveBeenCalled();

        const persisted = await fs.readJson(configPath);
        expect(persisted.truso.access_key).toBe("valid-token");
        expect(persisted.other).toBe("value");
    });

    it("prompts for Turso login when CLI status check fails", async () => {
        const configDir = path.join(homeDir, ".fluorite");
        await fs.ensureDir(configDir);
        await fs.writeJson(path.join(configDir, "flake.json"), {}, { spaces: 4 });

        createClientMock.mockImplementation(() => {
            throw new Error("createClient should not be called");
        });

        execaMock.mockRejectedValueOnce(new Error("not logged in"));

        const result = await initializeTursoCloud();

        expect(result).toEqual({ status: "login-required" });
        expect(note).toHaveBeenCalledWith(expect.stringContaining("turso auth login"), expect.any(String));
        expect(createClientMock).not.toHaveBeenCalled();
    });

    it("recreates token when validation fails and CLI login is available", async () => {
        const configDir = path.join(homeDir, ".fluorite");
        const configPath = path.join(configDir, "flake.json");
        await fs.ensureDir(configDir);
        await fs.writeJson(
            configPath,
            {
                truso: {
                    access_key: "stale-token",
                },
                retained: true,
            },
            { spaces: 4 }
        );

        const validateMock = vi.fn().mockResolvedValue({ valid: false, expiry: Math.floor(Date.now() / 1000) - 10 });
        createClientMock.mockImplementationOnce(({ token }) => {
            expect(token).toBe("stale-token");
            return {
                apiTokens: {
                    validate: validateMock,
                    list: vi.fn(),
                    revoke: vi.fn(),
                    create: vi.fn(),
                },
            };
        });

        const listMock = vi.fn().mockResolvedValue([
            {
                name: "fluorite-flake-test-machine",
                id: "token-id",
            },
        ]);
        const revokeMock = vi.fn().mockResolvedValue({});
        const createMock = vi.fn().mockResolvedValue({ token: "fresh-token" });

        createClientMock.mockImplementationOnce(({ token }) => {
            expect(token).toBe("management-token");
            return {
                apiTokens: {
                    validate: vi.fn(),
                    list: listMock,
                    revoke: revokeMock,
                    create: createMock,
                },
            };
        });

        execaMock.mockResolvedValueOnce({ stdout: "logged-in" });
        execaMock.mockResolvedValueOnce({ stdout: "management-token" });

        const result = await initializeTursoCloud();

        expect(result).toEqual({ status: "generated", token: "fresh-token" });
        expect(validateMock).toHaveBeenCalledOnce();
        expect(listMock).toHaveBeenCalledOnce();
        expect(revokeMock).toHaveBeenCalledWith("fluorite-flake-test-machine");
        expect(createMock).toHaveBeenCalledWith("fluorite-flake-test-machine");
        expect(log.info).toHaveBeenCalledWith(expect.stringContaining("fluorite-flake-test-machine"));
        const successCalls = (log.success as unknown as SpyFn).mock.calls as Array<[unknown]>;
        expect(successCalls.some(([message]) => typeof message === "string" && message.includes(".fluorite"))).toBe(true);

        const persisted = await fs.readJson(configPath);
        expect(persisted.retained).toBe(true);
        expect(persisted.truso.access_key).toBe("fresh-token");
    });
});

afterAll(() => {
    vi.resetModules();
    rmSync(tmpRoot, { recursive: true, force: true });
});
