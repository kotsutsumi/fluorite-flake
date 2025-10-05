import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { APP_ROLES } from '@/lib/roles';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: request.headers,
        });

        if (!session?.user || !['admin', 'org_admin'].includes(session.user.role)) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { userId, nbcMemberId } = body;

        if (!userId || !nbcMemberId) {
            return NextResponse.json(
                { message: 'User ID and NBC Member ID are required' },
                { status: 400 }
            );
        }

        // Check if NBC Member ID is already assigned
        const existingMember = await prisma.user.findUnique({
            where: { nbcMemberId },
        });

        if (existingMember && existingMember.id !== userId) {
            return NextResponse.json(
                { message: 'This NBC Member ID is already assigned to another user' },
                { status: 400 }
            );
        }

        // Update user to NBC member role
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                role: APP_ROLES.NBC_MEMBER,
                nbcMemberId,
                memberSince: new Date(),
            },
        });

        return NextResponse.json({
            message: 'NBC Member ID assigned successfully',
            user: updatedUser,
        });
    } catch (error) {
        console.error('Error assigning NBC member:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
