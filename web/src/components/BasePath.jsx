"use client";
import { usePathname } from "next/navigation";

export function BasePath() {
    // パス名からbasePathを抽出
    const pathname = usePathname();
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    return basePath;
}

export function LogoImage({ className = "w-64 h-64 block" }) {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    return (
        <img
            src={`${basePath}/fluorite-flake-logo.png`}
            alt="Fluorite-Flake Logo"
            className={className}
        />
    );
}

export function LocalizedLink({ href, className, children }) {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    return (
        <a href={`${basePath}${href}`} className={className}>
            {children}
        </a>
    );
}

// EOF