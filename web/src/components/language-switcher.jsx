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

        // URLの変更を定期的に監視（Next.js SPAのナビゲーション対応）
        const interval = setInterval(updateLanguage, 100);

        // popstateイベントでブラウザの戻る/進むボタン対応
        window.addEventListener("popstate", updateLanguage);

        return () => {
            clearInterval(interval);
            window.removeEventListener("popstate", updateLanguage);
        };
    }, []);

    const switchLanguage = (newLang) => {
        const currentPath = window.location.pathname;

        // 既存のロケールを削除してパスを正規化
        const cleanPath = currentPath.replace(/^\/ja-JP/, "").replace(/^\/en-US/, "") || "/";

        // 新しいロケールでパスを構築
        const newLocale = newLang === "en" ? "/en-US" : "/ja-JP";
        const newPath = cleanPath === "/" ? newLocale : newLocale + cleanPath;

        // Next.js routerを使用してナビゲーション
        router.push(newPath);
    };

    return (
        <div className="flex items-center gap-2">
            <select
                value={currentLang}
                onChange={(e) => switchLanguage(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-sm bg-transparent cursor-pointer hover:border-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none transition-colors"
            >
                <option value="ja">日本語</option>
                <option value="en">English</option>
            </select>
        </div>
    );
}

// EOF
