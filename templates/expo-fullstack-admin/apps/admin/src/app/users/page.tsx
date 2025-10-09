import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { UsersClient } from '@/components/dashboard/users-client';
import { getAccessibleOrganizationIds, requireSession } from '@/lib/auth-server';
import prisma from '@/lib/db';
import { APP_ROLES, type AppRole } from '@/lib/roles';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
    const session = await requireSession();
    const role = (session.user?.role as string) ?? APP_ROLES.USER;

    if (role === APP_ROLES.USER) {
        redirect('/');
    }

    const serializableUser = {
        id: session.user?.id ?? '',
        name: session.user?.name ?? '',
        email: session.user?.email ?? '',
        role: session.user?.role ?? 'user',
    };

    const organizationIds = await getAccessibleOrganizationIds(session.user.id, role as AppRole);

    const [organizations, users] = await Promise.all([
        prisma.organization.findMany({
            where: role === APP_ROLES.ADMIN ? undefined : { id: { in: organizationIds } },
            select: {
                id: true,
                name: true,
                slug: true,
            },
            orderBy: { name: 'asc' },
        }),
        prisma.user.findMany({
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
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        }),
    ]);

    return (
        <DashboardLayout user={serializableUser}>
            <UsersClient
                initialUsers={JSON.parse(JSON.stringify(users))}
                organizations={organizations}
                currentRole={role}
                currentUserId={session.user.id}
            />
        </DashboardLayout>
    );
}
