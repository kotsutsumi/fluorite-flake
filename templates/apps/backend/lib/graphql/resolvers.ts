// GraphQL API のスキーマで利用するリゾルバ群を定義する。
import { verifyPassword } from "better-auth/crypto";
import { GraphQLError, GraphQLScalarType, Kind } from "graphql";
import { AccessLogger } from "@/lib/access-logger";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { APP_ROLES, type AppRole, ROLE_PERMISSIONS } from "@/lib/roles";
import { USER_APPROVAL_STATUS } from "@/lib/user-approval";
import { registerUserWithEmail } from "@/lib/user-registration";

// DateTime 型のカスタムスカラー定義
const DateTimeScalar = new GraphQLScalarType({
  name: "DateTime",
  description: "Date custom scalar type",
  serialize(value: unknown) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    throw new Error("GraphQL Date Scalar serializer expected a `Date` object");
  },
  parseValue(value: unknown) {
    if (typeof value === "string") {
      return new Date(value);
    }
    throw new Error("GraphQL Date Scalar parser expected a `string`");
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    throw new Error("GraphQL Date Scalar parser expected a `string`");
  },
});

type Context = {
  req: Request;
  user?: {
    id: string;
    email: string;
    name?: string;
    role: string;
    organizationId?: string;
  };
  session?: {
    id: string;
    token: string;
    expiresAt: Date;
  };
};

type DeviceInfo = {
  osVersion?: string;
  appVersion?: string;
  deviceModel?: string;
  deviceName?: string;
  pushToken?: string;
  timezone?: string;
  locale?: string;
  metadata?: Record<string, unknown>;
};

type AccessLogInput = {
  method: string;
  path: string;
  query?: string;
  statusCode?: number;
  responseTime?: number;
  referrer?: string;
  platform?: string;
  appVersion?: string;
  deviceId?: string;
};

const MAX_QUERY_LIMIT = 100;
const RECENT_ACTIVITY_LIMIT = 10;
const PLATFORM_PERCENTAGE_FACTOR = 100;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_WEEK = 7;
const HOURS_LOOKBACK = 24;
const MILLISECONDS_PER_SECOND = 1000;
const WEEK_IN_MILLISECONDS =
  DAYS_PER_WEEK * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

type UserUpdateData = {
  role: AppRole;
  MemberId?: string | null;
  memberSince?: Date | null;
};

// ユーザーが権限を持つか確認するヘルパー
function hasPermission(
  user: Context["user"],
  permission: keyof (typeof ROLE_PERMISSIONS)[keyof typeof ROLE_PERMISSIONS]
): boolean {
  if (!user) {
    return false;
  }
  const rolePermissions = ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS];
  if (!rolePermissions) {
    return false;
  }
  return rolePermissions[permission] === true;
}

