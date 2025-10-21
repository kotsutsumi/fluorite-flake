import { describe, expect, it, vi } from "vitest";
import {
  discoverApps,
  selectApps,
  selectAppsInteractive,
} from "../../../libs/vercel-link/app-selector.js";
import type { AppDirectory, Logger, PromptFn } from "../../../libs/vercel-link/types.js";

vi.mock("node:fs/promises", () => ({
  readdir: vi.fn(),
}));

vi.mock("@clack/prompts", () => ({
  multiselect: vi.fn(),
  isCancel: vi.fn(),
  cancel: vi.fn(),
}));

const createMockLogger = (): Logger => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
});

describe("UT-SCRIPTS-VERCEL-LINK-04: app-selector", () => {
  describe("discoverApps", () => {
    it("should discover apps from apps/ directory", async () => {
      const { readdir } = await import("node:fs/promises");
      vi.mocked(readdir).mockResolvedValue([
        { name: "backend", isDirectory: () => true } as any,
        { name: "web", isDirectory: () => true } as any,
        { name: "package.json", isDirectory: () => false } as any,
      ]);

      const logger = createMockLogger();
      const apps = await discoverApps("/project", logger);

      expect(apps).toHaveLength(2);
      expect(apps[0]).toEqual({
        path: "/project/apps/backend",
        name: "backend",
      });
      expect(apps[1]).toEqual({
        path: "/project/apps/web",
        name: "web",
      });
    });

    it("should sort apps alphabetically", async () => {
      const { readdir } = await import("node:fs/promises");
      vi.mocked(readdir).mockResolvedValue([
        { name: "web", isDirectory: () => true } as any,
        { name: "backend", isDirectory: () => true } as any,
        { name: "mobile", isDirectory: () => true } as any,
      ]);

      const logger = createMockLogger();
      const apps = await discoverApps("/project", logger);

      expect(apps.map((a) => a.name)).toEqual(["backend", "mobile", "web"]);
    });

    it("should throw error on readdir failure", async () => {
      const { readdir } = await import("node:fs/promises");
      vi.mocked(readdir).mockRejectedValue(new Error("ENOENT"));

      const logger = createMockLogger();

      await expect(discoverApps("/project", logger)).rejects.toThrow("ENOENT");
      expect(logger.error).toHaveBeenCalledWith("apps/ ディレクトリの読み取りに失敗しました");
    });
  });

  describe("selectApps", () => {
    it("should throw error if no apps available", async () => {
      const logger = createMockLogger();
      const prompt: PromptFn = vi.fn();

      await expect(selectApps([], prompt, logger)).rejects.toThrow(
        "apps/ 配下にディレクトリが見つかりませんでした"
      );
    });

    it("should return all apps when user presses Enter", async () => {
      const apps: AppDirectory[] = [
        { path: "/project/apps/backend", name: "backend" },
        { path: "/project/apps/web", name: "web" },
      ];
      const logger = createMockLogger();
      const prompt: PromptFn = vi.fn().mockResolvedValue("");

      const selected = await selectApps(apps, prompt, logger);

      expect(selected).toEqual(apps);
      expect(logger.success).toHaveBeenCalledWith("全アプリを処理対象に設定しました");
    });

    it("should skip apps based on user input", async () => {
      const apps: AppDirectory[] = [
        { path: "/project/apps/backend", name: "backend" },
        { path: "/project/apps/web", name: "web" },
        { path: "/project/apps/mobile", name: "mobile" },
      ];
      const logger = createMockLogger();
      const prompt: PromptFn = vi.fn().mockResolvedValue("1,3");

      const selected = await selectApps(apps, prompt, logger);

      expect(selected).toHaveLength(1);
      expect(selected[0].name).toBe("web");
    });

    it("should handle invalid indices gracefully", async () => {
      const apps: AppDirectory[] = [
        { path: "/project/apps/backend", name: "backend" },
        { path: "/project/apps/web", name: "web" },
      ];
      const logger = createMockLogger();
      const prompt: PromptFn = vi.fn().mockResolvedValue("1,99,invalid");

      const selected = await selectApps(apps, prompt, logger);

      expect(selected).toHaveLength(1);
      expect(selected[0].name).toBe("web");
      expect(logger.warn).toHaveBeenCalledWith("無効な番号をスキップ: 99");
      expect(logger.warn).toHaveBeenCalledWith("無効な番号をスキップ: invalid");
    });

    it("should throw error if no apps selected", async () => {
      const apps: AppDirectory[] = [
        { path: "/project/apps/backend", name: "backend" },
        { path: "/project/apps/web", name: "web" },
      ];
      const logger = createMockLogger();
      const prompt: PromptFn = vi.fn().mockResolvedValue("1,2");

      await expect(selectApps(apps, prompt, logger)).rejects.toThrow(
        "処理対象のアプリが選択されませんでした"
      );
    });
  });

  describe("selectAppsInteractive", () => {
    it("should throw error if no apps available", async () => {
      const logger = createMockLogger();

      await expect(selectAppsInteractive([], logger)).rejects.toThrow(
        "apps/ 配下にディレクトリが見つかりませんでした"
      );
    });

    it("should auto-select single app", async () => {
      const apps: AppDirectory[] = [{ path: "/project/apps/backend", name: "backend" }];
      const logger = createMockLogger();

      const selected = await selectAppsInteractive(apps, logger);

      expect(selected).toEqual(apps);
      expect(logger.info).toHaveBeenCalledWith("ℹ️  アプリを自動選択: backend");
    });

    it("should handle multiselect with user selection", async () => {
      const { multiselect, isCancel } = await import("@clack/prompts");
      vi.mocked(multiselect).mockResolvedValue(["backend", "web"]);
      vi.mocked(isCancel).mockReturnValue(false);

      const apps: AppDirectory[] = [
        { path: "/project/apps/backend", name: "backend" },
        { path: "/project/apps/web", name: "web" },
        { path: "/project/apps/mobile", name: "mobile" },
      ];
      const logger = createMockLogger();

      const selected = await selectAppsInteractive(apps, logger);

      expect(selected).toHaveLength(2);
      expect(selected.map((a) => a.name)).toEqual(["backend", "web"]);
    });

    it("should return all apps if nothing selected", async () => {
      const { multiselect, isCancel } = await import("@clack/prompts");
      vi.mocked(multiselect).mockResolvedValue([]);
      vi.mocked(isCancel).mockReturnValue(false);

      const apps: AppDirectory[] = [
        { path: "/project/apps/backend", name: "backend" },
        { path: "/project/apps/web", name: "web" },
      ];
      const logger = createMockLogger();

      const selected = await selectAppsInteractive(apps, logger);

      expect(selected).toEqual(apps);
    });

    it("should exit on cancel", async () => {
      const { multiselect, isCancel, cancel } = await import("@clack/prompts");
      const cancelSymbol = Symbol("cancel");
      vi.mocked(multiselect).mockResolvedValue(cancelSymbol);
      vi.mocked(isCancel).mockImplementation((value) => value === cancelSymbol);
      vi.mocked(cancel).mockImplementation(() => {
        // Intentionally empty - mock implementation
      });

      const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("process.exit called");
      });

      const apps: AppDirectory[] = [
        { path: "/project/apps/backend", name: "backend" },
        { path: "/project/apps/web", name: "web" },
      ];
      const logger = createMockLogger();

      await expect(selectAppsInteractive(apps, logger)).rejects.toThrow("process.exit called");

      expect(cancel).toHaveBeenCalledWith("操作がキャンセルされました");
      expect(mockExit).toHaveBeenCalledWith(0);

      mockExit.mockRestore();
    });
  });
});

// EOF
