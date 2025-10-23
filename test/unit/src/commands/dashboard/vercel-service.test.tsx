import path from "node:path";
import React from "react";
import { act, render } from "ink-testing-library";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getMessages } from "../../../../../src/i18n.js";

const appendLogMock = vi.fn();
const setInputModeMock = vi.fn();
const ensureDirMock = vi.fn();
const pathExistsMock = vi.fn();
const readJsonMock = vi.fn();
const writeFileMock = vi.fn();
const moveMock = vi.fn();
const vercelConstructorMock = vi.fn();
const getAuthUserMock = vi.fn();

const mockedHomedir = "/home/test-user";

vi.mock("fs-extra", () => ({
    default: {
        ensureDir: ensureDirMock,
        pathExists: pathExistsMock,
        readJson: readJsonMock,
        writeFile: writeFileMock,
        move: moveMock,
    },
}));

vi.mock("node:os", () => ({
    default: {
        homedir: () => mockedHomedir,
    },
    homedir: () => mockedHomedir,
}));

vi.mock("@vercel/sdk", () => ({
    Vercel: class {
        public user = {
            getAuthUser: getAuthUserMock,
        };

        constructor(options: { bearerToken: string }) {
            vercelConstructorMock(options);
        }
    },
}));

vi.mock("execa", () => ({
    execa: vi.fn(),
}));

vi.mock("open", () => ({
    default: vi.fn(),
}));

vi.mock("../../../../../src/commands/dashboard/state/dashboard-store.js", () => ({
    useDashboard: () => ({
        activeService: "vercel",
        services: ["vercel"],
        setActiveService: vi.fn(),
        cycleService: vi.fn(),
        logs: [],
        appendLog: appendLogMock,
        clearLogs: vi.fn(),
        isInputMode: false,
        setInputMode: setInputModeMock,
    }),
}));

import { execa } from "execa";
import openBrowser from "open";
import { VercelService } from "../../../../../src/commands/dashboard/components/vercel-service.js";

const execaMock = vi.mocked(execa);
const openMock = vi.mocked(openBrowser);
const { dashboard } = getMessages();
const vercelMessages = dashboard.vercel;

const instructions = dashboard.instructions;
const placeholder = dashboard.placeholders.vercel;
const defaultFooterLabel = dashboard.footerShortcuts.vercel;
const configPath = path.join(mockedHomedir, ".fluorite", "flake.json");

async function flush(): Promise<void> {
    await act(async () => {
        await new Promise((resolve) => {
            setTimeout(resolve, 0);
        });
    });
}

async function press(stdin: NodeJS.WritableStream, value: string): Promise<void> {
    await act(async () => {
        stdin.write(value);
    });
    await flush();
}

