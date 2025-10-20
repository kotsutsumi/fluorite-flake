// seed のロジックをまとめる。
import { hashPassword } from "better-auth/crypto";

import { logger } from "@/lib/logger";

import prisma from "../lib/db";
// lib/db.ts で設定されたデータベースクライアントを利用
// クラウド環境向け LibSQL アダプタにも適切に対応
import { APP_ROLES } from "../lib/roles";

const DAYS_PER_WEEK = 7;
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;
const ONE_WEEK_MS =
  DAYS_PER_WEEK * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

logger.info("🌱 Starting database seeding...");

async function main() {
  // 既存データをクリーンアップ（空のデータベースでも安全に処理）
  try {
    await prisma.post.deleteMany();
    await prisma.invitation.deleteMany();
    await prisma.member.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
  } catch (_error) {
    logger.info("Database cleanup skipped (fresh database)");
  }

  // Better Auth のハッシュ関数でテストユーザー用のパスワードを生成
  const adminPassword = await hashPassword("Admin123!");
  const orgAdminPassword = await hashPassword("OrgAdmin123!");
  const userPassword = await hashPassword("User123!");
  const demoPassword = await hashPassword("Demo123!");

  // E2E テスト専用のパスワード
  const testAdminPassword = await hashPassword("Admin123!@#");
  const testOrgAdminPassword = await hashPassword("OrgAdmin123!@#");
  const testMemberPassword = await hashPassword("Member123!@#");
  const testUserPassword = await hashPassword("User123!@#");

  // シードデータ全体で利用する基盤の組織を作成
  const bassAssociation = await prisma.organization.create({
    data: {
      name: "テスト組織1",
      slug: "test-organization-1",
      metadata: JSON.stringify({
        category: "Test Organization",
        country: "Japan",
      }),
    },
  });

  // 管理者ユーザーを作成（システム全体へのアクセス権）
  const admin = await prisma.user.create({
    data: {
      email: "admin@example.com",
      name: "管理者ユーザー",
      emailVerified: true,
      role: APP_ROLES.ADMIN,
      accounts: {
        create: {
          providerId: "credential",
          accountId: "admin@example.com",
          password: adminPassword,
        },
      },
      memberships: {
        create: {
          organizationId: bassAssociation.id,
          role: APP_ROLES.ADMIN,
        },
      },
    },
  });

  // 組織管理者を作成（特定組織を管理する権限）
  const orgAdmin = await prisma.user.create({
    data: {
      email: "orgadmin@example.com",
      name: "組織管理者",
      emailVerified: true,
      role: APP_ROLES.ORG_ADMIN,
      accounts: {
        create: {
          providerId: "credential",
          accountId: "orgadmin@example.com",
          password: orgAdminPassword,
        },
      },
      memberships: {
        create: {
          organizationId: bassAssociation.id,
          role: APP_ROLES.ORG_ADMIN,
        },
      },
    },
  });

  // 一般ユーザーを作成
  const user = await prisma.user.create({
    data: {
      email: "user@example.com",
      name: "一般ユーザー",
      emailVerified: true,
      role: APP_ROLES.USER,
      accounts: {
        create: {
          providerId: "credential",
          accountId: "user@example.com",
          password: userPassword,
        },
      },
      memberships: {
        create: {
          organizationId: bassAssociation.id,
          role: APP_ROLES.USER,
        },
      },
    },
  });

  // 後方互換性のための追加テストユーザーを作成
  const alice = await prisma.user.create({
    data: {
      email: "alice@example.com",
      name: "Alice Johnson",
      emailVerified: true,
      role: APP_ROLES.USER,
      accounts: {
        create: {
          providerId: "credential",
          accountId: "alice@example.com",
          password: demoPassword,
        },
      },
      memberships: {
        create: {
          organizationId: bassAssociation.id,
          role: APP_ROLES.USER,
        },
      },
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: "bob@example.com",
      name: "Bob Smith",
      emailVerified: true,
      role: APP_ROLES.USER,
      accounts: {
        create: {
          providerId: "credential",
          accountId: "bob@example.com",
          password: demoPassword,
        },
      },
      memberships: {
        create: {
          organizationId: bassAssociation.id,
          role: APP_ROLES.ORG_ADMIN,
        },
      },
    },
  });

  const charlie = await prisma.user.create({
    data: {
      email: "charlie@example.com",
      name: "Charlie Brown",
      emailVerified: false,
      role: APP_ROLES.USER,
      accounts: {
        create: {
          providerId: "credential",
          accountId: "charlie@example.com",
          password: demoPassword,
        },
      },
    },
  });

  // E2Eテスト用の追加組織を作成
  const testOrg1 = await prisma.organization.create({
    data: {
      name: "Test Organization 1",
      slug: "test-org-1",
      metadata: JSON.stringify({
        category: "E2E Test Organization",
        country: "Test",
      }),
    },
  });

  const testOrg2 = await prisma.organization.create({
    data: {
      name: "Test Organization 2",
      slug: "test-org-2",
      metadata: JSON.stringify({
        category: "E2E Test Organization",
        country: "Test",
      }),
    },
  });

  // E2Eテスト専用ユーザーを作成（test fixturesと一致）
  const _testAdmin = await prisma.user.create({
    data: {
      email: "admin@test.com",
      name: "Test Admin",
      emailVerified: true,
      role: APP_ROLES.ADMIN,
      accounts: {
        create: {
          providerId: "credential",
          accountId: "admin@test.com",
          password: testAdminPassword,
        },
      },
      memberships: {
        create: {
          organizationId: testOrg1.id,
          role: APP_ROLES.ADMIN,
        },
      },
    },
  });

  const _testOrgAdmin = await prisma.user.create({
    data: {
      email: "org-admin@test.com",
      name: "Test Org Admin",
      emailVerified: true,
      role: APP_ROLES.ORG_ADMIN,
      accounts: {
        create: {
          providerId: "credential",
          accountId: "org-admin@test.com",
          password: testOrgAdminPassword,
        },
      },
      memberships: {
        create: {
          organizationId: testOrg1.id,
          role: APP_ROLES.ORG_ADMIN,
        },
      },
    },
  });

  const _testMember = await prisma.user.create({
    data: {
      email: "member@test.com",
      name: "Test Member",
      emailVerified: true,
      role: APP_ROLES._MEMBER,
      accounts: {
        create: {
          providerId: "credential",
          accountId: "member@test.com",
          password: testMemberPassword,
        },
      },
      memberships: {
        create: {
          organizationId: testOrg1.id,
          role: APP_ROLES._MEMBER,
        },
      },
    },
  });

  const _testUser = await prisma.user.create({
    data: {
      email: "user@test.com",
      name: "Test User",
      emailVerified: true,
      role: APP_ROLES.USER,
      accounts: {
        create: {
          providerId: "credential",
          accountId: "user@test.com",
          password: testUserPassword,
        },
      },
      memberships: {
        create: {
          organizationId: testOrg2.id,
          role: APP_ROLES.USER,
        },
      },
    },
  });

  // デモ用の投稿を作成
  await prisma.post.createMany({
    data: [
      {
        title: "Getting Started with Better Auth",
        content:
          "Better Auth provides a comprehensive authentication solution with role-based access control, organizations, and more.",
        published: true,
        authorId: admin.id,
      },
      {
        title: "Organization Management Best Practices",
        content:
          "Learn how to effectively manage multiple organizations with role-based permissions.",
        published: true,
        authorId: orgAdmin.id,
      },
      {
        title: "User Onboarding Guide",
        content: "A step-by-step guide to onboarding new users to your platform.",
        published: true,
        authorId: user.id,
      },
      {
        title: "Draft: Security Considerations",
        content: "This post about security is still being written...",
        published: false,
        authorId: alice.id,
      },
      {
        title: "Team Collaboration Features",
        content: "Explore the collaboration features available within organizations.",
        published: true,
        authorId: bob.id,
      },
      {
        title: "Testing Authentication Features",
        content: "This post demonstrates the authentication and authorization features.",
        published: true,
        authorId: charlie.id,
      },
    ],
  });

  // 保留中の招待を作成
  await prisma.invitation.createMany({
    data: [
      {
        email: "pending@example.com",
        role: APP_ROLES.USER,
        status: "pending",
        organizationId: bassAssociation.id,
        invitedBy: admin.id,
        expiresAt: new Date(Date.now() + ONE_WEEK_MS), // 現在から 7 日後
      },
      {
        email: "another@example.com",
        role: APP_ROLES.ORG_ADMIN,
        status: "pending",
        organizationId: bassAssociation.id,
        invitedBy: orgAdmin.id,
        expiresAt: new Date(Date.now() + ONE_WEEK_MS),
      },
    ],
  });

  logger.info("✅ Database seeded successfully!");
  logger.info("");
  logger.info("📊 Created:");
  logger.info("   - 3 organizations (テスト組織1, Test Organization 1, Test Organization 2)");
  logger.info("   - 10 users with different roles");
  logger.info("   - 6 posts (5 published, 1 draft)");
  logger.info("   - 2 pending invitations");
  logger.info("");
  logger.info("🔐 Development Accounts:");
  logger.info("   Admin:       admin@example.com / Admin123!");
  logger.info("   Org Admin:   orgadmin@example.com / OrgAdmin123!");
  logger.info("   User:        user@example.com / User123!");
  logger.info("   Demo Users:  alice@example.com, bob@example.com / Demo123!");
  logger.info("");
  logger.info("🧪 E2E Test Accounts:");
  logger.info("   Test Admin:     admin@test.com / Admin123!@#");
  logger.info("   Test Org Admin: org-admin@test.com / OrgAdmin123!@#");
  logger.info("   Test Member:    member@test.com / Member123!@#");
  logger.info("   Test User:      user@test.com / User123!@#");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    logger.error("❌ Seeding failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });

// EOF
