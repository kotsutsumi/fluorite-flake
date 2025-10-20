/**
 * Unit tests for app/api/access-log/route.ts
 * Tests access log API endpoints (POST and GET)
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { testAccessLogs, testDevices } from "../../e2e/fixtures/access-logs";
import { testUsers } from "../../e2e/fixtures/users";
import { getPrismaMock, resetPrismaMock } from "../../helpers/prisma-mock";

// 依存モジュールをモック化する
vi.mock("@/lib/access-logger", () => ({
  AccessLogger: {
    logAccess: vi.fn(),
    registerOrUpdateDevice: vi.fn(),
    getClientIP: vi.fn(() => "127.0.0.1"),
  },
}));

vi.mock("@/lib/auth-server", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  default: getPrismaMock(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

const createMockUser = (overrides: {
  id: string;
  email: string;
  name?: string | null;
  role: string;
}) => ({
  createdAt: new Date(),
  updatedAt: new Date(),
  emailVerified: true,
  image: null,
  ...overrides,
  name: overrides.name ?? "",
});

const createMockSession = (overrides: { id?: string; userId: string }) => ({
  id: overrides.id ?? "session-id",
  token: `${overrides.userId}-token`,
  userId: overrides.userId,
  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  createdAt: new Date(),
  updatedAt: new Date(),
  ipAddress: null,
  userAgent: "vitest",
});

describe("app/api/access-log/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPrismaMock();
  });

  describe("POST /api/access-log", () => {
    it("should register device successfully", async () => {
      const { AccessLogger } = await import("@/lib/access-logger");
      const { getSession } = await import("@/lib/auth-server");

      vi.mocked(getSession).mockResolvedValue({
        user: createMockUser({
          id: testUsers.member.id,
          email: testUsers.member.email,
          name: testUsers.member.name,
          role: testUsers.member.role,
        }),
        session: createMockSession({ id: "session-123", userId: testUsers.member.id }),
      });

      vi.mocked(AccessLogger.registerOrUpdateDevice).mockResolvedValue(undefined);

      const { POST } = await import("@/app/api/access-log/route");

      const request = new NextRequest("http://localhost:3001/api/access-log", {
        method: "POST",
        body: JSON.stringify({
          type: "device-register",
          device: {
            deviceId: testDevices[0].deviceId,
            platform: testDevices[0].platform,
            deviceModel: testDevices[0].deviceModel,
            appVersion: testDevices[0].appVersion,
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Device registered successfully");
      expect(AccessLogger.registerOrUpdateDevice).toHaveBeenCalled();
    });

    it("should log access successfully", async () => {
      const { AccessLogger } = await import("@/lib/access-logger");
      const { getSession } = await import("@/lib/auth-server");

      vi.mocked(getSession).mockResolvedValue({
        user: createMockUser({
          id: testUsers.admin.id,
          email: testUsers.admin.email,
          name: testUsers.admin.name,
          role: testUsers.admin.role,
        }),
        session: createMockSession({ id: "session-456", userId: testUsers.admin.id }),
      });

      vi.mocked(AccessLogger.logAccess).mockResolvedValue(undefined);

      const { POST } = await import("@/app/api/access-log/route");

      const request = new NextRequest("http://localhost:3001/api/access-log", {
        method: "POST",
        headers: {
          "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        },
        body: JSON.stringify({
          type: "access-log",
          log: {
            method: "GET",
            path: "/users",
            statusCode: 200,
            responseTime: 45,
            platform: "web",
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Access logged successfully");
      expect(AccessLogger.logAccess).toHaveBeenCalled();
    });

    it("should return 400 for invalid request type", async () => {
      const { POST } = await import("@/app/api/access-log/route");

      const request = new NextRequest("http://localhost:3001/api/access-log", {
        method: "POST",
        body: JSON.stringify({
          type: "invalid-type",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid request type");
    });

    it("should return 500 on processing error", async () => {
      const { POST } = await import("@/app/api/access-log/route");

      const request = new NextRequest("http://localhost:3001/api/access-log", {
        method: "POST",
        body: "invalid-json",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to process access log");
    });
  });

  describe("GET /api/access-log", () => {
    it("should return 401 when not authenticated", async () => {
      const { getSession } = await import("@/lib/auth-server");
      vi.mocked(getSession).mockResolvedValue(null);

      const { GET } = await import("@/app/api/access-log/route");

      const request = new NextRequest("http://localhost:3001/api/access-log");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not admin or org_admin", async () => {
      const { getSession } = await import("@/lib/auth-server");
      vi.mocked(getSession).mockResolvedValue({
        user: createMockUser({
          id: testUsers.member.id,
          email: testUsers.member.email,
          name: testUsers.member.name,
          role: "member",
        }),
        session: createMockSession({ id: "session-789", userId: testUsers.member.id }),
      });

      const { GET } = await import("@/app/api/access-log/route");

      const request = new NextRequest("http://localhost:3001/api/access-log");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return access logs for admin users", async () => {
      const { getSession } = await import("@/lib/auth-server");
      const prismaMock = getPrismaMock();

      vi.mocked(getSession).mockResolvedValue({
        user: createMockUser({
          id: testUsers.admin.id,
          email: testUsers.admin.email,
          name: testUsers.admin.name,
          role: "admin",
        }),
        session: createMockSession({ id: "session-admin", userId: testUsers.admin.id }),
      });

      const mockLogs = testAccessLogs.map((log) => ({
        ...log,
        user: {
          id: log.userId || "",
          email: "test@example.com",
          name: "Test User",
        },
        device: log.deviceId
          ? {
              deviceId: log.deviceId,
              platform: log.platform || "web",
              deviceModel: "Test Device",
              appVersion: "1.0.0",
            }
          : null,
      }));

      prismaMock.accessLog.findMany.mockResolvedValue(mockLogs as any);
      prismaMock.accessLog.count.mockResolvedValue(mockLogs.length);

      const { GET } = await import("@/app/api/access-log/route");

      const request = new NextRequest("http://localhost:3001/api/access-log?limit=50&offset=0");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.logs).toHaveLength(mockLogs.length);
      expect(data.pagination).toEqual({
        total: mockLogs.length,
        limit: 50,
        offset: 0,
        hasMore: false,
      });
    });

    it("should filter logs by platform", async () => {
      const { getSession } = await import("@/lib/auth-server");
      const prismaMock = getPrismaMock();

      vi.mocked(getSession).mockResolvedValue({
        user: createMockUser({
          id: testUsers.admin.id,
          email: testUsers.admin.email,
          name: testUsers.admin.name,
          role: "admin",
        }),
        session: createMockSession({ id: "session-admin", userId: testUsers.admin.id }),
      });

      const iosLogs = testAccessLogs.filter((log) => log.platform === "ios");
      prismaMock.accessLog.findMany.mockResolvedValue(iosLogs as any);
      prismaMock.accessLog.count.mockResolvedValue(iosLogs.length);

      const { GET } = await import("@/app/api/access-log/route");

      const request = new NextRequest(
        "http://localhost:3001/api/access-log?platform=ios&limit=50&offset=0"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prismaMock.accessLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ platform: "ios" }),
        })
      );
    });

    it("should filter logs by date range", async () => {
      const { getSession } = await import("@/lib/auth-server");
      const prismaMock = getPrismaMock();

      vi.mocked(getSession).mockResolvedValue({
        user: createMockUser({
          id: testUsers.admin.id,
          email: testUsers.admin.email,
          name: testUsers.admin.name,
          role: "admin",
        }),
        session: createMockSession({ id: "session-admin", userId: testUsers.admin.id }),
      });

      prismaMock.accessLog.findMany.mockResolvedValue([]);
      prismaMock.accessLog.count.mockResolvedValue(0);

      const { GET } = await import("@/app/api/access-log/route");

      const request = new NextRequest(
        "http://localhost:3001/api/access-log?startDate=2025-01-01&endDate=2025-01-31&limit=50&offset=0"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prismaMock.accessLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );
    });

    it("should handle pagination correctly", async () => {
      const { getSession } = await import("@/lib/auth-server");
      const prismaMock = getPrismaMock();

      vi.mocked(getSession).mockResolvedValue({
        user: createMockUser({
          id: testUsers.admin.id,
          email: testUsers.admin.email,
          name: testUsers.admin.name,
          role: "admin",
        }),
        session: createMockSession({ id: "session-admin", userId: testUsers.admin.id }),
      });

      prismaMock.accessLog.findMany.mockResolvedValue([]);
      prismaMock.accessLog.count.mockResolvedValue(150);

      const { GET } = await import("@/app/api/access-log/route");

      const request = new NextRequest("http://localhost:3001/api/access-log?limit=50&offset=50");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination).toEqual({
        total: 150,
        limit: 50,
        offset: 50,
        hasMore: true,
      });
      expect(prismaMock.accessLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 50,
        })
      );
    });
  });
});

// EOF
