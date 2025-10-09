"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { useRouter } from "next/navigation";

// 言語コンテキストを作成
const LanguageContext = createContext({ language: "ja", setLanguage: () => {} });

export function LanguageSwitcher() {
    const [currentLang, setCurrentLang] = useState("ja");
    const router = useRouter();

    useEffect(() => {
        // 初期言語設定
        const updateLanguage = () => {
            const path = window.location.pathname;
            const newLang = path.startsWith("/en-US") ? "en" : "ja";
            setCurrentLang(newLang);
        };

        updateLanguage();

        // popstateイベントでブラウザの戻る/進むボタン対応
        window.addEventListener("popstate", updateLanguage);
        return () => window.removeEventListener("popstate", updateLanguage);
    }, []);

    const switchLanguage = (newLang) => {
        const currentPath = window.location.pathname;

        // 既存のロケールを削除してパスを正規化
        const cleanPath = currentPath
            .replace(/^\/ja-JP/, "")
            .replace(/^\/en-US/, "") || "/";

        // 新しいロケールでパスを構築
        const newLocale = newLang === "en" ? "/en-US" : "/ja-JP";
        const newPath = cleanPath === "/" ? newLocale : newLocale + cleanPath;

        // Next.js routerを使用してナビゲーション
        router.push(newPath);
    };

    return (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <select
                value={currentLang}
                onChange={(e) => switchLanguage(e.target.value)}
                style={{
                    padding: "4px 8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    fontSize: "14px",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                }}
            >
                <option value="ja">日本語</option>
                <option value="en">English</option>
            </select>
        </div>
    );
}

// EOF