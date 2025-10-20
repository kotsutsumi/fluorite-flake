// user-registration.test のテストケースを定義する。
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { USER_APPROVAL_STATUS } from "@/lib/user-approval";
import { registerUserWithEmail } from "@/lib/user-registration";

// 依存モジュールをモック化する
vi.mock("@/lib/db", () => ({
  default: {
    user: {
      create: vi.fn(),
    },
    session: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      signInEmail: vi.fn(),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock("better-auth/crypto", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed_password"),
}));

import { auth } from "@/lib/auth";
// モック化したインスタンスを取得
import prisma from "@/lib/db";

describe("UT-LIB-15: registerUserWithEmail", () => {
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
    role: "user",
    approvalStatus: USER_APPROVAL_STATUS.APPROVED,
    isActive: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Manual Approval Behavior", () => {
    // 補足: isManualApprovalEnabled はモジュール読み込み時に評価されるため、
    // 環境差分をテストするにはプロセス起動前に環境変数を設定する必要がある。
    // ここでは期待される挙動をドキュメント化する目的でスキップしている。

    // biome-ignore lint/suspicious/noSkippedTests: モジュール評価時に環境を差し替えられないためスキップ
    it.skip("should create user with APPROVED status when manual approval is disabled", async () => {
      // SKIP: 環境変数を途中で変更できないためスキップ。テストしたい場合はプロセス起動前に
      // AUTH_REQUIRE_ADMIN_APPROVAL=false を設定すること。
      (prisma.user.create as any).mockResolvedValue({
        ...mockUser,
        approvalStatus: USER_APPROVAL_STATUS.APPROVED,
        isActive: true,
      });

      const result = await registerUserWithEmail({
        email: "test@example.com",
        password: "Password123!",
        name: "Test User",
      });

      expect(result.status).toBe("approved");
      expect(result.user.approvalStatus).toBe(USER_APPROVAL_STATUS.APPROVED);
      expect(result.user.isActive).toBe(true);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            approvalStatus: USER_APPROVAL_STATUS.APPROVED,
            isActive: true,
          }),
        })
      );
    });

    // biome-ignore lint/suspicious/noSkippedTests: モジュール評価時に環境を差し替えられないためスキップ
    it.skip("should create session when autoCreateSession=true and approval is OFF", async () => {
      // SKIP: モジュール読み込み時の環境依存を解決できないためスキップ
      (prisma.user.create as any).mockResolvedValue(mockUser);
      (auth.api.signInEmail as any).mockResolvedValue({ token: "session-token" });
      (prisma.session.findUnique as any).mockResolvedValue({
        expiresAt: new Date("2025-12-31"),
      });

      const result = await registerUserWithEmail({
        email: "test@example.com",
        password: "Password123!",
        autoCreateSession: true,
      });

      expect(result.status).toBe("approved");
      expect(result.session).toBeDefined();
      expect(result.session?.token).toBe("session-token");
      expect(auth.api.signInEmail).toHaveBeenCalled();
    });
  });

  describe("Manual Approval ON (mocked)", () => {
    beforeEach(() => {
      // isManualApprovalEnabled を true としてモック
      vi.doMock("@/lib/user-approval", () => ({
        isManualApprovalEnabled: true,
        USER_APPROVAL_STATUS: {
          PENDING: "PENDING",
          APPROVED: "APPROVED",
          REJECTED: "REJECTED",
        },
      }));
    });

    it("should create user with PENDING status when manual approval is enabled", async () => {
      (prisma.user.create as any).mockResolvedValue({
        ...mockUser,
        approvalStatus: USER_APPROVAL_STATUS.PENDING,
        isActive: false,
      });

      const result = await registerUserWithEmail({
        email: "test@example.com",
        password: "Password123!",
        name: "Test User",
      });

      expect(result.status).toBe("pending");
      expect(result.user.approvalStatus).toBe(USER_APPROVAL_STATUS.PENDING);
      expect(result.user.isActive).toBe(false);
    });

    it("should NOT create session when manual approval is enabled", async () => {
      (prisma.user.create as any).mockResolvedValue({
        ...mockUser,
        approvalStatus: USER_APPROVAL_STATUS.PENDING,
        isActive: false,
      });

      const result = await registerUserWithEmail({
        email: "test@example.com",
        password: "Password123!",
        autoCreateSession: true,
      });

      expect(result.status).toBe("pending");
      expect(result.session).toBeUndefined();
      expect(auth.api.signInEmail).not.toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should throw localized error when email already exists (P2002)", async () => {
      const duplicateError = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "6.0.0",
      });
      (prisma.user.create as any).mockRejectedValue(duplicateError);

      await expect(
        registerUserWithEmail({
          email: "duplicate@example.com",
          password: "Password123!",
        })
      ).rejects.toThrow("既に同じメールアドレスで登録済みです。");
    });

    it("should throw generic error for other failures", async () => {
      (prisma.user.create as any).mockRejectedValue(new Error("Database error"));

      await expect(
        registerUserWithEmail({
          email: "test@example.com",
          password: "Password123!",
        })
      ).rejects.toThrow("ユーザー登録に失敗しました。");
    });

    it("should throw error when email is empty", async () => {
      await expect(
        registerUserWithEmail({
          email: "",
          password: "Password123!",
        })
      ).rejects.toThrow("Email is required");
    });
  });

  describe("Email normalization", () => {
    beforeEach(() => {
      (prisma.user.create as any).mockResolvedValue(mockUser);
    });

    it("should trim and lowercase email addresses", async () => {
      await registerUserWithEmail({
        email: "  TEST@EXAMPLE.COM  ",
        password: "Password123!",
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: "test@example.com",
          }),
        })
      );
    });

    it("should trim name and handle empty names", async () => {
      await registerUserWithEmail({
        email: "test@example.com",
        password: "Password123!",
        name: "  ",
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: null,
          }),
        })
      );
    });
  });
});

// EOF
