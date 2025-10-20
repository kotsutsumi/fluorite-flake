/**
 * Better Auth のセッション取得関数をテスト用にモック化するヘルパー。
 * - createMockSession: フィクスチャユーザーから疑似セッションを生成
 * - mockGetSession / mockRequireSession: AuthContext の関数を容易に置き換える
 */
import { vi } from "vitest";
import { testUsers } from "../e2e/fixtures/users";

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const HOURS_24_IN_MS = HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;

export type MockSession = {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
  };
} | null;

export function createMockSession(userType: keyof typeof testUsers = "member"): MockSession {
  const user = testUsers[userType];
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    session: {
      id: `session-${user.id}`,
      userId: user.id,
      expiresAt: new Date(Date.now() + HOURS_24_IN_MS), // 24時間後の有効期限
    },
  };
}

export function mockGetSession(session: MockSession = null) {
  return vi.fn(() => Promise.resolve(session));
}

export function mockRequireSession(session: MockSession = createMockSession()) {
  return vi.fn(() => {
    if (!session) {
      throw new Error("REDIRECT:/login");
    }
    return Promise.resolve(session);
  });
}

export function mockAuthModule(session: MockSession = createMockSession()) {
  return {
    getSession: mockGetSession(session),
    requireSession: mockRequireSession(session),
    hasRole: vi.fn((userRole: string | null | undefined, allowed: string[]) => {
      if (!userRole) {
        return false;
      }
      return allowed.includes(userRole);
    }),
    assertRole: vi.fn((sess: MockSession, allowed: string[]) => {
      if (!(sess?.user?.role && allowed.includes(sess.user.role))) {
        throw new Error("REDIRECT:/");
      }
    }),
    getAccessibleOrganizationIds: vi.fn((_userId: string, role: string) => {
      if (role === "admin") {
        return Promise.resolve(["org-1", "org-2", "org-3"]);
      }
      return Promise.resolve(["org-1"]);
    }),
  };
}

// EOF
