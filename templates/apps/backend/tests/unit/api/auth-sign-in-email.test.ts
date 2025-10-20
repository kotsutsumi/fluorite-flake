// auth-sign-in-email.test のテストケースを定義する。
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/auth/sign-in/email/route";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { USER_APPROVAL_STATUS } from "@/lib/user-approval";

// 依存モジュールをモック化する
vi.mock("@/lib/db", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    handler: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe("UT-LIB-18: POST /api/auth/sign-in/email", () => {
  const createRequest = (body: Record<string, unknown>): NextRequest =>
    new NextRequest("http://localhost:3001/api/auth/sign-in/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Approval Status Rejection", () => {
    it("should reject PENDING users with 403 and PENDING_APPROVAL code", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: "user-123",
        approvalStatus: USER_APPROVAL_STATUS.PENDING,
        isActive: true,
      });

      const request = createRequest({
        email: "pending@example.com",
        password: "Password123!",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.code).toBe("PENDING_APPROVAL");
      expect(data.message).toContain("承認待ち");
      expect(auth.handler).not.toHaveBeenCalled();
    });

    it("should reject REJECTED users with 403 and REJECTED code", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: "user-123",
        approvalStatus: USER_APPROVAL_STATUS.REJECTED,
        isActive: true,
      });

      const request = createRequest({
        email: "rejected@example.com",
        password: "Password123!",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.code).toBe("REJECTED");
      expect(data.message).toContain("拒否");
      expect(auth.handler).not.toHaveBeenCalled();
    });

    it("should reject inactive users with 403 and ACCOUNT_DISABLED code", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: "user-123",
        approvalStatus: USER_APPROVAL_STATUS.APPROVED,
        isActive: false,
      });

      const request = createRequest({
        email: "disabled@example.com",
        password: "Password123!",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.code).toBe("ACCOUNT_DISABLED");
      expect(data.message).toContain("無効化");
      expect(auth.handler).not.toHaveBeenCalled();
    });
  });

  describe("Delegation to Better Auth", () => {
    it("should delegate to Better Auth when user not found", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);
      (auth.handler as any).mockResolvedValue(new Response("Better Auth response"));

      const request = createRequest({
        email: "nonexistent@example.com",
        password: "Password123!",
      });

      await POST(request);

      expect(auth.handler).toHaveBeenCalledWith(request);
    });

    it("should delegate to Better Auth for APPROVED + active users", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: "user-123",
        approvalStatus: USER_APPROVAL_STATUS.APPROVED,
        isActive: true,
      });
      (auth.handler as any).mockResolvedValue(new Response("Better Auth response"));

      const request = createRequest({
        email: "approved@example.com",
        password: "Password123!",
      });

      await POST(request);

      expect(auth.handler).toHaveBeenCalledWith(request);
    });
  });

  describe("Input Validation", () => {
    it("should return 400 when email is missing", async () => {
      const request = createRequest({
        password: "Password123!",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toContain("メールアドレス");
    });

    it("should return 400 when email is empty string", async () => {
      const request = createRequest({
        email: "",
        password: "Password123!",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toContain("メールアドレス");
    });

    it("should return 400 for malformed JSON", async () => {
      const request = new NextRequest("http://localhost:3001/api/auth/sign-in/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "invalid json{",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toContain("リクエスト形式が不正");
    });
  });

  describe("Email Normalization", () => {
    it("should trim and lowercase email before lookup", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: "user-123",
        approvalStatus: USER_APPROVAL_STATUS.APPROVED,
        isActive: true,
      });
      (auth.handler as any).mockResolvedValue(new Response("OK"));

      const request = createRequest({
        email: "  TEST@EXAMPLE.COM  ",
        password: "Password123!",
      });

      await POST(request);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
        select: {
          id: true,
          approvalStatus: true,
          isActive: true,
        },
      });
    });
  });

  describe("Priority of Rejection Reasons", () => {
    it("should check isActive before approvalStatus", async () => {
      // ユーザーが非アクティブかつ承認待ちの場合
      (prisma.user.findUnique as any).mockResolvedValue({
        id: "user-123",
        approvalStatus: USER_APPROVAL_STATUS.PENDING,
        isActive: false,
      });

      const request = createRequest({
        email: "test@example.com",
        password: "Password123!",
      });

      const response = await POST(request);
      const data = await response.json();

      // ACCOUNT_DISABLED が優先されることを確認
      expect(data.code).toBe("ACCOUNT_DISABLED");
    });
  });
});

// EOF
