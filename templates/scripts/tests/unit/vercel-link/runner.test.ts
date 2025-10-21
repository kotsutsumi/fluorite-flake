import { describe, expect, it, vi } from "vitest";
import { runVercelLink } from "../../../libs/vercel-link/runner.js";
import type { VercelLinkDeps } from "../../../libs/vercel-link/types.js";

vi.mock("@clack/prompts", () => ({
  select: vi.fn(),
  multiselect: vi.fn(),
  text: vi.fn(),
  isCancel: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  readdir: vi.fn(),
}));

const createMockDeps = (overrides?: Partial<VercelLinkDeps>): VercelLinkDeps => ({
  projectRoot: "/project",
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
  prompt: vi.fn(),
  runCommand: vi.fn(),
  runCommandCapture: vi.fn(),
  readFile: vi.fn().mockResolvedValue(""),
  writeFile: vi.fn().mockResolvedValue(undefined),
  exists: vi.fn().mockReturnValue(false),
  ...overrides,
});

describe("UT-SCRIPTS-VERCEL-LINK-08: runner", () => {
  describe("runVercelLink", () => {
    it("should complete full workflow successfully", async () => {
      const { select, multiselect, text, isCancel } = await import("@clack/prompts");
      const { readdir } = await import("node:fs/promises");

      vi.mocked(select)
        .mockResolvedValueOnce("team-1") // selectTeamInteractive
        .mockResolvedValueOnce("link") // processAppLink - link mode
        .mockResolvedValueOnce("my-project"); // selectProjectInteractive

      vi.mocked(multiselect).mockResolvedValue(["backend"]);
      vi.mocked(text).mockResolvedValue("my-project");
      vi.mocked(isCancel).mockReturnValue(false);

      vi.mocked(readdir).mockResolvedValue([{ name: "backend", isDirectory: () => true } as any]);

      const runCommandCapture = vi
        .fn()
        .mockResolvedValueOnce("user@example.com") // whoami
        .mockResolvedValueOnce("  id          Team name\n✔ team-1      Team One") // teams ls
        .mockResolvedValueOnce("") // switch
        .mockResolvedValueOnce("  Name          Framework\n  my-project    next.js"); // projects list

      const runCommand = vi.fn().mockResolvedValue(undefined);

      const deps = createMockDeps({
        runCommand,
        runCommandCapture,
      });

      await runVercelLink(deps);

      expect(deps.logger.success).toHaveBeenCalledWith("Vercel CLI にログイン済みです");
      expect(deps.logger.success).toHaveBeenCalledWith(
        expect.stringContaining("すべてのアプリの処理が完了しました")
      );
      expect(process.exitCode).toBe(0);
    });

    it("should fail if not logged in to Vercel", async () => {
      const runCommandCapture = vi.fn().mockRejectedValue(new Error("Not logged in"));

      const deps = createMockDeps({
        runCommandCapture,
      });

      await expect(runVercelLink(deps)).rejects.toThrow("Vercel CLI にログインが必要です");
      expect(deps.logger.error).toHaveBeenCalledWith("Vercel CLI にログインしていません");
    });

    it("should exit if no teams found", async () => {
      const runCommandCapture = vi
        .fn()
        .mockResolvedValueOnce("user@example.com") // whoami
        .mockResolvedValueOnce("No teams"); // teams ls - no header

      const deps = createMockDeps({
        runCommandCapture,
      });

      await runVercelLink(deps);

      expect(deps.logger.warn).toHaveBeenCalledWith("利用可能なチームが見つかりませんでした");
      expect(process.exitCode).toBe(1);
    });

    it("should exit if no apps found", async () => {
      const { select, isCancel } = await import("@clack/prompts");
      const { readdir } = await import("node:fs/promises");

      vi.mocked(select).mockResolvedValue("team-1");
      vi.mocked(isCancel).mockReturnValue(false);
      vi.mocked(readdir).mockResolvedValue([]);

      const runCommandCapture = vi
        .fn()
        .mockResolvedValueOnce("user@example.com") // whoami
        .mockResolvedValueOnce("  id          Team name\n✔ team-1      Team One") // teams ls
        .mockResolvedValueOnce(""); // switch

      const deps = createMockDeps({
        runCommandCapture,
      });

      await runVercelLink(deps);

      expect(deps.logger.warn).toHaveBeenCalledWith(
        "apps/ 配下にプロジェクトが見つかりませんでした"
      );
      expect(process.exitCode).toBe(1);
    });

    it("should handle Vercel projects fetch error", async () => {
      const { select, isCancel } = await import("@clack/prompts");
      const { readdir } = await import("node:fs/promises");

      vi.mocked(select).mockResolvedValue("team-1");
      vi.mocked(isCancel).mockReturnValue(false);
      vi.mocked(readdir).mockResolvedValue([{ name: "backend", isDirectory: () => true } as any]);

      const runCommandCapture = vi
        .fn()
        .mockResolvedValueOnce("user@example.com") // whoami
        .mockResolvedValueOnce("  id          Team name\n✔ team-1      Team One") // teams ls
        .mockResolvedValueOnce("") // switch
        .mockRejectedValueOnce(new Error("Failed to fetch projects")); // projects list fails

      const deps = createMockDeps({
        runCommandCapture,
      });

      await expect(runVercelLink(deps)).rejects.toThrow("Failed to fetch projects");
      expect(deps.logger.error).toHaveBeenCalledWith("Vercel プロジェクト一覧の取得に失敗しました");
    });

    it("should handle create new project flow", async () => {
      const { select, multiselect, text, isCancel } = await import("@clack/prompts");
      const { readdir } = await import("node:fs/promises");

      vi.mocked(select)
        .mockResolvedValueOnce("team-1") // selectTeamInteractive
        .mockResolvedValueOnce("create"); // processAppLink - create mode

      vi.mocked(multiselect).mockResolvedValue(["backend"]);
      vi.mocked(text).mockResolvedValue("new-project");
      vi.mocked(isCancel).mockReturnValue(false);

      vi.mocked(readdir).mockResolvedValue([{ name: "backend", isDirectory: () => true } as any]);

      const runCommandCapture = vi
        .fn()
        .mockResolvedValueOnce("user@example.com") // whoami
        .mockResolvedValueOnce("  id          Team name\n✔ team-1      Team One") // teams ls
        .mockResolvedValueOnce("") // switch
        .mockResolvedValueOnce("  Name          Framework\n  my-project    next.js"); // projects list

      const runCommand = vi.fn().mockResolvedValue(undefined);

      const deps = createMockDeps({
        runCommand,
        runCommandCapture,
      });

      await runVercelLink(deps);

      // Verify commands were called (project creation and link)
      expect(runCommand).toHaveBeenCalled();

      // Verify logger messages indicate successful flow
      expect(deps.logger.success).toHaveBeenCalledWith(
        expect.stringContaining("すべてのアプリの処理が完了しました")
      );
    });

    it("should handle project creation failure", async () => {
      const { select, multiselect, text, isCancel } = await import("@clack/prompts");
      const { readdir } = await import("node:fs/promises");

      vi.mocked(select)
        .mockResolvedValueOnce("team-1") // selectTeamInteractive
        .mockResolvedValueOnce("create"); // processAppLink - create mode

      vi.mocked(multiselect).mockResolvedValue(["backend"]);
      vi.mocked(text).mockResolvedValue("new-project");
      vi.mocked(isCancel).mockReturnValue(false);

      vi.mocked(readdir).mockResolvedValue([{ name: "backend", isDirectory: () => true } as any]);

      const runCommandCapture = vi
        .fn()
        .mockResolvedValueOnce("user@example.com") // whoami
        .mockResolvedValueOnce("  id          Team name\n✔ team-1      Team One") // teams ls
        .mockResolvedValueOnce("") // switch
        .mockResolvedValueOnce("  Name          Framework\n  my-project    next.js"); // projects list

      const runCommand = vi.fn().mockRejectedValueOnce(new Error("Project creation failed")); // project add fails

      const deps = createMockDeps({
        runCommand,
        runCommandCapture,
      });

      // Should now continue processing despite error
      await runVercelLink(deps);
      expect(deps.logger.error).toHaveBeenCalledWith("\n❌ backend の処理中にエラーが発生しました");
      expect(deps.logger.warn).toHaveBeenCalledWith("   backend をスキップして続行します\n");
    });

    it("should handle link failure in create mode", async () => {
      const { select, multiselect, text, isCancel } = await import("@clack/prompts");
      const { readdir } = await import("node:fs/promises");

      vi.mocked(select)
        .mockResolvedValueOnce("team-1") // selectTeamInteractive
        .mockResolvedValueOnce("create") // processAppLink - create mode
        .mockResolvedValueOnce("my-project"); // selectProjectInteractive

      vi.mocked(multiselect).mockResolvedValue(["backend"]);
      vi.mocked(text).mockResolvedValue("my-project");
      vi.mocked(isCancel).mockReturnValue(false);

      vi.mocked(readdir).mockResolvedValue([{ name: "backend", isDirectory: () => true } as any]);

      const runCommandCapture = vi
        .fn()
        .mockResolvedValueOnce("user@example.com") // whoami
        .mockResolvedValueOnce("  id          Team name\n✔ team-1      Team One") // teams ls
        .mockResolvedValueOnce("") // switch
        .mockResolvedValueOnce("  Name          Framework\n  my-project    next.js"); // projects list

      // Make runCommand succeed for project creation but fail for link
      let runCommandCallCount = 0;
      const runCommand = vi.fn().mockImplementation(() => {
        runCommandCallCount++;
        if (runCommandCallCount === 1) {
          // First call: project creation - succeed
          return Promise.resolve(undefined);
        }
        // Second call: link - fail
        return Promise.reject(new Error("Link failed"));
      });

      const deps = createMockDeps({
        runCommand,
        runCommandCapture,
      });

      // Should now continue processing despite error
      await runVercelLink(deps);
      expect(deps.logger.error).toHaveBeenCalledWith("\n❌ backend の処理中にエラーが発生しました");
      expect(deps.logger.warn).toHaveBeenCalledWith("   backend をスキップして続行します\n");
    });

    it("should handle project creation failure", async () => {
      const { select, multiselect, text, isCancel } = await import("@clack/prompts");
      const { readdir } = await import("node:fs/promises");

      vi.mocked(select)
        .mockResolvedValueOnce("team-1") // selectTeamInteractive
        .mockResolvedValueOnce("create") // processAppLink - create mode to trigger project creation
        .mockResolvedValueOnce("my-project"); // selectProjectInteractive

      vi.mocked(multiselect).mockResolvedValue(["backend"]);
      vi.mocked(text).mockResolvedValue("my-project");
      vi.mocked(isCancel).mockReturnValue(false);

      vi.mocked(readdir).mockResolvedValue([{ name: "backend", isDirectory: () => true } as any]);

      const runCommandCapture = vi
        .fn()
        .mockResolvedValueOnce("user@example.com") // whoami
        .mockResolvedValueOnce("  id          Team name\n✔ team-1      Team One") // teams ls
        .mockResolvedValueOnce("") // switch
        .mockResolvedValueOnce("  Name          Framework\n  my-project    next.js"); // projects list

      const runCommand = vi.fn().mockRejectedValue(new Error("Project creation failed"));

      const deps = createMockDeps({
        runCommand,
        runCommandCapture,
      });

      // Should now continue processing despite error
      await runVercelLink(deps);
      expect(deps.logger.error).toHaveBeenCalledWith("\n❌ backend の処理中にエラーが発生しました");
      expect(deps.logger.warn).toHaveBeenCalledWith("   backend をスキップして続行します\n");
    });

    it("should handle text input cancellation in create mode", async () => {
      const { select, multiselect, text, isCancel, cancel } = await import("@clack/prompts");
      const { readdir } = await import("node:fs/promises");

      const cancelSymbol = Symbol("cancel");

      vi.mocked(select)
        .mockResolvedValueOnce("team-1") // selectTeamInteractive
        .mockResolvedValueOnce("create"); // processAppLink - create mode

      vi.mocked(multiselect).mockResolvedValue(["backend"]);
      vi.mocked(text).mockResolvedValue(cancelSymbol as any); // User cancels text input
      vi.mocked(isCancel).mockImplementation((value) => value === cancelSymbol);
      vi.mocked(cancel).mockImplementation(() => {
        // Intentionally empty - mock implementation
      });

      vi.mocked(readdir).mockResolvedValue([{ name: "backend", isDirectory: () => true } as any]);

      const runCommandCapture = vi
        .fn()
        .mockResolvedValueOnce("user@example.com") // whoami
        .mockResolvedValueOnce("  id          Team name\n✔ team-1      Team One") // teams ls
        .mockResolvedValueOnce("") // switch
        .mockResolvedValueOnce("  Name          Framework\n  my-project    next.js"); // projects list

      const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("process.exit called");
      });

      const deps = createMockDeps({
        runCommandCapture,
      });

      // With try-catch around processAppLink, the error is caught and processing continues
      await runVercelLink(deps);
      expect(cancel).toHaveBeenCalledWith("操作がキャンセルされました");
      expect(mockExit).toHaveBeenCalledWith(0);
      expect(deps.logger.error).toHaveBeenCalledWith("\n❌ backend の処理中にエラーが発生しました");
      expect(deps.logger.warn).toHaveBeenCalledWith("   backend をスキップして続行します\n");

      mockExit.mockRestore();
    });

    it("should handle env update failure in second phase gracefully", async () => {
      const { select, multiselect, text, isCancel } = await import("@clack/prompts");
      const { readdir } = await import("node:fs/promises");

      vi.mocked(select)
        .mockResolvedValueOnce("team-1") // selectTeamInteractive
        .mockResolvedValueOnce("link") // processAppLink - link mode
        .mockResolvedValueOnce("my-project"); // selectProjectInteractive

      vi.mocked(multiselect).mockResolvedValue(["backend"]);
      vi.mocked(text).mockResolvedValue("my-project");
      vi.mocked(isCancel).mockReturnValue(false);

      vi.mocked(readdir).mockResolvedValue([{ name: "backend", isDirectory: () => true } as any]);

      const runCommandCapture = vi
        .fn()
        .mockResolvedValueOnce("user@example.com") // whoami
        .mockResolvedValueOnce("  id          Team name\n✔ team-1      Team One") // teams ls
        .mockResolvedValueOnce("") // switch
        .mockResolvedValueOnce("  Name          Framework\n  my-project    next.js"); // projects list

      const runCommand = vi.fn().mockResolvedValue(undefined);

      let writeCallCount = 0;
      const writeFile = vi.fn().mockImplementation(() => {
        writeCallCount++;
        // Fail on second phase (calls 4-6)
        if (writeCallCount > 3) {
          return Promise.reject(new Error("Write failed"));
        }
        return Promise.resolve();
      });

      const deps = createMockDeps({
        runCommand,
        runCommandCapture,
        writeFile,
      });

      // Should complete despite second phase errors
      await runVercelLink(deps);

      expect(deps.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("個のファイル更新に失敗しました")
      );
      expect(deps.logger.success).toHaveBeenCalledWith(
        expect.stringContaining("すべてのアプリの処理が完了しました")
      );
    });

    it("should handle second phase updateAllEnvFiles throwing error", async () => {
      const { select, multiselect, text, isCancel } = await import("@clack/prompts");
      const { readdir } = await import("node:fs/promises");

      vi.mocked(select)
        .mockResolvedValueOnce("team-1") // selectTeamInteractive
        .mockResolvedValueOnce("link") // processAppLink - link mode
        .mockResolvedValueOnce("my-project"); // selectProjectInteractive

      vi.mocked(multiselect).mockResolvedValue(["backend"]);
      vi.mocked(text).mockResolvedValue("my-project");
      vi.mocked(isCancel).mockReturnValue(false);

      vi.mocked(readdir).mockResolvedValue([{ name: "backend", isDirectory: () => true } as any]);

      const runCommandCapture = vi
        .fn()
        .mockResolvedValueOnce("user@example.com") // whoami
        .mockResolvedValueOnce("  id          Team name\n✔ team-1      Team One") // teams ls
        .mockResolvedValueOnce("") // switch
        .mockResolvedValueOnce("  Name          Framework\n  my-project    next.js"); // projects list

      const runCommand = vi.fn().mockResolvedValue(undefined);

      // Make logger.info throw on second phase to trigger catch block in runner.ts lines 257-261
      let infoCallCount = 0;
      const logger = {
        info: vi.fn().mockImplementation((_msg: string) => {
          infoCallCount++;
          // Throw during second phase updateAllEnvFiles (inside try-catch at line 237)
          // First phase: ~40-45 calls, second phase before updateAllEnvFiles: ~48 calls
          // We want to throw during updateAllEnvFiles (not at line 236), so > 48
          if (infoCallCount > 48) {
            throw new Error("Logger error in second phase");
          }
        }),
        warn: vi.fn(),
        error: vi.fn(),
        success: vi.fn(),
      };

      const deps = createMockDeps({
        runCommand,
        runCommandCapture,
        logger,
      });

      // Should complete despite second phase errors
      await runVercelLink(deps);

      expect(deps.logger.error).toHaveBeenCalledWith(
        expect.stringContaining("環境変数ファイルの更新に失敗しました")
      );
      expect(deps.logger.warn).toHaveBeenCalledWith("  ⚠️  環境変数の更新をスキップします");
      expect(deps.logger.success).toHaveBeenCalledWith(
        expect.stringContaining("すべてのアプリの処理が完了しました")
      );
    });

    it("should handle files with no updates needed", async () => {
      const { select, multiselect, text, isCancel } = await import("@clack/prompts");
      const { readdir } = await import("node:fs/promises");

      vi.mocked(select)
        .mockResolvedValueOnce("team-1") // selectTeamInteractive
        .mockResolvedValueOnce("link") // processAppLink - link mode
        .mockResolvedValueOnce("my-project"); // selectProjectInteractive

      vi.mocked(multiselect).mockResolvedValue(["backend"]);
      vi.mocked(text).mockResolvedValue("my-project");
      vi.mocked(isCancel).mockReturnValue(false);

      vi.mocked(readdir).mockResolvedValue([{ name: "backend", isDirectory: () => true } as any]);

      const runCommandCapture = vi
        .fn()
        .mockResolvedValueOnce("user@example.com") // whoami
        .mockResolvedValueOnce("  id          Team name\n✔ team-1      Team One") // teams ls
        .mockResolvedValueOnce("") // switch
        .mockResolvedValueOnce("  Name          Framework\n  my-project    next.js"); // projects list

      const runCommand = vi.fn().mockResolvedValue(undefined);

      // Mock files to be already up to date with exact values that will be set
      const exists = vi.fn().mockReturnValue(true);
      const readFile = vi.fn().mockImplementation((filePath: string) => {
        if (filePath.includes(".env.production")) {
          return Promise.resolve(
            "NEXT_PUBLIC_APP_URL=https://my-project.vercel.app\nBETTER_AUTH_URL=https://my-project.vercel.app\nNEXT_PUBLIC_API_URL=https://my-project.vercel.app\n"
          );
        }
        if (filePath.includes(".env.staging")) {
          return Promise.resolve(
            "NEXT_PUBLIC_APP_URL=https://my-project-env-staging-team-1.vercel.app\nBETTER_AUTH_URL=https://my-project-env-staging-team-1.vercel.app\nNEXT_PUBLIC_API_URL=https://my-project-env-staging-team-1.vercel.app\n"
          );
        }
        if (filePath.includes(".env.preview")) {
          return Promise.resolve(
            "NEXT_PUBLIC_APP_URL=https://my-project-team-1.vercel.app\nBETTER_AUTH_URL=https://my-project-team-1.vercel.app\nNEXT_PUBLIC_API_URL=https://my-project-team-1.vercel.app\n"
          );
        }
        return Promise.resolve("");
      });
      const writeFile = vi.fn().mockResolvedValue(undefined);

      const deps = createMockDeps({
        runCommand,
        runCommandCapture,
        exists,
        readFile,
        writeFile,
      });

      await runVercelLink(deps);

      // Should log that no updates were needed
      const infoMessages = deps.logger.info.mock.calls.map((call) => call[0]);
      const noUpdateMessages = infoMessages.filter((msg) =>
        msg.includes("更新が必要なファイルはありませんでした")
      );
      expect(noUpdateMessages.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle first phase env update error and throw", async () => {
      const { select, multiselect, text, isCancel } = await import("@clack/prompts");
      const { readdir } = await import("node:fs/promises");

      vi.mocked(select)
        .mockResolvedValueOnce("team-1") // selectTeamInteractive
        .mockResolvedValueOnce("link") // processAppLink - link mode
        .mockResolvedValueOnce("my-project"); // selectProjectInteractive

      vi.mocked(multiselect).mockResolvedValue(["backend"]);
      vi.mocked(text).mockResolvedValue("my-project");
      vi.mocked(isCancel).mockReturnValue(false);

      vi.mocked(readdir).mockResolvedValue([{ name: "backend", isDirectory: () => true } as any]);

      const runCommandCapture = vi
        .fn()
        .mockResolvedValueOnce("user@example.com") // whoami
        .mockResolvedValueOnce("  id          Team name\n✔ team-1      Team One") // teams ls
        .mockResolvedValueOnce("") // switch
        .mockResolvedValueOnce("  Name          Framework\n  my-project    next.js"); // projects list

      const runCommand = vi.fn().mockResolvedValue(undefined);

      // Make logger.info throw during first phase updateAllEnvFiles to trigger catch block at runner.ts lines 142-145
      let infoCallCount = 0;
      const logger = {
        info: vi.fn().mockImplementation((_msg: string) => {
          infoCallCount++;
          // Throw during first phase updateAllEnvFiles (inside try block at line 123)
          // Need to be after processAppLink starts (~15 calls) but before second phase (~48 calls)
          if (infoCallCount > 25 && infoCallCount < 48) {
            throw new Error("Logger error in first phase");
          }
        }),
        warn: vi.fn(),
        error: vi.fn(),
        success: vi.fn(),
      };

      const deps = createMockDeps({
        runCommand,
        runCommandCapture,
        logger,
      });

      await expect(runVercelLink(deps)).rejects.toThrow("Logger error in first phase");
      expect(deps.logger.error).toHaveBeenCalledWith(
        expect.stringContaining("環境変数ファイルの更新に失敗しました")
      );
    });

    it("should handle first phase env file write errors", async () => {
      const { select, multiselect, text, isCancel } = await import("@clack/prompts");
      const { readdir } = await import("node:fs/promises");

      vi.mocked(select)
        .mockResolvedValueOnce("team-1") // selectTeamInteractive
        .mockResolvedValueOnce("link") // processAppLink - link mode
        .mockResolvedValueOnce("my-project"); // selectProjectInteractive

      vi.mocked(multiselect).mockResolvedValue(["backend"]);
      vi.mocked(text).mockResolvedValue("my-project");
      vi.mocked(isCancel).mockReturnValue(false);

      vi.mocked(readdir).mockResolvedValue([{ name: "backend", isDirectory: () => true } as any]);

      const runCommandCapture = vi
        .fn()
        .mockResolvedValueOnce("user@example.com") // whoami
        .mockResolvedValueOnce("  id          Team name\n✔ team-1      Team One") // teams ls
        .mockResolvedValueOnce("") // switch
        .mockResolvedValueOnce("  Name          Framework\n  my-project    next.js"); // projects list

      const runCommand = vi.fn().mockResolvedValue(undefined);

      // Make writeFile fail in first phase (calls 1-3) to trigger runner.ts lines 128-135
      let writeCallCount = 0;
      const writeFile = vi.fn().mockImplementation(() => {
        writeCallCount++;
        // Fail on first phase (calls 1-3)
        if (writeCallCount <= 3) {
          return Promise.reject(new Error("Write failed"));
        }
        return Promise.resolve();
      });

      const deps = createMockDeps({
        runCommand,
        runCommandCapture,
        writeFile,
      });

      await runVercelLink(deps);

      // Should log warnings about failed updates in first phase
      expect(deps.logger.warn).toHaveBeenCalledWith("  ⚠️  3個のファイル更新に失敗しました");
      expect(deps.logger.success).toHaveBeenCalledWith(
        expect.stringContaining("すべてのアプリの処理が完了しました")
      );
    });

    it("should validate empty project name in create mode", async () => {
      const { select, multiselect, text, isCancel } = await import("@clack/prompts");
      const { readdir } = await import("node:fs/promises");

      vi.mocked(select)
        .mockResolvedValueOnce("team-1") // selectTeamInteractive
        .mockResolvedValueOnce("create"); // processAppLink - create mode

      vi.mocked(multiselect).mockResolvedValue(["backend"]);
      vi.mocked(isCancel).mockReturnValue(false);

      vi.mocked(readdir).mockResolvedValue([{ name: "backend", isDirectory: () => true } as any]);

      const runCommandCapture = vi
        .fn()
        .mockResolvedValueOnce("user@example.com") // whoami
        .mockResolvedValueOnce("  id          Team name\n✔ team-1      Team One") // teams ls
        .mockResolvedValueOnce("") // switch
        .mockResolvedValueOnce("  Name          Framework\n  my-project    next.js"); // projects list

      // Mock text to capture validate function and test it
      let validateFn: ((value: string) => string | void) | undefined;
      vi.mocked(text).mockImplementation((options: any) => {
        validateFn = options.validate;
        return Promise.resolve("valid-project-name");
      });

      const runCommand = vi.fn().mockResolvedValue(undefined);

      const deps = createMockDeps({
        runCommand,
        runCommandCapture,
      });

      await runVercelLink(deps);

      // Test the validate function with empty values
      expect(validateFn).toBeDefined();
      expect(validateFn!("")).toBe("プロジェクト名を入力してください");
      expect(validateFn!("   ")).toBe("プロジェクト名を入力してください");
      expect(validateFn!("valid-name")).toBeUndefined();
    });

    it("should skip apps with missing project names in second phase", async () => {
      const { select, multiselect, text, isCancel } = await import("@clack/prompts");
      const { readdir } = await import("node:fs/promises");

      vi.mocked(select)
        .mockResolvedValueOnce("team-1") // selectTeamInteractive
        .mockResolvedValueOnce("link") // processAppLink - link mode for backend
        .mockResolvedValueOnce("my-project") // selectProjectInteractive for backend
        .mockResolvedValueOnce("link"); // processAppLink - link mode for web

      // Return multiple apps but we'll make one fail
      vi.mocked(multiselect).mockResolvedValue(["backend", "web"]);
      vi.mocked(text).mockResolvedValue("my-project");
      vi.mocked(isCancel).mockReturnValue(false);

      vi.mocked(readdir).mockResolvedValue([
        { name: "backend", isDirectory: () => true } as any,
        { name: "web", isDirectory: () => true } as any,
      ]);

      const runCommandCapture = vi
        .fn()
        .mockResolvedValueOnce("user@example.com") // whoami
        .mockResolvedValueOnce("  id          Team name\n✔ team-1      Team One") // teams ls
        .mockResolvedValueOnce("") // switch
        .mockResolvedValueOnce("  Name          Framework\n  my-project    next.js"); // projects list

      // Make runCommand fail for second app (web) link to trigger first phase error handling
      let linkCallCount = 0;
      const runCommand = vi.fn().mockImplementation((cmd: string, args: string[]) => {
        if (args[0] === "link") {
          linkCallCount++;
          if (linkCallCount === 2) {
            // Fail second app link - this will trigger the try-catch in first phase
            return Promise.reject(new Error("Link failed for web"));
          }
        }
        return Promise.resolve(undefined);
      });

      const deps = createMockDeps({
        runCommand,
        runCommandCapture,
      });

      // Should complete successfully by skipping failed app
      await runVercelLink(deps);

      // Verify that the error was logged and the app was skipped
      expect(deps.logger.error).toHaveBeenCalledWith("\n❌ web の処理中にエラーが発生しました");
      expect(deps.logger.warn).toHaveBeenCalledWith("   web をスキップして続行します\n");

      // Should still complete successfully
      expect(deps.logger.success).toHaveBeenCalledWith(
        expect.stringContaining("すべてのアプリの処理が完了しました")
      );
    });
  });
});

// EOF
