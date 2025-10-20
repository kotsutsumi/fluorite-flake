/**
 * E2E データの投入やテスト内での再利用に用いる共通テストフィクスチャ。
 * Playwright のフィクスチャ構造に合わせた形で定義している。
 */
export const testUsers = {
  admin: {
    id: "test-admin-id",
    email: "admin@test.com",
    name: "Test Admin",
    role: "admin",
    password: "Admin123!@#",
  },
  orgAdmin: {
    id: "test-org-admin-id",
    email: "org-admin@test.com",
    name: "Test Org Admin",
    role: "org_admin",
    password: "OrgAdmin123!@#",
  },
  member: {
    id: "test-member-id",
    email: "member@test.com",
    name: "Test Member",
    role: "_member",
    password: "Member123!@#",
  },
  regularUser: {
    id: "test-user-id",
    email: "user@test.com",
    name: "Test User",
    role: "user",
    password: "User123!@#",
  },
} as const;

export const testOrganizations = {
  org1: {
    id: "test-org-1-id",
    name: "Test Organization 1",
    slug: "test-org-1",
  },
  org2: {
    id: "test-org-2-id",
    name: "Test Organization 2",
    slug: "test-org-2",
  },
} as const;

export const testMembers = [
  {
    userId: testUsers.orgAdmin.id,
    organizationId: testOrganizations.org1.id,
    role: "org_admin",
  },
  {
    userId: testUsers.member.id,
    organizationId: testOrganizations.org1.id,
    role: "_member",
  },
  {
    userId: testUsers.regularUser.id,
    organizationId: testOrganizations.org2.id,
    role: "user",
  },
] as const;

export const testAccessLogs = [
  {
    id: "log-1",
    userId: testUsers.admin.id,
    sessionId: "session-1",
    deviceId: "device-1",
    ipAddress: "127.0.0.1",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    method: "GET",
    path: "/users",
    statusCode: 200,
    responseTime: 45,
    platform: "web",
    createdAt: new Date("2025-01-15T10:00:00Z"),
  },
  {
    id: "log-2",
    userId: testUsers.member.id,
    sessionId: "session-2",
    deviceId: "device-2",
    ipAddress: "127.0.0.2",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
    method: "GET",
    path: "/profile",
    statusCode: 200,
    responseTime: 32,
    platform: "ios",
    createdAt: new Date("2025-01-15T11:00:00Z"),
  },
  {
    id: "log-3",
    userId: testUsers.regularUser.id,
    sessionId: "session-3",
    deviceId: "device-3",
    ipAddress: "127.0.0.3",
    userAgent: "Mozilla/5.0 (Linux; Android 11)",
    method: "GET",
    path: "/access-history",
    statusCode: 200,
    responseTime: 28,
    platform: "android",
    createdAt: new Date("2025-01-15T12:00:00Z"),
  },
  {
    id: "log-4",
    userId: testUsers.admin.id,
    sessionId: "session-4",
    deviceId: "device-1",
    ipAddress: "127.0.0.1",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    method: "GET",
    path: "/api/users",
    statusCode: 200,
    responseTime: 55,
    platform: "web",
    createdAt: new Date("2025-01-15T13:00:00Z"),
  },
  {
    id: "log-5",
    userId: testUsers.member.id,
    sessionId: "session-5",
    deviceId: "device-2",
    ipAddress: "127.0.0.2",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
    method: "POST",
    path: "/api/access-log",
    statusCode: 201,
    responseTime: 18,
    platform: "ios",
    createdAt: new Date("2025-01-15T14:00:00Z"),
  },
] as const;

export const testDevices = [
  {
    deviceId: "device-1",
    platform: "web" as const,
    deviceModel: "Desktop",
    appVersion: "1.0.0",
    userId: testUsers.admin.id,
  },
  {
    deviceId: "device-2",
    platform: "ios" as const,
    deviceModel: "iPhone 12",
    appVersion: "1.0.0",
    userId: testUsers.member.id,
  },
  {
    deviceId: "device-3",
    platform: "android" as const,
    deviceModel: "Pixel 5",
    appVersion: "1.0.0",
    userId: testUsers.regularUser.id,
  },
] as const;

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const MS_PER_DAY = MS_PER_SECOND * SECONDS_PER_MINUTE * MINUTES_PER_HOUR * HOURS_PER_DAY;
const SESSION_EXPIRY = () => new Date(Date.now() + MS_PER_DAY);

export const testSessions = [
  {
    id: "session-1",
    userId: testUsers.admin.id,
    token: "session-token-1",
    expiresAt: SESSION_EXPIRY(),
  },
  {
    id: "session-2",
    userId: testUsers.member.id,
    token: "session-token-2",
    expiresAt: SESSION_EXPIRY(),
  },
  {
    id: "session-3",
    userId: testUsers.regularUser.id,
    token: "session-token-3",
    expiresAt: SESSION_EXPIRY(),
  },
  {
    id: "session-4",
    userId: testUsers.admin.id,
    token: "session-token-4",
    expiresAt: SESSION_EXPIRY(),
  },
  {
    id: "session-5",
    userId: testUsers.member.id,
    token: "session-token-5",
    expiresAt: SESSION_EXPIRY(),
  },
] as const;

export const testUserEmails = Object.values(testUsers).map((user) => user.email);
export const testOrganizationIds = Object.values(testOrganizations).map((org) => org.id);
export const testOrganizationSlugs = Object.values(testOrganizations).map((org) => org.slug);

// EOF
