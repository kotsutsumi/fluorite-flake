/**
 * 日本語ロケール用のメタデータ設定
 * Nextraサイドバーの表示とナビゲーション設定
 */

// basePathを考慮したURL生成関数
function getLocalizedHref(path) {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    return `${basePath}/ja-JP${path}`;
}

export default {
    // ホームページ（非表示）
    home: {
        display: "hidden",
    },

    // はじめにページ（日本語のみ表示）
    "get-started": {
        title: "はじめに",
        display: "normal",
        href: getLocalizedHref("/get-started"),
    },
};

// EOF
