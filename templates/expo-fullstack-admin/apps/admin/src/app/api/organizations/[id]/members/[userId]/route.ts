import prisma from '@/lib/db';
import { getApiSession } from '@/lib/getApiSession';
import { APP_ROLES } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; userId: string }> }
) {
    const resolvedParams = await params;
    const session = await getApiSession(request);

    if (!session || session.user.role !== APP_ROLES.ADMIN) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        // Check if organization exists
        const organization = await prisma.organization.findUnique({
            where: { id: resolvedParams.id },
        });

        if (!organization) {
            return NextResponse.json({ error: '組織が見つかりません。' }, { status: 404 });
        }

        // Check if member exists
        const member = await prisma.member.findUnique({
            where: {
                userId_organizationId: {
                    userId: resolvedParams.userId,
                    organizationId: resolvedParams.id,
                },
            },
        });

        if (!member) {
            return NextResponse.json({ error: 'メンバーが見つかりません。' }, { status: 404 });
        }

        // Remove member from organization
        await prisma.member.delete({
            where: {
                userId_organizationId: {
                    userId: resolvedParams.userId,
                    organizationId: resolvedParams.id,
                },
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
        console.error('Error removing member from organization:', error);
        return NextResponse.json({ error: 'メンバーの削除に失敗しました。' }, { status: 500 });
    }
}
