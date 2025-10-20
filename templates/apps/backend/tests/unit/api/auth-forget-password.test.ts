// auth-forget-password エンドポイントのユニットテストを定義する。
import { NextRequest } from "next/server";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OPTIONS, POST } from "@/app/api/auth/forget-password/route";
import { auth } from "@/lib/auth";

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      forgetPassword: vi.fn(),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

const forgetPasswordMock = auth.api.forgetPassword as unknown as Mock;

describe("UT-LIB-26: POST /api/auth/forget-password", () => {
  const createRequest = (
    body: Record<string, unknown>,
    origin = "http://localhost:3000"
  ): NextRequest =>
    new NextRequest("http://localhost:3001/api/auth/forget-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
      },
      body: JSON.stringify(body),
    });

  beforeEach(() => {
    vi.clearAllMocks();
    forgetPasswordMock.mockReset();
    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_WEB_APP_URL", "http://localhost:3000");
  });

  it("should invoke Better Auth with redirect URL derived from Origin header", async () => {
    forgetPasswordMock.mockResolvedValueOnce(undefined);

    const request = createRequest({ email: "user@example.com" });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain("パスワードリセットリンク");
    expect(forgetPasswordMock).toHaveBeenCalledWith({
      body: {
        email: "user@example.com",
        redirectTo: "http://localhost:3000/reset-password",
      },
      headers: request.headers,
    });
    expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
  });

  it("should respect explicit AUTH_RESET_REDIRECT_URL when provided", async () => {
    forgetPasswordMock.mockResolvedValueOnce(undefined);
    vi.stubEnv("AUTH_RESET_REDIRECT_URL", "https://example.com/callback/");

    const request = createRequest({ email: "user@example.com" }, "https://foo.example");

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain("メールをご確認ください");
    expect(forgetPasswordMock).toHaveBeenCalledWith({
      body: {
        email: "user@example.com",
        redirectTo: "https://example.com/callback",
      },
      headers: request.headers,
    });
    expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
  });

  it("should fall back to WEB_APP_URL when present", async () => {
    forgetPasswordMock.mockResolvedValueOnce(undefined);
    vi.stubEnv("AUTH_RESET_REDIRECT_URL", "");
    vi.stubEnv("WEB_APP_URL", "https://primary.example/base/");
    vi.stubEnv("NEXT_PUBLIC_WEB_APP_URL", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    const request = createRequest({ email: "user@example.com" });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain("メールをご確認ください");
    expect(forgetPasswordMock).toHaveBeenCalledWith({
      body: {
        email: "user@example.com",
        redirectTo: "https://primary.example/base/reset-password",
      },
      headers: request.headers,
    });
  });

  it("should respond to OPTIONS with CORS headers", () => {
    const response = OPTIONS(createRequest({ email: "user@example.com" }));

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
    expect(response.headers.get("access-control-allow-methods")).toBe("POST, OPTIONS");
  });

  it("should derive redirect URL from request origin when env is unset", async () => {
    forgetPasswordMock.mockResolvedValueOnce(undefined);
    vi.stubEnv("AUTH_RESET_REDIRECT_URL", "");
    vi.stubEnv("WEB_APP_URL", "");
    vi.stubEnv("NEXT_PUBLIC_WEB_APP_URL", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    const request = createRequest({ email: "user@example.com" }, "https://client.example");

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain("メールをご確認ください");
    const [[call]] = forgetPasswordMock.mock.calls as [
      [
        {
          body: { email: string; redirectTo: string };
          headers: Headers;
        },
      ],
    ];
    expect(call.body.email).toBe("user@example.com");
    expect(call.body.redirectTo.endsWith("/reset-password")).toBe(true);
    expect(call.body.redirectTo.length).toBeGreaterThanOrEqual("/reset-password".length);
    expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
  });

  it("should return 400 when email is invalid", async () => {
    const request = createRequest({ email: "not-an-email" });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toContain("メールアドレス");
    expect(forgetPasswordMock).not.toHaveBeenCalled();
  });

  it("should map Better Auth errors to 400 responses", async () => {
    forgetPasswordMock.mockRejectedValueOnce(new Error("Reset password isn't enabled"));

    const request = createRequest({ email: "user@example.com" });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toContain("リセット");
    expect(forgetPasswordMock).toHaveBeenCalled();
  });
});

// EOF
