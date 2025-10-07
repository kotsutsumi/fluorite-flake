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
            <body suppressHydrationWarning>{children}</body>
        </html>
    );
}

// EOF
