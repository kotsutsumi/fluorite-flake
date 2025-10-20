import { spawn } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RunCommandOptions } from "../../../libs/env-push/run-command.js";
import { runCommand } from "../../../libs/env-push/run-command.js";

vi.mock("node:child_process");

describe("runCommand", () => {
  let mockChild: {
    once: ReturnType<typeof vi.fn>;
    stdin: {
      write: ReturnType<typeof vi.fn>;
      end: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockChild = {
      once: vi.fn(),
      stdin: {
        write: vi.fn(),
        end: vi.fn(),
      },
    };

    vi.mocked(spawn).mockReturnValue(mockChild as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("成功時にコマンドを実行すること", async () => {
    mockChild.once.mockImplementation((event: string, callback: any) => {
      if (event === "close") {
        // コマンド成功（exit code 0）
        setTimeout(() => callback(0), 0);
      }
      return mockChild;
    });

    const options: RunCommandOptions = {
      cwd: "/test/dir",
      env: { TEST: "value" },
    };

    await expect(runCommand("echo", ["hello"], options)).resolves.toBeUndefined();

    expect(spawn).toHaveBeenCalledWith("echo", ["hello"], {
      cwd: "/test/dir",
      env: { TEST: "value" },
      stdio: ["pipe", "inherit", "inherit"],
      shell: process.platform === "win32",
    });
    expect(mockChild.stdin.end).toHaveBeenCalled();
  });

  it("入力がある場合はstdinに書き込むこと", async () => {
    mockChild.once.mockImplementation((event: string, callback: any) => {
      if (event === "close") {
        setTimeout(() => callback(0), 0);
      }
      return mockChild;
    });

    const options: RunCommandOptions = {
      cwd: "/test/dir",
      input: "test input",
    };

    await runCommand("cat", [], options);

    expect(mockChild.stdin.write).toHaveBeenCalledWith("test input\n");
    expect(mockChild.stdin.end).toHaveBeenCalled();
  });

  it("コマンドが0以外のコードで終了した場合にエラーをスローすること", async () => {
    mockChild.once.mockImplementation((event: string, callback: any) => {
      if (event === "close") {
        setTimeout(() => callback(1), 0);
      }
      return mockChild;
    });

    const options: RunCommandOptions = {
      cwd: "/test/dir",
    };

    await expect(runCommand("false", [], options)).rejects.toThrow("false  exited with code 1");
  });

  it("コマンドがnullコードで終了した場合にエラーをスローすること", async () => {
    mockChild.once.mockImplementation((event: string, callback: any) => {
      if (event === "close") {
        setTimeout(() => callback(null), 0);
      }
      return mockChild;
    });

    const options: RunCommandOptions = {
      cwd: "/test/dir",
    };

    await expect(runCommand("test", ["arg"], options)).rejects.toThrow(
      "test arg exited with code -1"
    );
  });

  it("スポーンエラーをキャッチすること", async () => {
    const testError = new Error("spawn error");

    mockChild.once.mockImplementation((event: string, callback: any) => {
      if (event === "error") {
        setTimeout(() => callback(testError), 0);
      }
      return mockChild;
    });

    const options: RunCommandOptions = {
      cwd: "/test/dir",
    };

    await expect(runCommand("nonexistent", [], options)).rejects.toThrow("spawn error");
  });
});

// EOF
