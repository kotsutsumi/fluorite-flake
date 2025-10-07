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

        const now = new Date();
        const lastMonth = new Date(now);
        lastMonth.setMonth(now.getMonth() - 1);

        const [
            totalUsers,
            Members,
            totalOrganizations,
            activeSessions,
            deviceCount,
            accessLogsLastMonth,
            recentRegistrations,
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({
                where: { role: APP_ROLES._MEMBER, isActive: true },
            }),
            prisma.organization.count(),
            prisma.session.count({
                where: {
                    expiresAt: {
                        gt: now,
                    },
                },
            }),
            prisma.deviceInfo.count({
                where: { isActive: true },
            }),
            prisma.accessLog.count({
                where: {
                    createdAt: {
                        gte: lastMonth,
                    },
                },
            }),
            prisma.user.count({
                where: {
                    createdAt: {
                        gte: lastMonth,
                    },
                },
            }),
        ]);

        const stats = {
            totalUsers,
            Members,
            totalOrganizations,
            activeSessions,
            deviceCount,
            accessLogsLastMonth,
            recentRegistrations,
        };

        return NextResponse.json(stats);
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

// EOF
