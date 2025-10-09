import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { APP_ROLES } from '@/lib/roles';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: request.headers,
        });

        if (!session?.user || !['admin', 'org_admin'].includes(session.user.role)) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const Members = await prisma.user.findMany({
            where: {
                role: APP_ROLES._MEMBER,
                isActive: true,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                MemberId: true,
                memberSince: true,
                isActive: true,
                createdAt: true,
            },
            orderBy: {
                memberSince: 'desc',
            },
        });

        return NextResponse.json(Members);
    } catch (error) {
        console.error('Error fetching  members:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
