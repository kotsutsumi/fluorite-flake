"use client";
import { useState, useEffect } from "react";
import { Navbar } from "nextra-theme-docs";

import { LanguageSwitcher } from "./language-switcher.jsx";
import { ThemeSwitcher } from "./theme-switcher.jsx";

// 多言語対応メッセージ
const messages = {
    ja: {
        subtitle: "フルスタック開発ツール",
        documentation: "ドキュメンテーション",
    },
    en: {
        subtitle: "Full-stack Development Tool",
        documentation: "Documentation",
    },
};

export function LocalizedNavbar() {
    const [currentLang, setCurrentLang] = useState("ja");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        updateLanguageFromPath();

        // パスの変更を監視
        const handleRouteChange = () => {
            updateLanguageFromPath();
        };

        // popstateイベントでブラウザの戻る/進むボタン対応
        window.addEventListener("popstate", handleRouteChange);

        // MutationObserverでURLの変更を監視（SPAのナビゲーション対応）
        const observer = new MutationObserver(handleRouteChange);
        observer.observe(document, { subtree: true, childList: true });

        return () => {
            window.removeEventListener("popstate", handleRouteChange);
            observer.disconnect();
        };
    }, []);

    // URL更新時に再チェック
    useEffect(() => {
        const interval = setInterval(() => {
            updateLanguageFromPath();
        }, 100);

        return () => clearInterval(interval);
    }, []);

    const updateLanguageFromPath = () => {
        const path = window.location.pathname;
        const newLang = path.startsWith("/en-US") ? "en" : "ja";
        setCurrentLang(newLang);
    };

    const currentMessages = messages[currentLang];

    return (
        <Navbar
            logo={
                <div className="flex items-center gap-2">
                    <img src="/fluorite-flake-logo.png" alt="Fluorite-Flake Logo" className="w-6 h-6" />
                    <span>
                        <b>Fluorite-Flake</b> <span className="opacity-60">{currentMessages.subtitle}</span>
                    </span>
                </div>
            }
            projectLink="https://github.com/kotsutsumi/fluorite-flake"
        >
            <a
                href={`/${currentLang === "en" ? "en-US" : "ja-JP"}/get-started`}
                className="text-inherit no-underline px-4 py-2 rounded-md transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            >
                {currentMessages.documentation}
            </a>
            <div className="flex items-center gap-2">
                <LanguageSwitcher />
                <ThemeSwitcher />
            </div>
        </Navbar>
    );
}

// EOF
