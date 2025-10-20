import { describe, expect, it } from "vitest";
// エラー関連ユーティリティの動作を検証するテスト群。
import { createEnvToolError } from "../../../libs/env-tools/create-env-tool-error.js";
import { createUsageError } from "../../../libs/env-tools/create-usage-error.js";
import { isEnvToolError } from "../../../libs/env-tools/is-env-tool-error.js";
import { isUsageError } from "../../../libs/env-tools/is-usage-error.js";

describe("UT-SCRIPTS-03: Error Utilities", () => {
  describe("createEnvToolError", () => {
    it("EnvToolError という名前のエラーを作成すること", () => {
      const error = createEnvToolError("Test error message");

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("EnvToolError");
      expect(error.message).toBe("Test error message");
    });
  });

  describe("isEnvToolError", () => {
    it("EnvToolError インスタンスに対して true を返すこと", () => {
      const error = createEnvToolError("Test");

      expect(isEnvToolError(error)).toBe(true);
    });

    it("通常の Error インスタンスに対して false を返すこと", () => {
      const error = new Error("Regular error");

      expect(isEnvToolError(error)).toBe(false);
    });

    it("Error 以外の値に対して false を返すこと", () => {
      expect(isEnvToolError("string")).toBe(false);
      expect(isEnvToolError(null)).toBe(false);
      expect(isEnvToolError(undefined)).toBe(false);
      expect(isEnvToolError(123)).toBe(false);
      expect(isEnvToolError({})).toBe(false);
    });
  });

  describe("createUsageError", () => {
    it("UsageError という名前のエラーを作成すること", () => {
      const error = createUsageError("Invalid usage");

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("UsageError");
      expect(error.message).toBe("Invalid usage");
    });
  });

  describe("isUsageError", () => {
    it("UsageError インスタンスに対して true を返すこと", () => {
      const error = createUsageError("Test");

      expect(isUsageError(error)).toBe(true);
    });

    it("通常の Error インスタンスに対して false を返すこと", () => {
      const error = new Error("Regular error");

      expect(isUsageError(error)).toBe(false);
    });

    it("Error 以外の値に対して false を返すこと", () => {
      expect(isUsageError("string")).toBe(false);
      expect(isUsageError(null)).toBe(false);
      expect(isUsageError(undefined)).toBe(false);
    });
  });

  describe("Error type guards differentiation", () => {
    it("EnvToolError と UsageError を区別できること", () => {
      const envError = createEnvToolError("Env error");
      const usageError = createUsageError("Usage error");

      expect(isEnvToolError(envError)).toBe(true);
      expect(isUsageError(envError)).toBe(false);

      expect(isUsageError(usageError)).toBe(true);
      expect(isEnvToolError(usageError)).toBe(false);
    });
  });
});

// EOF