describe("VercelService", () => {
    beforeEach(() => {
        appendLogMock.mockReset();
        setInputModeMock.mockReset();
        execaMock.mockReset();
        openMock.mockReset();
        openMock.mockResolvedValue(undefined);

        ensureDirMock.mockReset();
        pathExistsMock.mockReset();
        readJsonMock.mockReset();
        writeFileMock.mockReset();
        moveMock.mockReset();
        vercelConstructorMock.mockReset();
        getAuthUserMock.mockReset();

        ensureDirMock.mockResolvedValue(undefined);
        pathExistsMock.mockResolvedValue(false);
        readJsonMock.mockResolvedValue({});
        writeFileMock.mockResolvedValue(undefined);
        moveMock.mockResolvedValue(undefined);
        getAuthUserMock.mockResolvedValue({});
    });

    it("toggles input mode while entering and cancelling token input", async () => {
        const onFooterChange = vi.fn();
        const { stdin, lastFrame, unmount } = render(
            <VercelService
                instructions={instructions}
                placeholder={placeholder}
                defaultFooterLabel={defaultFooterLabel}
                onFooterChange={onFooterChange}
            />,
        );

        await flush();
        setInputModeMock.mockClear();

        await press(stdin, "j");
        await press(stdin, "\r");

        expect(setInputModeMock).toHaveBeenCalledWith(true);
        expect(lastFrame()).toContain(vercelMessages.inputPromptEmpty);

        setInputModeMock.mockClear();
        await press(stdin, "\u001b");

        expect(setInputModeMock).toHaveBeenCalledWith(false);
        expect(appendLogMock).toHaveBeenCalledWith({
            level: "info",
            message: vercelMessages.logTokenInputCancelled,
        });
        expect(lastFrame()).toContain(vercelMessages.needsToken);

        unmount();
    });

    it("accepts trimmed token values, verifies them, and persists configuration", async () => {
        pathExistsMock
            .mockResolvedValueOnce(false)
            .mockResolvedValue(true);
        readJsonMock.mockResolvedValue({});

        const onFooterChange = vi.fn();

        const { stdin, lastFrame, unmount } = render(
            <VercelService
                instructions={instructions}
                placeholder={placeholder}
                defaultFooterLabel={defaultFooterLabel}
                onFooterChange={onFooterChange}
            />,
        );

        await flush();
        await press(stdin, "j");
        await press(stdin, "\r");
        setInputModeMock.mockClear();

        await press(stdin, "  my-vercel-token  ");
        await press(stdin, "\r");

        await flush();

        expect(setInputModeMock).toHaveBeenCalledWith(false);
        expect(getAuthUserMock).toHaveBeenCalledTimes(1);
        expect(vercelConstructorMock).toHaveBeenCalledWith({ bearerToken: "my-vercel-token" });

        const serializedPayloads = writeFileMock.mock.calls.map((call) => call[1] as string);
        expect(serializedPayloads.some((entry) => entry.includes('"access_key": "my-vercel-token"'))).toBe(true);
        expect(moveMock).toHaveBeenCalledWith(`${configPath}.tmp`, configPath, { overwrite: true });

        const lastLog = appendLogMock.mock.calls.at(-1)?.[0];
        expect(lastLog).toEqual({
            level: "success",
            message: vercelMessages.logTokenSaved,
        });
        expect(lastFrame()).toContain(placeholder);

        unmount();
    });

    it("loads existing token on startup and transitions to ready when validation succeeds", async () => {
        pathExistsMock.mockResolvedValue(true);
        readJsonMock.mockResolvedValue({
            vercel: {
                access_key: "stored-token",
            },
        });
        const onFooterChange = vi.fn();

        const { lastFrame, unmount } = render(
            <VercelService
                instructions={instructions}
                placeholder={placeholder}
                defaultFooterLabel={defaultFooterLabel}
                onFooterChange={onFooterChange}
            />,
        );

        await flush();
        await flush();

        expect(vercelConstructorMock).toHaveBeenCalledWith({ bearerToken: "stored-token" });
        expect(getAuthUserMock).toHaveBeenCalledTimes(1);

        expect(appendLogMock).toHaveBeenCalledWith({
            level: "success",
            message: vercelMessages.logTokenLoaded,
        });
        expect(lastFrame()).toContain(placeholder);

        unmount();
    });

    it("handles token validation failures by reverting to needs-token state", async () => {
        pathExistsMock.mockResolvedValue(true);
        readJsonMock.mockResolvedValue({
            vercel: {
                access_key: "invalid-token",
            },
        });
        const validationError = new Error("Unauthorized");
        (validationError as { statusCode?: number }).statusCode = 401;
        getAuthUserMock.mockRejectedValue(validationError);

        const onFooterChange = vi.fn();

        const { lastFrame, unmount } = render(
            <VercelService
                instructions={instructions}
                placeholder={placeholder}
                defaultFooterLabel={defaultFooterLabel}
                onFooterChange={onFooterChange}
            />,
        );

        await flush();
        await flush();

        expect(appendLogMock).toHaveBeenCalledWith({
            level: "warn",
            message: vercelMessages.logTokenValidationFailed(validationError.message),
        });

        const serializedPayloads = writeFileMock.mock.calls.map((call) => call[1] as string);
        expect(writeFileMock).toHaveBeenCalled();
        expect(serializedPayloads.every((entry) => !entry.includes("invalid-token"))).toBe(true);

        expect(lastFrame()).toContain(vercelMessages.tokenValidationError);
        expect(lastFrame()).toContain(vercelMessages.tokenValidateFailed(validationError.message));

        unmount();
    });

    it("logs and surfaces browser launch failures with fallbacks", async () => {
        const browserError = new Error("launch failed");
        openMock.mockRejectedValueOnce(browserError);
        execaMock.mockRejectedValueOnce(browserError).mockRejectedValueOnce(browserError);
        const onFooterChange = vi.fn();

        const { stdin, lastFrame, unmount } = render(
            <VercelService
                instructions={instructions}
                placeholder={placeholder}
                defaultFooterLabel={defaultFooterLabel}
                onFooterChange={onFooterChange}
            />,
        );

        await flush();
        await press(stdin, "\r");

        expect(openMock).toHaveBeenCalledWith(expect.stringContaining("vercel.com"), { wait: false });

        const expectedCommands =
            process.platform === "win32"
                ? ["cmd", "powershell"]
                : ["xdg-open", "open"];

        const [firstCommand, firstArgs] = execaMock.mock.calls[0];
        expect(firstCommand).toBe(expectedCommands[0]);
        expect(firstArgs).toEqual(expect.arrayContaining([expect.stringContaining("vercel.com")]));

        const [secondCommand, secondArgs] = execaMock.mock.calls[1];
        expect(secondCommand).toBe(expectedCommands[1]);
        expect(secondArgs).toEqual(expect.arrayContaining([expect.stringContaining("vercel.com")]));

        const errorLog = appendLogMock.mock.calls.at(-1)?.[0];
        expect(errorLog).toEqual({
            level: "error",
            message: vercelMessages.logBrowserOpenFailed(browserError.message),
        });
        expect(lastFrame()).toContain(vercelMessages.browserOpenFailed(browserError.message));
        expect(lastFrame()).toContain(vercelMessages.openTokenPage);

        unmount();
    });
});
