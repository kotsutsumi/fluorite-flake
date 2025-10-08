import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Sidebar } from '@/components/dashboard/sidebar';
import type { ReactNode } from 'react';

interface DashboardLayoutProps {
    children: ReactNode;
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
    };
}

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
    return (
        <div className="flex min-h-screen bg-muted/20">
            <Sidebar user={user} />
            <div className="flex min-h-screen flex-1 flex-col">
                <DashboardHeader user={user} />
                <main className="flex-1 px-6 py-8">{children}</main>
            </div>
        </div>
    );
}
