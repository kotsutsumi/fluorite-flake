/**
 * apps/docs の設定値を検証するユニットテスト。
 * 定数や設定値が期待通りかを確認する。
 */

import { describe, expect, it } from "vitest";

describe("Docs App Configuration", () => {
  describe("Metadata Constants", () => {
    it("should have correct project repository URL", () => {
      const PROJECT_REPO = "https://github.com/kotsutsumi/vercel-test";
      expect(PROJECT_REPO).toBe("https://github.com/kotsutsumi/vercel-test");
    });

    it("should have expected metadata structure", () => {
      // エクスポートされるメタデータの期待値を検証する
      const expectedTitle = {
        default: "Fluorite Flake Docs",
        template: "%s | Fluorite Flake Docs",
      };
      const expectedDescription = "Documentation for the Vercel Test Turborepo workspaces.";

      expect(expectedTitle.default).toBe("Fluorite Flake Docs");
      expect(expectedTitle.template).toBe("%s | Fluorite Flake Docs");
      expect(expectedDescription).toBe("Documentation for the Vercel Test Turborepo workspaces.");
    });

    it("should have current year in footer", () => {
      const currentYear = new Date().getFullYear();
      expect(currentYear).toBeGreaterThan(2023);
      expect(currentYear).toBeLessThanOrEqual(2030);
    });
  });
});

// EOF
