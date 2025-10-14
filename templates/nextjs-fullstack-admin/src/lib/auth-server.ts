import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { AppRole } from './roles';
import { APP_ROLES } from './roles';
import { auth } from './auth';
import prisma from './db';

// Use Better Auth's built-in session management
export async function getSession() {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session) {
        return null;
    }

    return {
        user: session.user,
        session: session.session,
    };
}

export async function requireSession() {
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }

    return session;
}

export function hasRole(userRole: string | null | undefined, allowed: AppRole[]): boolean {
    if (!userRole) {
        return false;
    }
    return allowed.includes(userRole as AppRole);
}

export function assertRole(session: Awaited<ReturnType<typeof getSession>>, allowed: AppRole[]) {
    if (!session || !hasRole(session.user?.role, allowed)) {
        redirect('/');
    }
}

// Get organization IDs that the user has access to
export async function getAccessibleOrganizationIds(
    userId: string,
    role: AppRole
): Promise<string[]> {
    // Admin users have access to all organizations
    if (role === APP_ROLES.ADMIN) {
        const organizations = await prisma.organization.findMany({
            select: { id: true },
        });
        return organizations.map((org) => org.id);
    }

    // Regular users only have access to their member organizations
    const memberships = await prisma.member.findMany({
        where: { userId },
        select: { organizationId: true },
    });

    return memberships.map((m) => m.organizationId);
}
