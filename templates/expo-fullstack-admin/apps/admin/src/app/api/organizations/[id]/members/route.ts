import prisma from '@/lib/db';
import { getApiSession } from '@/lib/getApiSession';
import { APP_ROLES } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const session = await getApiSession(request);

    if (!session || session.user.role !== APP_ROLES.ADMIN) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = await request.json();
    const userId = String(payload.userId ?? '').trim();
    const role = String(payload.role ?? 'member').trim();

    if (!userId) {
        return NextResponse.json({ error: 'ユーザーIDは必須です。' }, { status: 400 });
    }

    try {
        // Check if organization exists
        const organization = await prisma.organization.findUnique({
            where: { id: resolvedParams.id },
        });

        if (!organization) {
            return NextResponse.json({ error: '組織が見つかりません。' }, { status: 404 });
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return NextResponse.json({ error: 'ユーザーが見つかりません。' }, { status: 404 });
        }

        // Check if user is already a member
        const existingMember = await prisma.member.findUnique({
            where: {
                userId_organizationId: {
                    userId: userId,
                    organizationId: resolvedParams.id,
                },
            },
        });

        if (existingMember) {
            return NextResponse.json(
                { error: 'ユーザーは既に組織のメンバーです。' },
                { status: 400 }
            );
        }

        // Add user to organization
        await prisma.member.create({
            data: {
                userId: userId,
                organizationId: resolvedParams.id,
                role: role,
            },
        });

        // Return updated organization with members
        const updatedOrganization = await prisma.organization.findUnique({
            where: { id: resolvedParams.id },
            include: {
                members: {
                    include: {
                        user: {
                            select: { id: true, email: true, name: true, role: true },
                        },
                    },
                },
            },
        });

        return NextResponse.json({ organization: updatedOrganization });
    } catch (error) {
        console.error('Error adding member to organization:', error);
        return NextResponse.json({ error: 'メンバーの追加に失敗しました。' }, { status: 500 });
    }
}
