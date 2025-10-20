// CORS ヘルパーのユニットテスト
import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildCorsHeaders, resolveAllowedOrigin } from "@/lib/api/cors";

const createRequest = (origin?: string) =>
  ({
    headers: new Headers(origin ? { Origin: origin } : undefined),
  }) as unknown as NextRequest;

describe("UT-LIB-28: CORS helpers", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should prioritize Origin header when determining allowed origin", () => {
    const request = createRequest("https://example.com");

    const origin = resolveAllowedOrigin(request);

    expect(origin).toBe("https://example.com");
  });

  it("should fall back to configured environment variables", () => {
    vi.unstubAllEnvs();
    vi.stubEnv("WEB_APP_URL", "https://web.example/");

    const origin = resolveAllowedOrigin();

    expect(origin).toBe("https://web.example");
  });

  it("should default to localhost when no origin is provided", () => {
    vi.stubEnv("WEB_APP_URL", "");
    vi.stubEnv("NEXT_PUBLIC_WEB_APP_URL", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    const origin = resolveAllowedOrigin();

    expect(origin).toBe("http://localhost:3000");
  });

  it("should treat literal 'null' string as undefined origin", () => {
    vi.stubEnv("WEB_APP_URL", "");
    vi.stubEnv("NEXT_PUBLIC_WEB_APP_URL", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    const origin = resolveAllowedOrigin(createRequest("null"));

    expect(origin).toBe("http://localhost:3000");
  });

  it("should sanitize invalid origins gracefully", () => {
    vi.unstubAllEnvs();
    vi.stubEnv("WEB_APP_URL", "not a url");
    vi.stubEnv("NEXT_PUBLIC_WEB_APP_URL", "https://docs.example");

    const request = createRequest("invalid-url");

    const headers = buildCorsHeaders(request);

    expect(headers["Access-Control-Allow-Origin"]).toBe("https://docs.example");
    expect(headers["Access-Control-Allow-Methods"]).toBe("POST, OPTIONS");
    expect(headers["Access-Control-Allow-Headers"]).toBe("Content-Type");
    expect(headers["Access-Control-Allow-Credentials"]).toBe("true");
  });
});

// EOF
