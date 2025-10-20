/**
 * `lib/auth-server.ts` の単体テスト。
 * セッション取得・ロール判定・組織アクセス制御を検証する。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { testUsers } from "../../e2e/fixtures/users";
import { getPrismaMock, resetPrismaMock } from "../../helpers/prisma-mock";

// 依存モジュールをモック化する
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({
  default: getPrismaMock(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

const buildUser = (overrides: { id: string; email: string; name: string; role: string }) => ({
  createdAt: new Date(),
  updatedAt: new Date(),
  emailVerified: true,
  image: null,
  ...overrides,
});

const buildSession = (overrides: { id: string; userId: string }) => ({
  createdAt: new Date(),
  updatedAt: new Date(),
  token: `${overrides.id}-token`,
  ipAddress: null,
  userAgent: "vitest",
  activeOrganizationId: null,
  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  ...overrides,
});

describe("lib/auth-server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPrismaMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getSession", () => {
    it("should return null when no session exists", async () => {
      const { auth } = await import("@/lib/auth");
      vi.mocked(auth.api.getSession).mockResolvedValue(null);

      const { getSession } = await import("@/lib/auth-server");
      const session = await getSession();

      expect(session).toBeNull();
      expect(auth.api.getSession).toHaveBeenCalled();
    });

    it("should return session data when authenticated", async () => {
      const mockSessionData = {
        user: buildUser({
          id: testUsers.member.id,
          email: testUsers.member.email,
          name: testUsers.member.name,
          role: testUsers.member.role,
        }),
        session: buildSession({ id: "session-123", userId: testUsers.member.id }),
      };

      const { auth } = await import("@/lib/auth");
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSessionData);

      const { getSession } = await import("@/lib/auth-server");
      const session = await getSession();

      expect(session).toEqual({
        user: mockSessionData.user,
        session: mockSessionData.session,
      });
    });
  });

  describe("requireSession", () => {
    it("should redirect to /login when no session exists", async () => {
      const { auth } = await import("@/lib/auth");
      vi.mocked(auth.api.getSession).mockResolvedValue(null);

      const { requireSession } = await import("@/lib/auth-server");

      await expect(requireSession()).rejects.toThrow("REDIRECT:/login");
    });

    it("should return session when authenticated", async () => {
      const mockSessionData = {
        user: buildUser({
          id: testUsers.admin.id,
          email: testUsers.admin.email,
          name: testUsers.admin.name,
          role: testUsers.admin.role,
        }),
        session: buildSession({ id: "session-456", userId: testUsers.admin.id }),
      };

      const { auth } = await import("@/lib/auth");
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSessionData);

      const { requireSession } = await import("@/lib/auth-server");
      const session = await requireSession();

      expect(session).toEqual({
        user: mockSessionData.user,
        session: mockSessionData.session,
      });
    });
  });

  describe("hasRole", () => {
    it("should return false when userRole is null", async () => {
      const { hasRole } = await import("@/lib/auth-server");
      expect(hasRole(null, ["admin"])).toBe(false);
    });

    it("should return false when userRole is undefined", async () => {
      const { hasRole } = await import("@/lib/auth-server");
      expect(hasRole(undefined, ["admin"])).toBe(false);
    });

    it("should return false when role is not in allowed list", async () => {
      const { hasRole } = await import("@/lib/auth-server");
      expect(hasRole("_member", ["admin", "org_admin"])).toBe(false);
    });

    it("should return true when role is in allowed list", async () => {
      const { hasRole } = await import("@/lib/auth-server");
      expect(hasRole("admin", ["admin", "org_admin"])).toBe(true);
      expect(hasRole("org_admin", ["admin", "org_admin"])).toBe(true);
      expect(hasRole("_member", ["_member"])).toBe(true);
    });
  });

  describe("assertRole", () => {
    it("should redirect to / when session is null", async () => {
      const { assertRole } = await import("@/lib/auth-server");

      expect(() => assertRole(null, ["admin"])).toThrow("REDIRECT:/");
    });

    it("should redirect to / when user lacks required role", async () => {
      const session = {
        user: buildUser({
          id: testUsers.member.id,
          email: testUsers.member.email,
          name: testUsers.member.name,
          role: testUsers.member.role,
        }),
        session: buildSession({ id: "session-789", userId: testUsers.member.id }),
      };

      const { assertRole } = await import("@/lib/auth-server");

      expect(() => assertRole(session, ["admin"])).toThrow("REDIRECT:/");
    });

    it("should not throw when user has required role", async () => {
      const session = {
        user: buildUser({
          id: testUsers.admin.id,
          email: testUsers.admin.email,
          name: testUsers.admin.name,
          role: testUsers.admin.role,
        }),
        session: buildSession({ id: "session-999", userId: testUsers.admin.id }),
      };

      const { assertRole } = await import("@/lib/auth-server");

      expect(() => assertRole(session, ["admin", "org_admin"])).not.toThrow();
    });
  });

  describe("getAccessibleOrganizationIds", () => {
    it("should return all organizations for admin users", async () => {
      const prismaMock = getPrismaMock();
      prismaMock.organization.findMany.mockResolvedValue([
        {
          id: "org-1",
          name: "Org 1",
          slug: "org-1",
          metadata: null,
          createdAt: new Date(),
        },
        {
          id: "org-2",
          name: "Org 2",
          slug: "org-2",
          metadata: null,
          createdAt: new Date(),
        },
        {
          id: "org-3",
          name: "Org 3",
          slug: "org-3",
          metadata: null,
          createdAt: new Date(),
        },
      ]);

      const { getAccessibleOrganizationIds } = await import("@/lib/auth-server");
      const orgIds = await getAccessibleOrganizationIds(testUsers.admin.id, "admin");

      expect(orgIds).toEqual(["org-1", "org-2", "org-3"]);
      expect(prismaMock.organization.findMany).toHaveBeenCalledWith({
        select: { id: true },
      });
    });

    it("should return only member organizations for non-admin users", async () => {
      const prismaMock = getPrismaMock();
      prismaMock.member.findMany.mockResolvedValue([
        {
          id: "member-1",
          userId: testUsers.member.id,
          organizationId: "org-1",
          role: "_member",
          createdAt: new Date(),
        },
        {
          id: "member-2",
          userId: testUsers.member.id,
          organizationId: "org-2",
          role: "_member",
          createdAt: new Date(),
        },
      ]);

      const { getAccessibleOrganizationIds } = await import("@/lib/auth-server");
      const orgIds = await getAccessibleOrganizationIds(testUsers.member.id, "_member");

      expect(orgIds).toEqual(["org-1", "org-2"]);
      expect(prismaMock.member.findMany).toHaveBeenCalledWith({
        where: { userId: testUsers.member.id },
        select: { organizationId: true },
      });
    });

    it("should return empty array when user has no memberships", async () => {
      const prismaMock = getPrismaMock();
      prismaMock.member.findMany.mockResolvedValue([]);

      const { getAccessibleOrganizationIds } = await import("@/lib/auth-server");
      const orgIds = await getAccessibleOrganizationIds(testUsers.regularUser.id, "user");

      expect(orgIds).toEqual([]);
    });
  });
});

// EOF
