/**
 * アプリレベルのメタデータ設定
 * サイドバーに表示する項目を完全制御
 */
export default {
    // ルートページ（リダイレクト用）を非表示
    index: {
        display: "hidden",
    },

    // ショーケースページを非表示
    showcase: {
        display: "hidden",
    },

    // 言語グループを非表示にして言語固有のページのみ表示
    "en-US": {
        display: "hidden",
    },

    "ja-JP": {
        display: "hidden",
    },
};

// EOF