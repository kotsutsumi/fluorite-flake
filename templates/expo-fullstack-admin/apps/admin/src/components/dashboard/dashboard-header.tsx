'use client';
import { useState } from 'react';
import { LogOut } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useLoadingMask } from '@/hooks/use-loading-mask';
import { type AppRole, ROLE_LABELS } from '@/lib/roles';

interface DashboardHeaderProps {
    user: {
        id: string;
        email: string;
        name: string;
        role: AppRole | string;
    };
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
    const [isSigningOut, setIsSigningOut] = useState(false);
    const { show } = useLoadingMask();
    const initials = user.name
        ? user.name
              .split(' ')
              .map((part) => part.charAt(0))
              .join('')
              .slice(0, 2)
              .toUpperCase()
        : user.email.slice(0, 2).toUpperCase();

    const handleSignOut = () => {
        if (isSigningOut) {
            return;
        }
        setIsSigningOut(true);
        show('ログアウト処理を実行しています…');
        try {
            console.log('🚪 Starting custom logout process');
            const beaconData = new Blob(['{}'], { type: 'application/json' });
            const beaconSent = navigator.sendBeacon('/api/auth/sign-out', beaconData);

            if (!beaconSent) {
                fetch('/api/auth/sign-out', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    keepalive: true,
                }).catch((error) => {
                    console.error('❌ Logout fetch fallback failed:', error);
                });
            }

            console.log('✅ Logout request dispatched, redirecting to login');
        } catch (error) {
            console.error('💥 Logout error:', error);
        } finally {
            window.location.replace('/login');
        }
    };

    return (
        <header className="flex items-center justify-between border-b bg-background/60 px-6 py-4">
            <div>
                <h1 className="text-2xl font-semibold mb-3">ダッシュボード</h1>
                <p className="text-sm text-muted-foreground">
                    {ROLE_LABELS[(user.role as AppRole) ?? 'user'] || '一般ユーザー'} / {user.email}
                </p>
            </div>
            <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                    <AvatarFallback className="">{initials}</AvatarFallback>
                </Avatar>
                <ThemeToggle variant="ghost" />
                <Button
                    className=""
                    variant="default"
                    size="default"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    ログアウト
                </Button>
            </div>
        </header>
    );
}
