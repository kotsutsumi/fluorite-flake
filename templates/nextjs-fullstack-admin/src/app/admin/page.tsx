import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { auth } from '@/lib/auth';

export const metadata: Metadata = {
    title: '管理画面 ',
    description: '管理画面 - Next.js フルスタック管理テンプレート',
};

export default async function AdminPage() {
    const headersList = headers();
    const session = await auth.api.getSession({
        headers: headersList,
    });

    // Check if user is authenticated and has admin permissions
    if (!session?.user || !['admin', 'org_admin'].includes(session.user.role)) {
        redirect('/admin/login');
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <AdminDashboard user={session.user} />
        </div>
    );
}
