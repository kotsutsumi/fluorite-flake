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
        const { userId, MemberId } = body;

        if (!userId || !MemberId) {
            return NextResponse.json(
                { message: 'User ID and  Member ID are required' },
                { status: 400 }
            );
        }

        // Check if  Member ID is already assigned
        const existingMember = await prisma.user.findUnique({
            where: { MemberId },
        });

        if (existingMember && existingMember.id !== userId) {
            return NextResponse.json(
                { message: 'This  Member ID is already assigned to another user' },
                { status: 400 }
            );
        }

        // Update user to  member role
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                role: APP_ROLES._MEMBER,
                MemberId,
                memberSince: new Date(),
            },
        });

        return NextResponse.json({
            message: ' Member ID assigned successfully',
            user: updatedUser,
        });
    } catch (error) {
        console.error('Error assigning  member:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