// 認証済みであることを保証するヘルパー
function requireAuth(
  context: Context
): asserts context is Context & { user: NonNullable<Context["user"]> } {
  if (!context.user) {
    throw new GraphQLError("Not authenticated", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }
}

// 特定の権限を要求するヘルパー
function requirePermission(
  context: Context,
  permission: keyof (typeof ROLE_PERMISSIONS)[keyof typeof ROLE_PERMISSIONS]
) {
  requireAuth(context);
  if (!hasPermission(context.user, permission)) {
    throw new GraphQLError("Insufficient permissions", {
      extensions: { code: "FORBIDDEN" },
    });
  }
}

export const resolvers = {
  DateTime: DateTimeScalar,

  Query: {
    me: async (_: unknown, __: unknown, context: Context) => {
      if (!context.user) {
        throw new GraphQLError("Not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      return await prisma.user.findUnique({
        where: { id: context.user.id },
      });
    },

    myDevices: async (_: unknown, __: unknown, context: Context) => {
      if (!context.user) {
        throw new GraphQLError("Not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      return await prisma.deviceInfo.findMany({
        where: { userId: context.user.id },
        orderBy: { lastSeenAt: "desc" },
      });
    },

    accessLogs: async (
      _: unknown,
      args: {
        limit?: number;
        offset?: number;
        platform?: string;
        userId?: string;
        startDate?: Date;
        endDate?: Date;
      },
      context: Context
    ) => {
      if (!context.user) {
        throw new GraphQLError("Not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      // アクセスログを閲覧できるのは admin と org_admin のみ
      if (context.user.role !== "admin" && context.user.role !== "org_admin") {
        throw new GraphQLError("Insufficient permissions", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      const { limit = 50, offset = 0, platform, userId, startDate, endDate } = args;

      type AccessLogWhere = {
        platform?: string;
        userId?: string;
        organizationId?: string;
        createdAt?: {
          gte?: Date;
          lte?: Date;
        };
      };

      const where: AccessLogWhere = {};

      if (platform) {
        where.platform = platform;
      }

      if (userId) {
        where.userId = userId;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = startDate;
        }
        if (endDate) {
          where.createdAt.lte = endDate;
        }
      }

      // org_admin には所属組織のログのみ表示する
      if (context.user.role === "org_admin" && context.user.organizationId) {
        where.organizationId = context.user.organizationId;
      }

      const [logs, totalCount] = await Promise.all([
        prisma.accessLog.findMany({
          where,
          include: {
            user: true,
            device: true,
          },
          orderBy: { createdAt: "desc" },
          take: Math.min(limit, MAX_QUERY_LIMIT),
          skip: offset,
        }),
        prisma.accessLog.count({ where }),
      ]);

      return {
        logs,
        totalCount,
        hasNextPage: offset + limit < totalCount,
      };
    },

    accessStats: async (_: unknown, __: unknown, context: Context) => {
      if (!context.user) {
        throw new GraphQLError("Not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      if (context.user.role !== "admin" && context.user.role !== "org_admin") {
        throw new GraphQLError("Insufficient permissions", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      type StatsWhere = {
        organizationId?: string;
      };

      const whereClause: StatsWhere = {};

      // org_admin には所属組織の統計のみ表示する
      if (context.user.role === "org_admin" && context.user.organizationId) {
        whereClause.organizationId = context.user.organizationId;
      }

      const [
        totalAccesses,
        uniqueUsers,
        uniqueDevices,
        platformStats,
        recentActivity,
        hourlyStats,
      ] = await Promise.all([
        prisma.accessLog.count({ where: whereClause }),
        prisma.accessLog
          .groupBy({
            by: ["userId"],
            where: { ...whereClause, userId: { not: null } },
            _count: true,
          })
          .then((result) => result.length),
        prisma.accessLog
          .groupBy({
            by: ["deviceId"],
            where: { ...whereClause, deviceId: { not: null } },
            _count: true,
          })
          .then((result) => result.length),
        prisma.accessLog.groupBy({
          by: ["platform"],
          where: { ...whereClause, platform: { not: null } },
          _count: { platform: true },
        }),
        prisma.accessLog.findMany({
          where: whereClause,
          include: { user: true, device: true },
          orderBy: { createdAt: "desc" },
          take: RECENT_ACTIVITY_LIMIT,
        }),
        prisma.$queryRaw<{ hour: number; count: number }[]>`
                    SELECT
                        CAST(strftime('%H', createdAt) AS INTEGER) as hour,
                        COUNT(*) as count
                    FROM AccessLog
                    WHERE createdAt >= datetime('now', '-${HOURS_LOOKBACK} hours')
                    ${
                      context.user.role === "org_admin" && context.user.organizationId
                        ? prisma.$queryRaw`AND organizationId = ${context.user.organizationId}`
                        : prisma.$queryRaw``
                    }
                    GROUP BY hour
                    ORDER BY hour
                `,
      ]);

      const totalPlatformCount = platformStats.reduce((sum, stat) => sum + stat._count.platform, 0);

      const topPlatforms = platformStats.map((stat) => ({
        platform: stat.platform || "unknown",
        count: stat._count.platform,
        percentage:
          totalPlatformCount > 0
            ? (stat._count.platform / totalPlatformCount) * PLATFORM_PERCENTAGE_FACTOR
            : 0,
      }));

      return {
        totalAccesses,
        uniqueUsers,
        uniqueDevices,
        topPlatforms,
        recentActivity,
        hourlyStats,
      };
    },
    // メンバー管理のクエリ (管理者限定)
    Members: async (_: unknown, args: { limit?: number; offset?: number }, context: Context) => {
      requirePermission(context, "canManageMembers");

      const { limit = 50, offset = 0 } = args;

      return await prisma.user.findMany({
        where: {
          role: APP_ROLES._MEMBER,
          isActive: true,
        },
        orderBy: { memberSince: "desc" },
        take: Math.min(limit, MAX_QUERY_LIMIT),
        skip: offset,
      });
    },
  },

  User: {
    memberships: async (parent: { id: string }) => {
      const memberships = await prisma.member.findMany({
        where: { userId: parent.id },
        include: { organization: true },
      });

      return memberships.map((membership) => ({
        id: membership.id,
        role: membership.role,
        organization: membership.organization
          ? {
              id: membership.organization.id,
              name: membership.organization.name,
            }
          : null,
      }));
    },
  },

  Mutation: {
    login: async (
      _: unknown,
      args: {
        input: {
          email: string;
          password: string;
          deviceId?: string;
          platform?: string;
          deviceInfo?: DeviceInfo;
        };
      },
      context: Context
    ) => {
      const { email, password, deviceId, platform, deviceInfo } = args.input;

      // メールアドレスでユーザーを検索する
      const user = await prisma.user.findUnique({
        where: { email },
        include: { accounts: true },
      });

      if (!user) {
        throw new GraphQLError("Invalid credentials", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      if (!user.isActive) {
        throw new GraphQLError("Account disabled", {
          extensions: { code: "ACCOUNT_DISABLED" },
        });
      }

      if (user.approvalStatus === USER_APPROVAL_STATUS.PENDING) {
        throw new GraphQLError("Awaiting approval", {
          extensions: { code: "PENDING_APPROVAL" },
        });
      }

      if (user.approvalStatus === USER_APPROVAL_STATUS.REJECTED) {
        throw new GraphQLError("Access denied", {
          extensions: { code: "ACCOUNT_REJECTED" },
        });
      }

      // BetterAuth のハッシュでパスワードを検証する
      const account = user.accounts.find((acc) => acc.providerId === "credential");
      if (!account?.password) {
        throw new GraphQLError("Invalid credentials", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      const isValid = await verifyPassword({ hash: account.password, password });
      if (!isValid) {
        throw new GraphQLError("Invalid credentials", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      // BetterAuth を使ってセッションを生成する
      const sessionResult = await auth.api.signInEmail({
        body: { email, password },
        // BetterAuth には Headers 型が必要だが Next.js の Headers と見なされている
        headers: context.req.headers,
      });

      if (!sessionResult) {
        throw new GraphQLError("Failed to create session", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      let expiresAt = new Date(Date.now() + WEEK_IN_MILLISECONDS);

      if (sessionResult.token) {
        const sessionRecord = await prisma.session.findUnique({
          where: { token: sessionResult.token },
          select: { expiresAt: true },
        });

        if (sessionRecord?.expiresAt) {
          expiresAt = sessionRecord.expiresAt;
        }
      }

      // デバイス情報があれば登録する
      if (deviceId && platform && deviceInfo) {
        await AccessLogger.registerOrUpdateDevice({
          deviceId,
          platform,
          userId: user.id,
          ...deviceInfo,
        });
      }

      // ログインアクセスを記録する
      await AccessLogger.logAccess({
        method: "POST",
        path: "/graphql/login",
        platform: platform || "unknown",
        userId: user.id,
        deviceId,
      });

      return {
        token: sessionResult.token,
        user,
        expiresAt,
      };
    },

    register: async (
      _: unknown,
      args: {
        input: {
          email: string;
          password: string;
          name?: string;
          deviceId?: string;
          platform?: string;
          deviceInfo?: DeviceInfo;
        };
      },
      context: Context
    ) => {
      const { email, password, name, deviceId, platform, deviceInfo } = args.input;

      let registration: Awaited<ReturnType<typeof registerUserWithEmail>>;

      try {
        registration = await registerUserWithEmail({
          email,
          password,
          name,
          headers: context.req.headers,
          autoCreateSession: true,
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes("登録済み")) {
          throw new GraphQLError("User already exists", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }

        throw error;
      }

      if (registration.status === "pending") {
        await AccessLogger.logAccess({
          method: "POST",
          path: "/graphql/register",
          platform: platform || "unknown",
          userId: registration.user.id,
          deviceId,
        });

        throw new GraphQLError("Registration pending approval", {
          extensions: { code: "PENDING_APPROVAL" },
        });
      }

      if (!registration.session?.token) {
        throw new GraphQLError("Failed to create session", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      const fullUser = await prisma.user.findUnique({
        where: { id: registration.user.id },
        include: {
          memberships: {
            include: {
              organization: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
        },
      });

      if (!fullUser) {
        throw new Error("User record missing after registration");
      }

      if (deviceId && platform && deviceInfo) {
        await AccessLogger.registerOrUpdateDevice({
          deviceId,
          platform,
          userId: fullUser.id,
          ...deviceInfo,
        });
      }

      await AccessLogger.logAccess({
        method: "POST",
        path: "/graphql/register",
        platform: platform || "unknown",
        userId: fullUser.id,
        deviceId,
      });

      let expiresAt = registration.session.expiresAt;

      if (!expiresAt) {
        const sessionRecord = await prisma.session.findUnique({
          where: { token: registration.session.token },
          select: { expiresAt: true },
        });
        expiresAt = sessionRecord?.expiresAt ?? undefined;
      }

      return {
        token: registration.session.token,
        user: fullUser,
        expiresAt: expiresAt ?? new Date(Date.now() + WEEK_IN_MILLISECONDS),
      };
    },

    logout: async (_: unknown, __: unknown, context: Context) => {
      if (!context.session) {
        return true;
      }

      await auth.api.signOut({
        // BetterAuth には Headers 型が必要だが Next.js の Headers と見なされている
        headers: context.req.headers,
      });

      return true;
    },

    registerDevice: async (
      _: unknown,
      args: {
        deviceInfo: DeviceInfo;
        deviceId: string;
        platform: string;
      },
      context: Context
    ) => {
      await AccessLogger.registerOrUpdateDevice({
        deviceId: args.deviceId,
        platform: args.platform,
        userId: context.user?.id,
        ...args.deviceInfo,
      });

      return await prisma.deviceInfo.findUnique({
        where: { deviceId: args.deviceId },
      });
    },

    updateDevice: async (
      _: unknown,
      args: {
        deviceId: string;
        deviceInfo: DeviceInfo;
      },
      context: Context
    ) => {
      const device = await prisma.deviceInfo.findUnique({
        where: { deviceId: args.deviceId },
      });

      if (!device) {
        throw new GraphQLError("Device not found", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      if (device.userId !== context.user?.id && context.user?.role !== "admin") {
        throw new GraphQLError("Not authorized to update this device", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      return await prisma.deviceInfo.update({
        where: { deviceId: args.deviceId },
        data: {
          ...args.deviceInfo,
          lastSeenAt: new Date(),
        },
      });
    },

    updatePushToken: async (
      _: unknown,
      args: {
        deviceId: string;
        pushToken: string;
      },
      _context: Context
    ) =>
      await prisma.deviceInfo.update({
        where: { deviceId: args.deviceId },
        data: {
          pushToken: args.pushToken,
          lastSeenAt: new Date(),
        },
      }),

    logAccess: async (_: unknown, args: { input: AccessLogInput }, context: Context) => {
      await AccessLogger.logAccess({
        ...args.input,
        userId: context.user?.id,
        sessionId: context.session?.id,
      });

      return true;
    },

    // メンバー管理のミューテーション (管理者限定)
    assignMember: async (
      _: unknown,
      args: { input: { userId: string; MemberId: string; memberSince?: Date } },
      context: Context
    ) => {
      requirePermission(context, "canManageMembers");

      const { userId, MemberId, memberSince } = args.input;

      // メンバー ID が既に割り当てられていないか確認する
      const existingMember = await prisma.user.findUnique({
        where: { MemberId },
      });

      if (existingMember && existingMember.id !== userId) {
        throw new GraphQLError(" Member ID already assigned to another user", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      return await prisma.user.update({
        where: { id: userId },
        data: {
          role: APP_ROLES._MEMBER,
          MemberId,
          memberSince: memberSince || new Date(),
        },
      });
    },

    updateUserRole: async (
      _: unknown,
      args: { input: { userId: string; role: string; MemberId?: string } },
      context: Context
    ) => {
      requirePermission(context, "canManageUsers");

      const { userId, role, MemberId } = args.input;

      const roleKey = role.toUpperCase?.() as keyof typeof APP_ROLES | undefined;
      const normalizedRole =
        (roleKey && APP_ROLES[roleKey]) || (role.toLowerCase?.() as AppRole | undefined);

      if (!(normalizedRole && Object.values(APP_ROLES).includes(normalizedRole))) {
        throw new GraphQLError("Invalid role", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      const updateData: UserUpdateData = { role: normalizedRole };

      if (normalizedRole === APP_ROLES._MEMBER && MemberId) {
        updateData.MemberId = MemberId;
        updateData.memberSince = new Date();
      }

      if (normalizedRole === APP_ROLES.USER) {
        updateData.MemberId = null;
        updateData.memberSince = null;
      }

      return await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });
    },

    deactivateUser: async (_: unknown, args: { userId: string }, context: Context) => {
      requirePermission(context, "canManageUsers");

      return await prisma.user.update({
        where: { id: args.userId },
        data: { isActive: false },
      });
    },

    reactivateUser: async (_: unknown, args: { userId: string }, context: Context) => {
      requirePermission(context, "canManageUsers");

      return await prisma.user.update({
        where: { id: args.userId },
        data: { isActive: true },
      });
    },
  },
};

// ファイル終端

// EOF
