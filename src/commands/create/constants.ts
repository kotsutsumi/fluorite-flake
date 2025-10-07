/**
 * createコマンドの定数定義
 */

/**
 * 利用可能なプロジェクトテンプレート
 */
export const PROJECT_TEMPLATES = {
    nextjs: [
        "typescript",
        "app-router",
        "pages-router",
        "javascript",
        "fullstack-admin", // フルスタック管理テンプレート
    ],
    expo: [
        "typescript",
        "tabs",
        "navigation",
        "javascript",
        "fullstack-graphql", // Expo + Next.js GraphQL バックエンド
    ],
    tauri: [
        "typescript",
        "react",
        "vanilla",
        "javascript",
        "desktop-only", // デスクトップのみ
        "desktop-admin", // デスクトップ + 管理パネル
        "cross-platform", // クロスプラットフォーム (Tauri v2 + Mobile)
    ],
} as const;

/**
 * プロジェクトタイプの詳細説明
 */
export const PROJECT_TYPE_DESCRIPTIONS = {
    nextjs: {
        name: "Next.js",
        description: "React-based full-stack web framework",
        templates: {
            typescript: "TypeScript with App Router",
            "app-router": "App Router structure",
            "pages-router": "Pages Router structure",
            javascript: "JavaScript with App Router",
            "fullstack-admin":
                "Full-Stack Admin with Auth, Organizations, Users (TypeScript)",
        },
    },
    expo: {
        name: "Expo",
        description: "React Native framework for mobile development",
        templates: {
            typescript: "TypeScript with navigation",
            tabs: "Tab-based navigation",
            navigation: "Stack navigation",
            javascript: "JavaScript with navigation",
            "fullstack-graphql":
                "Mobile + Web with GraphQL Backend (TypeScript)",
        },
    },
    tauri: {
        name: "Tauri",
        description: "Desktop application framework with web technologies",
        templates: {
            typescript: "TypeScript with React",
            react: "React with TypeScript",
            vanilla: "Vanilla JavaScript",
            javascript: "JavaScript with React",
            "desktop-only": "Desktop Application Only",
            "desktop-admin": "Desktop + Admin Panel",
            "cross-platform": "Cross-Platform (Desktop + Mobile)",
        },
    },
} as const;

// EOF
