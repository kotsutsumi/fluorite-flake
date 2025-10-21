import { describe, expect, it, vi } from "vitest";
import {
  fetchVercelProjects,
  selectProjectInteractive,
} from "../../../libs/vercel-link/project-selector.js";
import type { Logger, RunCommandCaptureFn } from "../../../libs/vercel-link/types.js";

vi.mock("@clack/prompts", () => ({
  select: vi.fn(),
  isCancel: vi.fn(),
  cancel: vi.fn(),
}));

const createMockLogger = (): Logger => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
});

describe("UT-SCRIPTS-VERCEL-LINK-06: project-selector", () => {
  describe("fetchVercelProjects", () => {
    it("should parse vercel projects list output", async () => {
      const output = `Vercel CLI 48.4.1

  Name                Framework      Updated
  backend             next.js        2h ago
  web                 next.js        1d ago`;

      const runCommandCapture: RunCommandCaptureFn = vi.fn().mockResolvedValue(output);
      const logger = createMockLogger();

      const projects = await fetchVercelProjects(runCommandCapture, "team-slug", logger);

      expect(projects).toHaveLength(2);
      expect(projects[0]).toEqual({
        name: "backend",
        framework: "next.js",
        updated: "2h ago",
      });
      expect(projects[1]).toEqual({
        name: "web",
        framework: "next.js",
        updated: "1d ago",
      });
      expect(runCommandCapture).toHaveBeenCalledWith("vercel", [
        "projects",
        "list",
        "--scope",
        "team-slug",
        "--no-color",
      ]);
    });

    it("should return empty array if header not found", async () => {
      const output = `Vercel CLI 48.4.1

Some invalid output`;

      const runCommandCapture: RunCommandCaptureFn = vi.fn().mockResolvedValue(output);
      const logger = createMockLogger();

      const projects = await fetchVercelProjects(runCommandCapture, "team-slug", logger);

      expect(projects).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith("プロジェクト一覧のヘッダーが見つかりませんでした");
    });

    it("should handle projects with missing fields", async () => {
      const output = `Vercel CLI 48.4.1

  Name                Framework      Updated
  backend`;

      const runCommandCapture: RunCommandCaptureFn = vi.fn().mockResolvedValue(output);
      const logger = createMockLogger();

      const projects = await fetchVercelProjects(runCommandCapture, "team-slug", logger);

      expect(projects).toEqual([]);
    });

    it("should throw error on command failure", async () => {
      const runCommandCapture: RunCommandCaptureFn = vi
        .fn()
        .mockRejectedValue(new Error("Command failed"));
      const logger = createMockLogger();

      await expect(fetchVercelProjects(runCommandCapture, "team-slug", logger)).rejects.toThrow(
        "Command failed"
      );
      expect(logger.error).toHaveBeenCalledWith("プロジェクト一覧の取得に失敗しました");
    });
  });

  describe("selectProjectInteractive", () => {
    it("should throw error if no projects available", async () => {
      const logger = createMockLogger();

      await expect(selectProjectInteractive([], logger)).rejects.toThrow(
        "利用可能なプロジェクトが見つかりませんでした"
      );
    });

    it("should handle select with user choice", async () => {
      const { select, isCancel } = await import("@clack/prompts");
      vi.mocked(select).mockResolvedValue("web");
      vi.mocked(isCancel).mockReturnValue(false);

      const projects = [
        { name: "backend", framework: "next.js", updated: "2h ago" },
        { name: "web", framework: "next.js", updated: "1d ago" },
      ];
      const logger = createMockLogger();

      const selected = await selectProjectInteractive(projects, logger);

      expect(selected).toBe("web");
      expect(logger.success).toHaveBeenCalledWith("選択されたプロジェクト: web");
    });

    it("should exit on cancel", async () => {
      const { select, isCancel, cancel } = await import("@clack/prompts");
      const cancelSymbol = Symbol("cancel");
      vi.mocked(select).mockResolvedValue(cancelSymbol);
      vi.mocked(isCancel).mockImplementation((value) => value === cancelSymbol);
      vi.mocked(cancel).mockImplementation(() => {
        // Intentionally empty - mock implementation
      });

      const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("process.exit called");
      });

      const projects = [{ name: "backend", framework: "next.js", updated: "2h ago" }];
      const logger = createMockLogger();

      await expect(selectProjectInteractive(projects, logger)).rejects.toThrow(
        "process.exit called"
      );

      expect(cancel).toHaveBeenCalledWith("操作がキャンセルされました");
      expect(mockExit).toHaveBeenCalledWith(0);

      mockExit.mockRestore();
    });
  });
});

// EOF
