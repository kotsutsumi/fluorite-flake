/**
 * ユーザー個別操作APIエンドポイント
 * GET: 詳細取得 / PUT: 更新 / DELETE: 削除
 */
import { hashPassword } from "better-auth/crypto";
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getApiSession } from "@/lib/get-api-session";
import { APP_ROLES } from "@/lib/roles";

export const runtime = "nodejs";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const session = await getApiSession(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role as string;
  if (role !== APP_ROLES.ADMIN && role !== APP_ROLES.ORG_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (session.user.id === resolvedParams.id) {
    return NextResponse.json({ error: "自分自身を削除することはできません。" }, { status: 400 });
  }

  if (role === APP_ROLES.ORG_ADMIN) {
    const organizations = await prisma.member.findMany({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });
    const organizationIds = organizations.map(
      ({ organizationId: membershipOrganizationId }: { organizationId: string }) =>
        membershipOrganizationId
    );

    const targetMember = await prisma.member.findFirst({
      where: {
        userId: resolvedParams.id,
        organizationId: { in: organizationIds },
      },
    });

    if (!targetMember) {
      return NextResponse.json({ error: "許可されていない操作です。" }, { status: 403 });
    }
  }

  await prisma.member.deleteMany({ where: { userId: resolvedParams.id } });
  await prisma.account.deleteMany({ where: { userId: resolvedParams.id } });
  await prisma.session.deleteMany({ where: { userId: resolvedParams.id } });
  await prisma.user.delete({ where: { id: resolvedParams.id } });

  const users = await prisma.user.findMany({
    where:
      role === APP_ROLES.ADMIN
        ? undefined
        : {
            memberships: {
              some: {
                organizationId: {
                  in: await prisma.member
                    .findMany({
                      where: { userId: session.user.id },
                      select: { organizationId: true },
                    })
                    .then((memberships: Array<{ organizationId: string }>) =>
                      memberships.map(
                        ({
                          organizationId: membershipOrganizationId,
                        }: {
                          organizationId: string;
                        }) => membershipOrganizationId
                      )
                    ),
                },
              },
            },
          },
    include: {
      memberships: {
        include: {
          organization: {
            select: { id: true, name: true, slug: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const session = await getApiSession(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role as string;
  if (role !== APP_ROLES.ADMIN && role !== APP_ROLES.ORG_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json();
  const { name, email, password, organizationId, role: targetRole } = payload;

  if (!(name && email)) {
    return NextResponse.json({ error: "名前とメールアドレスは必須です。" }, { status: 400 });
  }

  if (role === APP_ROLES.ORG_ADMIN && targetRole === APP_ROLES.ADMIN) {
    return NextResponse.json(
      { error: "組織管理ユーザーは管理ユーザーを設定できません。" },
      { status: 400 }
    );
  }

  // email is already taken by another user か確認する
  const existingUser = await prisma.user.findFirst({
    where: {
      email,
      id: { not: resolvedParams.id },
    },
  });

  if (existingUser) {
    return NextResponse.json(
      { error: "このメールアドレスは既に使用されています。" },
      { status: 400 }
    );
  }

  // Update user basic info
  await prisma.user.update({
    where: { id: resolvedParams.id },
    data: {
      name,
      email,
      role: targetRole || APP_ROLES.USER,
    },
  });

  // Update password in account table if provided
  if (password && password.trim() !== "") {
    const hashedPassword = await hashPassword(password);

    // Update account with credential providerId (BetterAuth standard)
    const updateResult = await prisma.account.updateMany({
      where: {
        userId: resolvedParams.id,
        providerId: "credential",
      },
      data: {
        password: hashedPassword,
      },
    });

    // If no credential account exists, also check for legacy email-password accounts
    if (updateResult.count === 0) {
      await prisma.account.updateMany({
        where: {
          userId: resolvedParams.id,
          providerId: "email-password",
        },
        data: {
          providerId: "credential",
          password: hashedPassword,
        },
      });
    }
  }

  // Update organization membership if organizationId is provided
  if (organizationId) {
    await prisma.member.deleteMany({
      where: { userId: resolvedParams.id },
    });

    await prisma.member.create({
      data: {
        userId: resolvedParams.id,
        organizationId,
        role: targetRole || APP_ROLES.USER,
      },
    });
  }

  // Fetch updated user list
  const users = await prisma.user.findMany({
    where:
      role === APP_ROLES.ADMIN
        ? undefined
        : {
            memberships: {
              some: {
                organizationId: {
                  in: await prisma.member
                    .findMany({
                      where: { userId: session.user.id },
                      select: { organizationId: true },
                    })
                    .then((memberships: Array<{ organizationId: string }>) =>
                      memberships.map(
                        ({
                          organizationId: membershipOrganizationId,
                        }: {
                          organizationId: string;
                        }) => membershipOrganizationId
                      )
                    ),
                },
              },
            },
          },
    include: {
      memberships: {
        include: {
          organization: {
            select: { id: true, name: true, slug: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const session = await getApiSession(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role as string;
  if (role !== APP_ROLES.ADMIN && role !== APP_ROLES.ORG_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json();
  const targetRole = String(payload.role ?? APP_ROLES.USER);
  const organizationId = String(payload.organizationId ?? "");

  if (role === APP_ROLES.ORG_ADMIN && targetRole === APP_ROLES.ADMIN) {
    return NextResponse.json(
      { error: "組織管理ユーザーは管理ユーザーを設定できません。" },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: resolvedParams.id },
    data: {
      role: targetRole,
      memberships: {
        deleteMany: {},
        ...(organizationId
          ? {
              create: {
                organizationId,
                role: targetRole,
              },
            }
          : {}),
      },
    },
  });

  const users = await prisma.user.findMany({
    where:
      role === APP_ROLES.ADMIN
        ? undefined
        : {
            memberships: {
              some: {
                organizationId: {
                  in: await prisma.member
                    .findMany({
                      where: { userId: session.user.id },
                      select: { organizationId: true },
                    })
                    .then((memberships: Array<{ organizationId: string }>) =>
                      memberships.map(
                        ({
                          organizationId: membershipOrganizationId,
                        }: {
                          organizationId: string;
                        }) => membershipOrganizationId
                      )
                    ),
                },
              },
            },
          },
    include: {
      memberships: {
        include: {
          organization: {
            select: { id: true, name: true, slug: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}

// EOF
