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

        // Get current date for recent registrations
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        const [
            totalUsers,
            nbcMembers,
            nbcSponsors,
            totalFacilities,
            pendingFacilities,
            totalVideoContent,
            publishedVideoContent,
            recentRegistrations,
        ] = await Promise.all([
            // Total users
            prisma.user.count(),

            // NBC members
            prisma.user.count({
                where: { role: APP_ROLES.NBC_MEMBER, isActive: true },
            }),

            // NBC sponsors
            prisma.user.count({
                where: { role: APP_ROLES.NBC_SPONSOR, isActive: true },
            }),

            // Total facilities
            prisma.facility.count(),

            // Pending facilities (not published)
            prisma.facility.count({
                where: { isPublished: false },
            }),

            // Total video content
            prisma.videoContent.count(),

            // Published video content
            prisma.videoContent.count({
                where: { isPublished: true },
            }),

            // Recent registrations (last month)
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
            nbcMembers,
            nbcSponsors,
            totalFacilities,
            pendingFacilities,
            totalVideoContent,
            publishedVideoContent,
            recentRegistrations,
        };

        return NextResponse.json(stats);
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
