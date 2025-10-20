// auth-reset-password エンドポイントのユニットテスト。
import { NextRequest } from "next/server";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OPTIONS, POST } from "@/app/api/auth/reset-password/route";
import { auth } from "@/lib/auth";

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      resetPassword: vi.fn(),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

const resetPasswordMock = auth.api.resetPassword as unknown as Mock;

describe("UT-LIB-27: POST /api/auth/reset-password", () => {
  const createRequest = (
    body: Record<string, unknown>,
    token?: string,
    origin = "http://localhost:3000"
  ): NextRequest =>
    new NextRequest(
      `http://localhost:3001/api/auth/reset-password${token ? `?token=${token}` : ""}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: origin,
        },
        body: JSON.stringify(body),
      }
    );

  beforeEach(() => {
    vi.clearAllMocks();
    resetPasswordMock.mockReset();
    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_WEB_APP_URL", "http://localhost:3000");
  });

  it("should reset password when token is provided via query string", async () => {
    resetPasswordMock.mockResolvedValueOnce(undefined);

    const request = createRequest({ newPassword: "Password123!" }, "token-123");

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain("パスワードを更新しました");
    expect(resetPasswordMock).toHaveBeenCalledWith({
      body: {
        newPassword: "Password123!",
        token: "token-123",
      },
      query: { token: "token-123" },
      headers: request.headers,
    });
    expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
  });

  it("should return 400 when token is missing", async () => {
    const request = createRequest({ newPassword: "Password123!" });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toContain("トークンが無効");
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });

  it("should validate password length", async () => {
    const request = createRequest({ newPassword: "short" }, "token-123");

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toContain("8文字以上");
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });

  it("should validate password maximum length", async () => {
    const longPassword = "a".repeat(200);
    const request = createRequest({ newPassword: longPassword }, "token-123");

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toContain("長すぎます");
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });

  it("should accept token from request body when query param is missing", async () => {
    resetPasswordMock.mockResolvedValueOnce(undefined);

    const request = createRequest({ newPassword: "Password123!", token: "token-body" }, undefined);

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain("パスワードを更新しました");
    expect(resetPasswordMock).toHaveBeenCalledWith({
      body: {
        newPassword: "Password123!",
        token: "token-body",
      },
      query: { token: "token-body" },
      headers: request.headers,
    });
  });

  it("should convert Better Auth errors into friendly messages", async () => {
    resetPasswordMock.mockRejectedValueOnce(new Error("INVALID_TOKEN"));

    const request = createRequest({ newPassword: "Password123!" }, "token-999");

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toContain("トークンが無効");
    expect(resetPasswordMock).toHaveBeenCalled();
  });

  it("should map Better Auth PASSWORD_TOO_SHORT errors", async () => {
    resetPasswordMock.mockRejectedValueOnce(new Error("PASSWORD_TOO_SHORT"));

    const request = createRequest({ newPassword: "Password123!", token: "token-123" });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toContain("8文字以上");
  });

  it("should map Better Auth PASSWORD_TOO_LONG errors", async () => {
    resetPasswordMock.mockRejectedValueOnce(new Error("PASSWORD_TOO_LONG"));

    const request = createRequest({ newPassword: "Password123!", token: "token-123" });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toContain("長すぎます");
  });

  it("should handle non-error rejections gracefully", async () => {
    resetPasswordMock.mockRejectedValueOnce("unexpected failure");

    const request = createRequest({ newPassword: "Password123!", token: "token-123" });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe("パスワードの更新に失敗しました。");
  });

  it("should surface custom error messages when provided", async () => {
    resetPasswordMock.mockRejectedValueOnce(new Error("Custom failure message"));

    const request = createRequest({ newPassword: "Password123!", token: "token-123" });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe("Custom failure message");
  });

  it("should treat malformed JSON payload as empty object", async () => {
    const malformedRequest = new NextRequest("http://localhost:3001/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: "{invalid-json",
    });

    const response = await POST(malformedRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(typeof data.message).toBe("string");
    expect(data.message.length).toBeGreaterThan(0);
  });

  it("should respond to OPTIONS with CORS headers", () => {
    const response = OPTIONS(
      new NextRequest("http://localhost:3001/api/auth/reset-password", {
        method: "OPTIONS",
        headers: {
          Origin: "http://localhost:3000",
        },
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
    expect(response.headers.get("access-control-allow-methods")).toBe("POST, OPTIONS");
  });
});

// EOF
