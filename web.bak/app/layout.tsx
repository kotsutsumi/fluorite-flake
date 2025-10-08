import "./globals.css";
import "nextra-theme-docs/style.css";
import { Head } from "nextra/components";
import type { ReactNode } from "react";

type RootLayoutProps = {
    children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
    return (
        <html dir="ltr" lang="en" suppressHydrationWarning>
            <Head />
            <body
                className="min-h-screen bg-slate-50 text-slate-900 antialiased transition-colors dark:bg-slate-950 dark:text-slate-100"
                suppressHydrationWarning
            >
                {children}
            </body>
        </html>
    );
}

// EOF
