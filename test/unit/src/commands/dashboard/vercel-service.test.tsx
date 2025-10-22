import React from "react";
import { act, render } from "ink-testing-library";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getMessages } from "../../../../../src/i18n.js";

const appendLogMock = vi.fn();
const setInputModeMock = vi.fn();

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

    it("accepts trimmed token values and transitions to ready state", async () => {
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

        expect(setInputModeMock).toHaveBeenCalledWith(false);
        const lastLog = appendLogMock.mock.calls.at(-1)?.[0];
        expect(lastLog).toEqual({
            level: "success",
            message: vercelMessages.logTokenSaved,
        });
        expect(lastFrame()).toContain(placeholder);

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
