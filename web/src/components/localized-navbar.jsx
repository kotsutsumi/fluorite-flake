"use client";
import { useState, useEffect } from "react";
import { Navbar } from "nextra-theme-docs";

import { LanguageSwitcher } from "./language-switcher.jsx";

// 多言語対応メッセージ
const messages = {
    "ja": {
        subtitle: "フルスタック開発ツール",
    },
    "en": {
        subtitle: "Full-stack Development Tool",
    }
};

export function LocalizedNavbar() {
    const [currentLang, setCurrentLang] = useState('ja');
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
        const newLang = path.startsWith('/en-US') ? 'en' : 'ja';
        setCurrentLang(newLang);
    };

    const currentMessages = messages[currentLang];

    return (
        <Navbar
            logo={
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <img
                        src="/fluorite-flake-logo.png"
                        alt="Fluorite-flake Logo"
                        style={{ width: "24px", height: "24px" }}
                    />
                    <span>
                        <b>Fluorite-flake</b> <span style={{ opacity: "60%" }}>{currentMessages.subtitle}</span>
                    </span>
                </div>
            }
            projectLink="https://github.com/kotsutsumi/fluorite-flake"
        >
            <LanguageSwitcher />
        </Navbar>
    );
}

// EOF