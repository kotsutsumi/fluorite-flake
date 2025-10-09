import prisma from '@/lib/db';
import { getApiSession } from '@/lib/getApiSession';
import { APP_ROLES } from '@/lib/roles';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
    const session = await getApiSession(request);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = session.user.role as string;
    const organizations = await prisma.member.findMany({
        where: { userId: session.user.id },
        select: { organizationId: true },
    });

    const organizationIds = organizations.map((membership) => membership.organizationId);

    const users = await prisma.user.findMany({
        where:
            role === APP_ROLES.ADMIN
                ? undefined
                : {
                      memberships: {
                          some: {
                              organizationId: { in: organizationIds },
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
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
}

export async function POST(request: Request) {
    const session = await getApiSession(request);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = session.user.role as string;
    if (role !== APP_ROLES.ADMIN && role !== APP_ROLES.ORG_ADMIN) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = await request.json();
    const name = String(payload.name ?? '').trim();
    const email = String(payload.email ?? '').trim();
    const password = String(payload.password ?? '');
    const organizationId = String(payload.organizationId ?? '');
    const requestedRole = String(payload.role ?? APP_ROLES.USER);

    if (!email || !password || !organizationId) {
        return NextResponse.json(
            { error: 'メールアドレス・パスワード・所属組織は必須です。' },
            { status: 400 }
        );
    }

    if (role === APP_ROLES.ORG_ADMIN && requestedRole === APP_ROLES.ADMIN) {
        return NextResponse.json(
            { error: '組織管理ユーザーは管理ユーザーを作成できません。' },
            { status: 400 }
        );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
        data: {
            email,
            name,
            role: requestedRole,
            accounts: {
                create: {
                    providerId: 'email-password',
                    accountId: email,
                    password: hashedPassword,
                },
            },
            memberships: {
                create: {
                    organizationId,
                    role: requestedRole,
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
                                      .then((memberships) =>
                                          memberships.map((membership) => membership.organizationId)
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
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users, createdUserId: user.id });
}
