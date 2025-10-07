import prisma from '@/lib/db';
import { getApiSession } from '@/lib/getApiSession';
import { APP_ROLES } from '@/lib/roles';
import { toSlug } from '@/lib/to-slug';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const session = await getApiSession(request);

    if (
        !session ||
        (session.user.role !== APP_ROLES.ADMIN && session.user.role !== APP_ROLES.ORG_ADMIN)
    ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = await request.json();
    const name = String(payload.name ?? '').trim();
    const slug = String(payload.slug ?? '') || toSlug(name);
    const metadata =
        payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : undefined;

    if (!name) {
        return NextResponse.json({ error: '組織名は必須です。' }, { status: 400 });
    }

    await prisma.organization.update({
        where: { id: resolvedParams.id },
        data: {
            name,
            slug,
            metadata,
        },
    });

    const organizations = await prisma.organization.findMany({
        include: {
            members: {
                include: {
                    user: {
                        select: { id: true, email: true, name: true, role: true },
                    },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ organizations });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const session = await getApiSession(request);

    if (
        !session ||
        (session.user.role !== APP_ROLES.ADMIN && session.user.role !== APP_ROLES.ORG_ADMIN)
    ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        // Check if organization exists
        const organization = await prisma.organization.findUnique({
            where: { id: resolvedParams.id },
            include: { members: true },
        });

        if (!organization) {
            return NextResponse.json({ error: '組織が見つかりません。' }, { status: 404 });
        }

        // Check if organization has members
        if (organization.members.length > 0) {
            return NextResponse.json(
                {
                    error: '組織にメンバーが存在するため削除できません。先にメンバーを削除してください。',
                },
                { status: 400 }
            );
        }

        // Delete invitations and organization (safe to delete as no members exist)
        await prisma.invitation.deleteMany({ where: { organizationId: resolvedParams.id } });
        await prisma.organization.delete({ where: { id: resolvedParams.id } });

        const organizations = await prisma.organization.findMany({
            include: {
                members: {
                    include: {
                        user: {
                            select: { id: true, email: true, name: true, role: true },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ organizations });
    } catch (error) {
        console.error('Error deleting organization:', error);
        return NextResponse.json({ error: '組織の削除に失敗しました。' }, { status: 500 });
    }
}
