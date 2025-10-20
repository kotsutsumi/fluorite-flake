/**
 * テストセットアップAPIエンドポイント
 * 開発用テストデータ作成
 */
import { hashPassword } from "better-auth/crypto";
import { type NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  testAccessLogs,
  testDevices,
  testMembers,
  testOrganizationIds,
  testOrganizationSlugs,
  testOrganizations,
  testSessions,
  testUserEmails,
  testUsers,
} from "@/lib/test-data";

const SETUP_ACTIONS = new Set(["setup", "seed"]);
const CLEANUP_ACTIONS = new Set(["cleanup", "clean"]);

function normalizeAction(action: unknown): string {
  return typeof action === "string" ? action.toLowerCase() : "";
}

export async function POST(request: NextRequest) {
  try {
    const environment = process.env.NODE_ENV ?? "development";
    if (!["development", "local", "test"].includes(environment)) {
      return NextResponse.json(
        { message: "Test setup only available in development" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const action = normalizeAction(body.action);

    if (SETUP_ACTIONS.has(action)) {
      return NextResponse.json(await createTestData());
    }

    if (CLEANUP_ACTIONS.has(action)) {
      await cleanupTestData();
      return NextResponse.json({ message: "Test data cleaned up successfully" });
    }

    return NextResponse.json(
      { message: 'Invalid action. Use "setup" or "cleanup"' },
      { status: 400 }
    );
  } catch (error) {
    logger.error("Test setup error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

async function createTestData() {
  const organizationMap = new Map<string, string>();

  for (const organization of Object.values(testOrganizations)) {
    const seededOrganization = await prisma.organization.upsert({
      where: { slug: organization.slug },
      update: {
        name: organization.name,
      },
      create: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
    });

    organizationMap.set(organization.id, seededOrganization.id);
  }

  const userIdByFixtureId = new Map<string, string>();
  const seededUsers: Array<{ email: string; role: string }> = [];

  for (const user of Object.values(testUsers)) {
    const hashedPassword = await hashPassword(user.password);

    const seededUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        emailVerified: true,
        isActive: true,
        accounts: {
          upsert: {
            where: {
              providerId_accountId: {
                providerId: "credential",
                accountId: user.email,
              },
            },
            update: {
              password: hashedPassword,
            },
            create: {
              providerId: "credential",
              accountId: user.email,
              password: hashedPassword,
            },
          },
        },
      },
      create: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: true,
        isActive: true,
        accounts: {
          create: {
            providerId: "credential",
            accountId: user.email,
            password: hashedPassword,
          },
        },
      },
    });

    userIdByFixtureId.set(user.id, seededUser.id);
    seededUsers.push({ email: seededUser.email, role: user.role });
  }

  for (const member of testMembers) {
    const userId = userIdByFixtureId.get(member.userId) ?? member.userId;
    const organizationId = organizationMap.get(member.organizationId) ?? member.organizationId;

    if (!(userId && organizationId)) {
      continue;
    }

    await prisma.member.upsert({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      update: {
        role: member.role,
      },
      create: {
        userId,
        organizationId,
        role: member.role,
      },
    });
  }

  for (const session of testSessions) {
    const userId = userIdByFixtureId.get(session.userId) ?? session.userId;

    if (!userId) {
      continue;
    }

    await prisma.session.upsert({
      where: { id: session.id },
      update: {
        userId,
        expiresAt: session.expiresAt,
        token: session.token,
      },
      create: {
        id: session.id,
        userId,
        expiresAt: session.expiresAt,
        token: session.token,
      },
    });
  }

  const deviceIdByFixtureId = new Map<string, string>();

  for (const device of testDevices) {
    const userId = userIdByFixtureId.get(device.userId) ?? device.userId;

    const seededDevice = await prisma.deviceInfo.upsert({
      where: { deviceId: device.deviceId },
      update: {
        platform: device.platform,
        deviceModel: device.deviceModel,
        appVersion: device.appVersion,
        userId,
      },
      create: {
        deviceId: device.deviceId,
        platform: device.platform,
        deviceModel: device.deviceModel,
        appVersion: device.appVersion,
        userId,
      },
    });

    deviceIdByFixtureId.set(device.deviceId, seededDevice.id);
  }

  for (const log of testAccessLogs) {
    const userId = userIdByFixtureId.get(log.userId) ?? log.userId;
    const deviceId = log.deviceId ? deviceIdByFixtureId.get(log.deviceId) : undefined;

    await prisma.accessLog.upsert({
      where: { id: log.id },
      update: {
        userId,
        sessionId: log.sessionId,
        deviceId,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        method: log.method,
        path: log.path,
        statusCode: log.statusCode,
        responseTime: log.responseTime,
        platform: log.platform,
      },
      create: {
        id: log.id,
        userId,
        sessionId: log.sessionId,
        deviceId,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        method: log.method,
        path: log.path,
        statusCode: log.statusCode,
        responseTime: log.responseTime,
        platform: log.platform,
        createdAt: log.createdAt,
      },
    });
  }

  return {
    message: "Test data setup completed",
    testUsers: seededUsers,
    instructions: {
      frontend: "Use the seeded accounts to log in to the app",
      admin: "Visit /users and login with admin@test.com",
    },
  };
}

async function cleanupTestData() {
  const accessLogIds = testAccessLogs.map((log) => log.id);
  const deviceIds = testDevices.map((device) => device.deviceId);
  const sessionIds = testSessions.map((session) => session.id);

  await prisma.$transaction([
    prisma.accessLog.deleteMany({
      where: {
        id: { in: accessLogIds },
      },
    }),
    prisma.deviceInfo.deleteMany({
      where: {
        deviceId: { in: deviceIds },
      },
    }),
    prisma.session.deleteMany({
      where: {
        id: { in: sessionIds },
      },
    }),
    prisma.member.deleteMany({
      where: {
        user: {
          email: { in: testUserEmails },
        },
      },
    }),
    prisma.account.deleteMany({
      where: {
        providerId: "credential",
        accountId: { in: testUserEmails },
      },
    }),
    prisma.user.deleteMany({
      where: {
        email: { in: testUserEmails },
      },
    }),
    prisma.organization.deleteMany({
      where: {
        OR: [{ id: { in: testOrganizationIds } }, { slug: { in: testOrganizationSlugs } }],
      },
    }),
  ]);
}

// EOF
