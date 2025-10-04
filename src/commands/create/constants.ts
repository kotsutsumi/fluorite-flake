/**
 * createコマンドの定数定義
 */

/**
 * 利用可能なプロジェクトテンプレート
 */
export const PROJECT_TEMPLATES = {
    nextjs: ["typescript", "app-router", "pages-router", "javascript"],
    expo: ["typescript", "tabs", "navigation", "javascript"],
    tauri: ["typescript", "react", "vanilla", "javascript"],
} as const;

// EOF
