import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
// isCommandAvailable の様々な分岐を検証するテスト。
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isCommandAvailable } from "../../../libs/env-tools/is-command-available.js";

// child_process モジュールをモックする
vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
}));

// モック ChildProcess を作成するヘルパー
function createMockProcess() {
  const mockProcess = new EventEmitter() as any;
  mockProcess.stdout = new EventEmitter();
  mockProcess.stderr = new EventEmitter();
  return mockProcess;
}

describe("UT-SCRIPTS-06: isCommandAvailable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("プライマリバージョンチェック", () => {
    it("コマンド --version が成功した場合は true を返すこと", async () => {
      const mockProcess = createMockProcess();
      vi.mocked(spawn).mockReturnValue(mockProcess);

      const promise = isCommandAvailable("node");

      // 成功終了をシミュレート
      setTimeout(() => mockProcess.emit("close", 0), 10);

      await expect(promise).resolves.toBe(true);
      expect(spawn).toHaveBeenCalledWith("node", ["--version"], {
        stdio: "ignore",
        shell: false,
      });
    });

    it("zip コマンドには -v フラグを使用すること", async () => {
      const mockProcess = createMockProcess();
      vi.mocked(spawn).mockReturnValue(mockProcess);

      const promise = isCommandAvailable("zip");

      setTimeout(() => mockProcess.emit("close", 0), 10);

      await expect(promise).resolves.toBe(true);
      expect(spawn).toHaveBeenCalledWith("zip", ["-v"], {
        stdio: "ignore",
        shell: false,
      });
    });

    it("コマンドが見つからない場合は false を返すこと", async () => {
      let callCount = 0;
      vi.mocked(spawn).mockImplementation(() => {
        const mockProcess = createMockProcess();
        callCount++;

        // 両方の試行が失敗する
        setTimeout(() => {
          if (callCount === 1) {
            mockProcess.emit("error", new Error("command not found"));
          } else {
            mockProcess.emit("close", 1);
          }
        }, 10);

        return mockProcess;
      });

      const result = await isCommandAvailable("nonexistent");

      expect(result).toBe(false);
    });

    it("コマンドが非ゼロコードで終了した場合は false を返すこと", async () => {
      vi.mocked(spawn).mockImplementation(() => {
        const mockProcess = createMockProcess();

        setTimeout(() => {
          mockProcess.emit("close", 1);
        }, 10);

        return mockProcess;
      });

      const result = await isCommandAvailable("failing-command");

      expect(result).toBe(false);
    });
  });

  describe("which/where コマンドへのフォールバック", () => {
    it("Unix で初回チェックが失敗した場合は sh -c command -v を試すこと", async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, "platform", { value: "linux" });

      let callCount = 0;
      vi.mocked(spawn).mockImplementation(() => {
        const mockProcess = createMockProcess();
        callCount++;

        if (callCount === 1) {
          // 最初の呼び出しは失敗
          setTimeout(() => mockProcess.emit("error", new Error("fail")), 10);
        } else {
          // 2回目の呼び出しは成功
          setTimeout(() => mockProcess.emit("close", 0), 10);
        }

        return mockProcess;
      });

      const result = await isCommandAvailable("git");

      expect(result).toBe(true);
      expect(spawn).toHaveBeenCalledTimes(2);
      expect(spawn).toHaveBeenNthCalledWith(2, "sh", ["-c", "command -v git"], {
        stdio: "ignore",
      });

      Object.defineProperty(process, "platform", { value: originalPlatform });
    });

    it("すべてのチェックが失敗した場合は false を返すこと", async () => {
      vi.mocked(spawn).mockImplementation(() => {
        const mockProcess = createMockProcess();
        setTimeout(() => mockProcess.emit("error", new Error("fail")), 10);
        return mockProcess;
      });

      const result = await isCommandAvailable("nonexistent");

      expect(result).toBe(false);
    });

    it("Windows では where コマンドで存在確認を行うこと", async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, "platform", { value: "win32" });

      // Windows 環境でモジュールをリセットして再読み込み
      vi.resetModules();
      vi.clearAllMocks();
      const { isCommandAvailable: isCommandAvailableWin } = await import(
        "../../../libs/env-tools/is-command-available.js"
      );

      let callCount = 0;
      vi.mocked(spawn).mockImplementation(() => {
        const mockProcess = createMockProcess();
        callCount++;

        if (callCount === 1) {
          setTimeout(() => mockProcess.emit("error", new Error("fail")), 10);
        } else {
          setTimeout(() => mockProcess.emit("close", 0), 10);
        }

        return mockProcess;
      });

      const result = await isCommandAvailableWin("git");

      expect(result).toBe(true);
      expect(spawn).toHaveBeenNthCalledWith(2, "where", ["git"], {
        stdio: "ignore",
        shell: true,
      });

      Object.defineProperty(process, "platform", { value: originalPlatform });
      vi.resetModules();
    });

    it("Windows で where コマンドが非ゼロで終了した場合は false を返すこと", async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, "platform", { value: "win32" });

      vi.resetModules();
      vi.clearAllMocks();
      const { isCommandAvailable: isCommandAvailableWin } = await import(
        "../../../libs/env-tools/is-command-available.js"
      );

      let callCount = 0;
      vi.mocked(spawn).mockImplementation(() => {
        const mockProcess = createMockProcess();
        callCount++;

        if (callCount === 1) {
          setTimeout(() => mockProcess.emit("error", new Error("fail")), 10);
        } else {
          setTimeout(() => mockProcess.emit("close", 1), 10);
        }

        return mockProcess;
      });

      const result = await isCommandAvailableWin("nonexistent");

      expect(result).toBe(false);

      Object.defineProperty(process, "platform", { value: originalPlatform });
      vi.resetModules();
    });
  });
});

// EOF
