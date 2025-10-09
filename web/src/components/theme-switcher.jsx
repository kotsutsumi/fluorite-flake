"use client";

import { useCallback, useEffect, useState } from "react";

export function ThemeSwitcher() {
    const [theme, setTheme] = useState("light");
    const [mounted, setMounted] = useState(false);

    const applyTheme = useCallback((newTheme) => {
        if (typeof window === "undefined") {
            return;
        }

        const root = document.documentElement;
        root.classList.remove("dark", "light");
        root.classList.add(newTheme === "dark" ? "dark" : "light");
        window.localStorage.setItem("theme", newTheme);
        document.dispatchEvent(new CustomEvent("themechange", { detail: { theme: newTheme } }));
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        setMounted(true);

        const savedTheme = window.localStorage.getItem("theme");
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        const initialTheme = savedTheme || systemTheme;

        setTheme(initialTheme);
        applyTheme(initialTheme);
    }, [applyTheme]);

    const toggleTheme = () => {
        const newTheme = theme === "light" ? "dark" : "light";
        setTheme(newTheme);
        applyTheme(newTheme);
    };

    if (!mounted) {
        return (
            <button className="w-8 h-8 rounded-md border border-gray-300 bg-transparent" type="button">
                <span className="sr-only">テーマ切替</span>
            </button>
        );
    }

    return (
        <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center"
            aria-label={`${theme === "light" ? "ダーク" : "ライト"}モードに切替`}
            type="button"
        >
            {theme === "light" ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                    <title>ダークモードアイコン</title>
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
            ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                    <title>ライトモードアイコン</title>
                    <path
                        fillRule="evenodd"
                        d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                        clipRule="evenodd"
                    />
                </svg>
            )}
        </button>
    );
}

// EOF
