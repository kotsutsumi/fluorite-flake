"use client";

import { useState, useEffect } from "react";

export function ThemeSwitcher() {
    const [theme, setTheme] = useState("light");
    const [mounted, setMounted] = useState(false);

    // クライアントサイドでのマウント確認
    useEffect(() => {
        setMounted(true);

        // ローカルストレージからテーマを取得
        const savedTheme = localStorage.getItem("theme");
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        const initialTheme = savedTheme || systemTheme;

        setTheme(initialTheme);
        applyTheme(initialTheme);
    }, []);

    // テーマをHTMLとローカルストレージに適用
    const applyTheme = (newTheme) => {
        // 既存のテーマクラスを強制的に削除してから設定
        document.documentElement.classList.remove("dark", "light");

        if (newTheme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.add("light");
        }
        localStorage.setItem("theme", newTheme);

        // テーマ変更のカスタムイベントを発火
        document.dispatchEvent(new CustomEvent("themechange", { detail: { theme: newTheme } }));
    };

    // テーマ切替ハンドラー
    const toggleTheme = () => {
        const newTheme = theme === "light" ? "dark" : "light";
        setTheme(newTheme);
        applyTheme(newTheme);
    };

    // マウント前はレンダリングしない（SSRとの不一致を避ける）
    if (!mounted) {
        return (
            <button className="w-8 h-8 rounded-md border border-gray-300 bg-transparent">
                <span className="sr-only">テーマ切替</span>
            </button>
        );
    }

    return (
        <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center"
            aria-label={`${theme === "light" ? "ダーク" : "ライト"}モードに切替`}
        >
            {theme === "light" ? (
                // 月アイコン（ダークモードへ切替）
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
            ) : (
                // 太陽アイコン（ライトモードへ切替）
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
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
