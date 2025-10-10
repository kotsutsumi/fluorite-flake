/**
 * 英語ロケール用のメタデータ設定
 * Nextraサイドバーの表示とナビゲーション設定
 */

// basePathを考慮したURL生成関数
function getLocalizedHref(path) {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    return `${basePath}/en-US${path}`;
}

export default {
    // ホームページ（非表示）
    home: {
        display: "hidden",
    },

    // はじめにページ（英語のみ表示）
    "get-started": {
        title: "Get Started",
        display: "normal",
        href: getLocalizedHref("/get-started"),
    },
};
