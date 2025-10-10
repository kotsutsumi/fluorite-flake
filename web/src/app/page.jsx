"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

function getLocaleFromBrowser() {
    // ブラウザの言語設定を取得
    if (typeof navigator !== "undefined") {
        const language = navigator.language || navigator.userLanguage;

        // 日本語が含まれている場合は ja-JP を返す
        if (language.includes("ja")) {
            return "ja-JP";
        }
    }

    // デフォルトは en-US
    return "en-US";
}

export default function HomePage() {
    const router = useRouter();

    useEffect(() => {
        const locale = getLocaleFromBrowser();
        // basePathを考慮したクライアントサイドリダイレクト
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
        router.push(`${basePath}/${locale}`);
    }, [router]);

    // ローディング中の表示
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100vh",
                fontFamily: "system-ui, sans-serif",
            }}
        >
            <div>
                <div>Loading...</div>
                <div style={{ marginTop: "8px", fontSize: "14px", color: "#666" }}>
                    Redirecting to appropriate language...
                </div>
            </div>
        </div>
    );
}
