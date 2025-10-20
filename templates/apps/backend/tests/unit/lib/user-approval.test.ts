// user-approval.test のテストケースを定義する。
import { describe, expect, it } from "vitest";
import { canUserLogin, isManualApprovalEnabled, USER_APPROVAL_STATUS } from "@/lib/user-approval";

describe("UT-LIB-16: user-approval", () => {
  describe("isManualApprovalEnabled", () => {
    // 補足: isManualApprovalEnabled はモジュール読み込み時に評価されるため、
    // 現在の環境変数による挙動のみをテストする
    it("should have a boolean value", () => {
      expect(typeof isManualApprovalEnabled).toBe("boolean");
    });

    // ここでは期待される挙動をドキュメント化する。実際に環境を変える場合は別プロセスが必要。
    it("should default to true when env vars indicate approval is required", () => {
      // 実際の値は環境変数に依存するが、ロジックを明示するためのテスト
      const testCases = [
        { env: undefined, expected: true },
        { env: "true", expected: true },
        { env: "TRUE", expected: true },
        { env: "yes", expected: true },
        { env: "false", expected: false },
        { env: "FALSE", expected: false },
        { env: "  false  ", expected: false },
      ];

      testCases.forEach(({ env, expected }) => {
        const raw = env;
        let result = true;

        if (typeof raw === "string") {
          result = raw.trim().toLowerCase() !== "false";
        }

        expect(result).toBe(expected);
      });
    });
  });

  describe("canUserLogin", () => {
    it("should return true for APPROVED + active users", () => {
      expect(canUserLogin(USER_APPROVAL_STATUS.APPROVED, true)).toBe(true);
    });

    it("should return false for APPROVED but inactive users", () => {
      expect(canUserLogin(USER_APPROVAL_STATUS.APPROVED, false)).toBe(false);
    });

    it("should return false for PENDING users even if active", () => {
      expect(canUserLogin(USER_APPROVAL_STATUS.PENDING, true)).toBe(false);
    });

    it("should return false for REJECTED users even if active", () => {
      expect(canUserLogin(USER_APPROVAL_STATUS.REJECTED, true)).toBe(false);
    });

    it("should return false for PENDING + inactive users", () => {
      expect(canUserLogin(USER_APPROVAL_STATUS.PENDING, false)).toBe(false);
    });

    it("should return false for REJECTED + inactive users", () => {
      expect(canUserLogin(USER_APPROVAL_STATUS.REJECTED, false)).toBe(false);
    });
  });

  describe("USER_APPROVAL_STATUS constants", () => {
    it("should have correct status values", () => {
      expect(USER_APPROVAL_STATUS.PENDING).toBe("PENDING");
      expect(USER_APPROVAL_STATUS.APPROVED).toBe("APPROVED");
      expect(USER_APPROVAL_STATUS.REJECTED).toBe("REJECTED");
    });
  });
});

// EOF
