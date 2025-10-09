"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function LanguageSwitcher() {
    const [currentLang, setCurrentLang] = useState("ja");
    const router = useRouter();

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const updateLanguage = () => {
            const path = window.location.pathname;
            const newLang = path.startsWith("/en-US") ? "en" : "ja";
            setCurrentLang(newLang);
        };

        updateLanguage();

        const interval = window.setInterval(updateLanguage, 100);
        window.addEventListener("popstate", updateLanguage);

        return () => {
            window.clearInterval(interval);
            window.removeEventListener("popstate", updateLanguage);
        };
    }, []);

    const switchLanguage = (newLang) => {
        if (typeof window === "undefined") {
            return;
        }

        const currentPath = window.location.pathname;
        const cleanPath = currentPath.replace(/^\/ja-JP/, "").replace(/^\/en-US/, "") || "/";
        const newLocale = newLang === "en" ? "/en-US" : "/ja-JP";
        const newPath = cleanPath === "/" ? newLocale : newLocale + cleanPath;

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
