"use client";
import Image from "next/image";
import { Navbar } from "nextra-theme-docs";
import { useCallback, useEffect, useState } from "react";

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

    const updateLanguageFromPath = useCallback(() => {
        if (typeof window === "undefined" || typeof MutationObserver === "undefined") {
            return;
        }

        const path = window.location.pathname;
        const newLang = path.startsWith("/en-US") ? "en" : "ja";
        setCurrentLang(newLang);
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        updateLanguageFromPath();

        const handleRouteChange = () => {
            updateLanguageFromPath();
        };

        window.addEventListener("popstate", handleRouteChange);

        const observer = new MutationObserver(handleRouteChange);
        observer.observe(document, { subtree: true, childList: true });

        return () => {
            window.removeEventListener("popstate", handleRouteChange);
            observer.disconnect();
        };
    }, [updateLanguageFromPath]);

    useEffect(() => {
        if (typeof window === "undefined") {
            return undefined;
        }

        const interval = setInterval(() => {
            updateLanguageFromPath();
        }, 100);

        return () => clearInterval(interval);
    }, [updateLanguageFromPath]);

    const currentMessages = messages[currentLang];

    return (
        <Navbar
            logo={
                <div className="flex items-center gap-2">
                    <Image src="/fluorite-flake-logo.png" alt="Fluorite-Flake Logo" width={24} height={24} priority />
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
