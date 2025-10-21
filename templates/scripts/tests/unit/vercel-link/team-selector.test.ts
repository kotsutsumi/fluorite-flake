import { describe, expect, it, vi } from "vitest";
import {
  fetchVercelTeams,
  selectTeam,
  selectTeamInteractive,
  switchToTeam,
} from "../../../libs/vercel-link/team-selector.js";
import type {
  Logger,
  PromptFn,
  RunCommandCaptureFn,
  VercelTeam,
} from "../../../libs/vercel-link/types.js";

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

describe("UT-SCRIPTS-VERCEL-LINK-05: team-selector", () => {
  describe("fetchVercelTeams", () => {
    it("should parse vercel teams list output", async () => {
      const output = `Vercel CLI 48.4.1

  id                                Team name
✔ omega-code-s-team                 omega-code's Team
  kazuhiro-kotsutsumis-projects     Kazuhiro Kotsutsumi's projects`;

      const runCommandCapture: RunCommandCaptureFn = vi.fn().mockResolvedValue(output);
      const logger = createMockLogger();

      const teams = await fetchVercelTeams(runCommandCapture, logger);

      expect(teams).toHaveLength(2);
      expect(teams[0]).toEqual({
        id: "omega-code-s-team",
        slug: "omega-code-s-team",
        name: "omega-code's Team",
      });
      expect(teams[1]).toEqual({
        id: "kazuhiro-kotsutsumis-projects",
        slug: "kazuhiro-kotsutsumis-projects",
        name: "Kazuhiro Kotsutsumi's projects",
      });
    });

    it("should return empty array if header not found", async () => {
      const output = `Vercel CLI 48.4.1

Some invalid output`;

      const runCommandCapture: RunCommandCaptureFn = vi.fn().mockResolvedValue(output);
      const logger = createMockLogger();

      const teams = await fetchVercelTeams(runCommandCapture, logger);

      expect(teams).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith("チーム一覧のヘッダーが見つかりませんでした");
    });

    it("should throw error on command failure", async () => {
      const runCommandCapture: RunCommandCaptureFn = vi
        .fn()
        .mockRejectedValue(new Error("Command failed"));
      const logger = createMockLogger();

      await expect(fetchVercelTeams(runCommandCapture, logger)).rejects.toThrow("Command failed");
      expect(logger.error).toHaveBeenCalledWith("チーム一覧の取得に失敗しました");
    });
  });

  describe("selectTeam", () => {
    it("should throw error if no teams available", async () => {
      const logger = createMockLogger();
      const prompt: PromptFn = vi.fn();

      await expect(selectTeam([], prompt, logger)).rejects.toThrow(
        "利用可能なチームが見つかりませんでした"
      );
    });

    it("should auto-select single team", async () => {
      const teams: VercelTeam[] = [{ id: "team-1", slug: "team-1", name: "Team One" }];
      const logger = createMockLogger();
      const prompt: PromptFn = vi.fn();

      const selected = await selectTeam(teams, prompt, logger);

      expect(selected).toEqual(teams[0]);
      expect(logger.info).toHaveBeenCalledWith("ℹ️  チームを自動選択: Team One (team-1)");
    });

    it("should allow user to select team by number", async () => {
      const teams: VercelTeam[] = [
        { id: "team-1", slug: "team-1", name: "Team One" },
        { id: "team-2", slug: "team-2", name: "Team Two" },
      ];
      const logger = createMockLogger();
      const prompt: PromptFn = vi.fn().mockResolvedValue("2");

      const selected = await selectTeam(teams, prompt, logger);

      expect(selected).toEqual(teams[1]);
      expect(logger.success).toHaveBeenCalledWith("選択されたチーム: Team Two (team-2)");
    });

    it("should retry on empty input", async () => {
      const teams: VercelTeam[] = [
        { id: "team-1", slug: "team-1", name: "Team One" },
        { id: "team-2", slug: "team-2", name: "Team Two" },
      ];
      const logger = createMockLogger();
      const prompt: PromptFn = vi.fn().mockResolvedValueOnce("").mockResolvedValueOnce("1");

      const selected = await selectTeam(teams, prompt, logger);

      expect(selected).toEqual(teams[0]);
      expect(logger.warn).toHaveBeenCalledWith("入力が空です。チーム番号を入力してください。");
    });

    it("should retry on invalid number", async () => {
      const teams: VercelTeam[] = [
        { id: "team-1", slug: "team-1", name: "Team One" },
        { id: "team-2", slug: "team-2", name: "Team Two" },
      ];
      const logger = createMockLogger();
      const prompt: PromptFn = vi
        .fn()
        .mockResolvedValueOnce("99")
        .mockResolvedValueOnce("invalid")
        .mockResolvedValueOnce("1");

      const selected = await selectTeam(teams, prompt, logger);

      expect(selected).toEqual(teams[0]);
      expect(logger.warn).toHaveBeenCalledWith("無効な番号です。1〜2 の範囲で入力してください。");
    });
  });

  describe("selectTeamInteractive", () => {
    it("should throw error if no teams available", async () => {
      const logger = createMockLogger();

      await expect(selectTeamInteractive([], logger)).rejects.toThrow(
        "利用可能なチームが見つかりませんでした"
      );
    });

    it("should auto-select single team", async () => {
      const teams: VercelTeam[] = [{ id: "team-1", slug: "team-1", name: "Team One" }];
      const logger = createMockLogger();

      const selected = await selectTeamInteractive(teams, logger);

      expect(selected).toEqual(teams[0]);
      expect(logger.info).toHaveBeenCalledWith("ℹ️  チームを自動選択: Team One (team-1)");
    });

    it("should handle select with user choice", async () => {
      const { select, isCancel } = await import("@clack/prompts");
      vi.mocked(select).mockResolvedValue("team-2");
      vi.mocked(isCancel).mockReturnValue(false);

      const teams: VercelTeam[] = [
        { id: "team-1", slug: "team-1", name: "Team One" },
        { id: "team-2", slug: "team-2", name: "Team Two" },
      ];
      const logger = createMockLogger();

      const selected = await selectTeamInteractive(teams, logger);

      expect(selected).toEqual(teams[1]);
      expect(logger.success).toHaveBeenCalledWith("選択されたチーム: Team Two (team-2)");
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

      const teams: VercelTeam[] = [
        { id: "team-1", slug: "team-1", name: "Team One" },
        { id: "team-2", slug: "team-2", name: "Team Two" },
      ];
      const logger = createMockLogger();

      await expect(selectTeamInteractive(teams, logger)).rejects.toThrow("process.exit called");

      expect(cancel).toHaveBeenCalledWith("操作がキャンセルされました");
      expect(mockExit).toHaveBeenCalledWith(0);

      mockExit.mockRestore();
    });

    it("should throw error if selected team not found", async () => {
      const { select, isCancel } = await import("@clack/prompts");
      vi.mocked(select).mockReset().mockResolvedValue("non-existent");
      vi.mocked(isCancel).mockReset().mockReturnValue(false);

      const teams: VercelTeam[] = [
        { id: "team-1", slug: "team-1", name: "Team One" },
        { id: "team-2", slug: "team-2", name: "Team Two" },
      ];
      const logger = createMockLogger();

      await expect(selectTeamInteractive(teams, logger)).rejects.toThrow(
        "選択されたチームが見つかりませんでした"
      );
    });
  });

  describe("switchToTeam", () => {
    it("should switch to selected team", async () => {
      const runCommandCapture: RunCommandCaptureFn = vi.fn().mockResolvedValue("");
      const logger = createMockLogger();

      await switchToTeam("team-slug", runCommandCapture, logger);

      expect(runCommandCapture).toHaveBeenCalledWith("vercel", [
        "switch",
        "team-slug",
        "--no-color",
      ]);
      expect(logger.success).toHaveBeenCalledWith("チームの切り替えが完了しました");
    });

    it("should throw error on command failure", async () => {
      const runCommandCapture: RunCommandCaptureFn = vi
        .fn()
        .mockRejectedValue(new Error("Switch failed"));
      const logger = createMockLogger();

      await expect(switchToTeam("team-slug", runCommandCapture, logger)).rejects.toThrow(
        "Switch failed"
      );
      expect(logger.error).toHaveBeenCalledWith("チームの切り替えに失敗しました");
    });
  });
});

// EOF
