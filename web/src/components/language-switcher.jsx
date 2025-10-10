"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function LanguageSwitcher() {
    const [currentLang, setCurrentLang] = useState("ja");
    const router = useRouter();

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const updateLanguage = () => {
            const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
            const path = window.location.pathname;

            // basePathを除去してから言語判定を行う
            const pathWithoutBase = path.replace(new RegExp(`^${basePath}`), "");
            const newLang = pathWithoutBase.startsWith("/en-US") ? "en" : "ja";
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

        setCurrentLang(newLang);

        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
        const currentPath = window.location.pathname;

        // basePathを除去してから言語切り替えを行う
        const pathWithoutBase = currentPath.replace(new RegExp(`^${basePath}`), "");
        const cleanPath = pathWithoutBase.replace(/^\/ja-JP/, "").replace(/^\/en-US/, "") || "/";
        const newLocale = newLang === "en" ? "/en-US" : "/ja-JP";
        const newPath = cleanPath === "/" ? newLocale : newLocale + cleanPath;

        router.push(newPath);
    };

    return (
        <Select value={currentLang} onValueChange={switchLanguage}>
            <SelectTrigger className="w-28">
                <SelectValue placeholder="言語" aria-label={currentLang === "ja" ? "日本語" : "English"} />
            </SelectTrigger>
            <SelectContent className="bg-background/95 backdrop-blur border-border">
                <SelectItem className="focus:bg-accent focus:text-accent-foreground hover:bg-accent/80" value="ja">
                    日本語
                </SelectItem>
                <SelectItem className="focus:bg-accent focus:text-accent-foreground hover:bg-accent/80" value="en">
                    English
                </SelectItem>
            </SelectContent>
        </Select>
    );
}

// EOF
