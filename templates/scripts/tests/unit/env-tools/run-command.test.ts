import { describe, expect, it, vi } from "vitest";
import { runCommand } from "../../../libs/env-tools/run-command.js";

vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
}));

const { spawn } = await import("node:child_process");

// モック プロセスを作成するヘルパー
function createMockProcess() {
  const listeners: Record<string, ((...args: any[]) => void)[]> = {};
  return {
    once: (event: string, handler: (...args: any[]) => void) => {
      listeners[event] ??= [];
      listeners[event].push(handler);
    },
    emit: (event: string, ...args: any[]) => {
      for (const handler of listeners[event] ?? []) {
        handler(...args);
      }
    },
  };
}

describe("UT-SCRIPTS-20: runCommand", () => {
  it("コマンドが終了コード 0 で終了した場合は解決すること", async () => {
    vi.mocked(spawn).mockImplementation(() => {
      const proc = createMockProcess();
      setImmediate(() => proc.emit("close", 0));
      return proc as unknown as ReturnType<typeof spawn>;
    });

    await expect(runCommand("echo", ["hello"])).resolves.toBeUndefined();
  });

  it("spawn がエラーを発行した場合は拒否すること", async () => {
    vi.mocked(spawn).mockImplementation(() => {
      const proc = createMockProcess();
      setImmediate(() => proc.emit("error", new Error("spawn failed")));
      return proc as unknown as ReturnType<typeof spawn>;
    });

    await expect(runCommand("echo", [])).rejects.toThrow("spawn failed");
  });

  it("コマンドが非ゼロコードで終了した場合は拒否すること", async () => {
    vi.mocked(spawn).mockImplementation(() => {
      const proc = createMockProcess();
      setImmediate(() => proc.emit("close", 2));
      return proc as unknown as ReturnType<typeof spawn>;
    });

    await expect(runCommand("false", [])).rejects.toThrow(/false {2}exited with code 2/);
  });

  it("Error インスタンスでないエラーを処理すること", async () => {
    vi.mocked(spawn).mockImplementation(() => {
      const proc = createMockProcess();
      setImmediate(() => proc.emit("error", "string error"));
      return proc as unknown as ReturnType<typeof spawn>;
    });

    await expect(runCommand("echo", [])).rejects.toThrow("Failed to run echo: string error");
  });

  it("null/undefined の終了コードを処理すること", async () => {
    vi.mocked(spawn).mockImplementation(() => {
      const proc = createMockProcess();
      setImmediate(() => proc.emit("close", null));
      return proc as unknown as ReturnType<typeof spawn>;
    });

    await expect(runCommand("test", ["arg"])).rejects.toThrow(/test arg exited with code -1/);
  });
});

// EOF
