/**
 * アクセスログAPIエンドポイント
 * ユーザーアクセス履歴の記録・取得
 */
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { type AccessLogData, AccessLogger, type DeviceData } from "@/lib/access-logger";
import { getSession } from "@/lib/auth-server";
import prisma from "@/lib/db";
import { logger } from "@/lib/logger";

const accessLogSchema = z.object({
  method: z.string(),
  path: z.string(),
  query: z.string().optional(),
  statusCode: z.number().optional(),
  responseTime: z.number().optional(),
  referrer: z.string().optional(),
  platform: z.string().optional(),
  appVersion: z.string().optional(),
  deviceId: z.string().optional(),
});

const deviceRegisterSchema = z.object({
  deviceId: z.string(),
  platform: z.enum(["ios", "android", "web"]),
  osVersion: z.string().optional(),
  appVersion: z.string().optional(),
  deviceModel: z.string().optional(),
  deviceName: z.string().optional(),
  pushToken: z.string().optional(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const DEFAULT_ACCESS_LOG_LIMIT = 50;
const MAX_ACCESS_LOG_LIMIT = 100;
const DEFAULT_OFFSET = 0;
const BAD_REQUEST_STATUS = 400;
const UNAUTHORIZED_STATUS = 401;
const FORBIDDEN_STATUS = 403;
const INTERNAL_SERVER_ERROR_STATUS = 500;

type AccessLogFilters = {
  platform: string | null;
  userId: string | null;
  startDate: string | null;
  endDate: string | null;
};

type WhereClause = {
  platform?: string;
  userId?: string;
  createdAt?: {
    gte?: Date;
    lte?: Date;
  };
};

function parseAccessLogQuery(url: URL) {
  const limitParam = url.searchParams.get("limit");
  const requestedLimit = Number.parseInt(limitParam ?? `${DEFAULT_ACCESS_LOG_LIMIT}`, 10);
  const limit = Number.isNaN(requestedLimit)
    ? DEFAULT_ACCESS_LOG_LIMIT
    : Math.min(requestedLimit, MAX_ACCESS_LOG_LIMIT);

  const offsetParam = url.searchParams.get("offset");
  const requestedOffset = Number.parseInt(offsetParam ?? `${DEFAULT_OFFSET}`, 10);
  const offset = Number.isNaN(requestedOffset) ? DEFAULT_OFFSET : requestedOffset;

  const filters: AccessLogFilters = {
    platform: url.searchParams.get("platform"),
    userId: url.searchParams.get("userId"),
    startDate: url.searchParams.get("startDate"),
    endDate: url.searchParams.get("endDate"),
  };

  return { limit, offset, filters };
}

function buildWhereClause(filters: AccessLogFilters): WhereClause {
  const where: WhereClause = {};

  if (filters.platform) {
    where.platform = filters.platform;
  }

  if (filters.userId) {
    where.userId = filters.userId;
  }

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      where.createdAt.lte = new Date(filters.endDate);
    }
  }

  return where;
}

// POST /api/access-log - Log an access event (for mobile apps and authenticated sessions)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.type === "device-register") {
      // Register or update device information
      const deviceData = deviceRegisterSchema.parse(body.device);
      const session = await getSession();

      const deviceInfo: DeviceData = {
        ...deviceData,
        userId: session?.user?.id,
      };

      await AccessLogger.registerOrUpdateDevice(deviceInfo);

      return NextResponse.json({ success: true, message: "Device registered successfully" });
    }

    if (body.type === "access-log") {
      // Log access with user context
      const logData = accessLogSchema.parse(body.log);
      const session = await getSession();

      const ipAddress = AccessLogger.getClientIP(request);
      const userAgent = request.headers.get("user-agent") || undefined;

      const accessLogData: AccessLogData = {
        ...logData,
        userId: session?.user?.id,
        sessionId: session?.session?.id,
        ipAddress,
        userAgent,
      };

      await AccessLogger.logAccess(accessLogData);

      return NextResponse.json({ success: true, message: "Access logged successfully" });
    }

    return NextResponse.json({ error: "Invalid request type" }, { status: BAD_REQUEST_STATUS });
  } catch (error) {
    logger.error("Access log API error:", error);
    return NextResponse.json(
      { error: "Failed to process access log" },
      { status: INTERNAL_SERVER_ERROR_STATUS }
    );
  }
}

// GET /api/access-log - Retrieve access logs (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: UNAUTHORIZED_STATUS });
    }

    // user has admin privileges か確認する
    if (session.user.role !== "admin" && session.user.role !== "org_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: FORBIDDEN_STATUS });
    }

    const url = new URL(request.url);
    const { limit, offset, filters } = parseAccessLogQuery(url);
    const where = buildWhereClause(filters);

    // For org_admin, only show logs from their organization
    // TODO: Implement organization filtering when organization membership is available
    // if (session.user.role === 'org_admin' && session.user.organizationId) {
    // where.organizationId = session.user.organizationId;
    // }

    const [logs, total] = await Promise.all([
      prisma.accessLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          device: {
            select: {
              deviceId: true,
              platform: true,
              deviceModel: true,
              appVersion: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.accessLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    logger.error("Failed to fetch access logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch access logs" },
      { status: INTERNAL_SERVER_ERROR_STATUS }
    );
  }
}

// EOF
