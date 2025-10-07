import { Suspense } from 'react';
import { getSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { APP_ROLES } from '@/lib/roles';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { AccessHistoryContent } from './access-history-content';

interface PageProps {
    params: Promise<{
        tab?: string[];
    }>;
}

export default async function AccessHistoryPage({ params }: PageProps) {
    const session = await getSession();

    // Await params to comply with Next.js 15 requirements
    const resolvedParams = await params;

    // Get the current tab from URL params, default to 'overview'
    const currentTab = resolvedParams.tab?.[0] || 'overview';

    // Validate tab parameter
    const validTabs = ['overview', 'charts', 'logs'];
    if (!validTabs.includes(currentTab)) {
        redirect('/access-history/overview');
    }

    if (!session?.user) {
        redirect('/login');
    }

    // Check if user has permission to view access history
    if (session.user.role !== APP_ROLES.ADMIN && session.user.role !== APP_ROLES.ORG_ADMIN) {
        redirect('/');
    }

    return (
        <DashboardLayout user={session.user}>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">アクセス履歴</h1>
                    <p className="text-muted-foreground">システムへのアクセス状況を確認できます</p>
                </div>

                <Suspense
                    fallback={
                        <div className="flex items-center justify-center p-8">
                            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                        </div>
                    }
                >
                    <AccessHistoryContent user={session.user} initialTab={currentTab} />
                </Suspense>
            </div>
        </DashboardLayout>
    );
}
