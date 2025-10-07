'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface ThemeToggleProps {
    className?: string;
    variant?: 'default' | 'outline' | 'ghost' | 'secondary';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    showLabels?: boolean;
}

export function ThemeToggle({
    className,
    variant = 'outline',
    size = 'icon',
    showLabels = false,
}: ThemeToggleProps) {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Prevent hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <Button variant={variant} size={size} className={cn('opacity-0', className)} disabled>
                <Sun className="h-4 w-4" />
                {showLabels && <span className="sr-only">テーマ切り替え</span>}
            </Button>
        );
    }

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    const isDarkMode = theme === 'dark';

    return (
        <Button
            variant={variant}
            size={size}
            onClick={toggleTheme}
            className={cn(className)}
            aria-label={isDarkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
        >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {showLabels && <span className="ml-2">{isDarkMode ? 'ライト' : 'ダーク'}</span>}
            <span className="sr-only">
                {isDarkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
            </span>
        </Button>
    );
}
