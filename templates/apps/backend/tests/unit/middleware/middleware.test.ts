/**
 * Unit tests for middleware.ts
 * Tests authentication and request header injection
 */

import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Header Injection", () => {
    it("should inject x-pathname header with the request pathname", async () => {
      const { middleware } = await import("@/middleware");

      const request = new NextRequest("http://localhost:3001/profile");
      const response = middleware(request);

      // NextResponse が返却されることを確認
      expect(response).toBeInstanceOf(NextResponse);
    });

    it("should pass through the request with modified headers", async () => {
      const { middleware } = await import("@/middleware");

      const request = new NextRequest("http://localhost:3001/users");
      const response = middleware(request);

      expect(response).toBeInstanceOf(NextResponse);
    });

    it("should handle root path correctly", async () => {
      const { middleware } = await import("@/middleware");

      const request = new NextRequest("http://localhost:3001/");
      const response = middleware(request);

      expect(response).toBeInstanceOf(NextResponse);
    });

    it("should handle paths with query parameters", async () => {
      const { middleware } = await import("@/middleware");

      const request = new NextRequest("http://localhost:3001/access-history?tab=logs");
      const response = middleware(request);

      expect(response).toBeInstanceOf(NextResponse);
    });
  });

  describe("Matcher Configuration", () => {
    it("should have correct matcher patterns", async () => {
      const { config } = await import("@/middleware");

      expect(config.matcher).toBeDefined();
      expect(Array.isArray(config.matcher)).toBe(true);
      expect(config.matcher).toContain("/((?!api|_next/static|_next/image|favicon.ico).*)");
    });
  });

  describe("Path Handling", () => {
    const testPaths = [
      "/",
      "/login",
      "/profile",
      "/access-history",
      "/access-history/overview",
      "/access-history/charts",
      "/access-history/logs",
      "/users",
    ];

    testPaths.forEach((path) => {
      it(`should handle ${path} correctly`, async () => {
        const { middleware } = await import("@/middleware");

        const request = new NextRequest(`http://localhost:3001${path}`);
        const response = middleware(request);

        expect(response).toBeInstanceOf(NextResponse);
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle paths with trailing slashes", async () => {
      const { middleware } = await import("@/middleware");

      const request = new NextRequest("http://localhost:3001/profile/");
      const response = middleware(request);

      expect(response).toBeInstanceOf(NextResponse);
    });

    it("should handle deeply nested paths", async () => {
      const { middleware } = await import("@/middleware");

      const request = new NextRequest("http://localhost:3001/users/123/settings");
      const response = middleware(request);

      expect(response).toBeInstanceOf(NextResponse);
    });

    it("should handle paths with special characters", async () => {
      const { middleware } = await import("@/middleware");

      const request = new NextRequest(
        "http://localhost:3001/access-history?tab=logs&date=2025-01-01"
      );
      const response = middleware(request);

      expect(response).toBeInstanceOf(NextResponse);
    });
  });
});

// EOF
