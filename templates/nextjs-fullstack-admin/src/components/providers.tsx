'use client';

import { LoadingMask } from '@/components/loading/loading-mask';
import { Provider as JotaiProvider } from 'jotai';
import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
    return (
        <JotaiProvider>
            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
            >
                {children}
                <LoadingMask />
            </ThemeProvider>
        </JotaiProvider>
    );
}
