import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { OrganizationsClient } from '@/components/dashboard/organizations-client';
import { requireSession } from '@/lib/auth-server';
import prisma from '@/lib/db';
import { APP_ROLES } from '@/lib/roles';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function OrganizationsPage() {
    const session = await requireSession();
    const role = (session.user?.role as string) ?? APP_ROLES.USER;

    if (role !== APP_ROLES.ADMIN) {
        redirect('/');
    }

    const serializableUser = {
        id: session.user?.id ?? '',
        name: session.user?.name ?? '',
        email: session.user?.email ?? '',
        role: session.user?.role ?? 'user',
    };

    const organizations = await prisma.organization.findMany({
        include: {
            members: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                        },
                    },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    return (
        <DashboardLayout user={serializableUser}>
            <OrganizationsClient initialOrganizations={JSON.parse(JSON.stringify(organizations))} />
        </DashboardLayout>
    );
}
