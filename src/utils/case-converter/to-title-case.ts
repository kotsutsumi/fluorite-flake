/**
 * 文字列をタイトルケースに変換する
 * 例: "my-project" → "My Project", "fluorite-flake" → "Fluorite Flake"
 */

/**
 * 文字列をタイトルケースに変換する関数
 * @param str - 変換する文字列
 * @returns タイトルケース形式の文字列（単語間にスペース）
 */
export function toTitleCase(str: string): string {
    // 空文字列の場合はそのまま返す
    if (!str) return str;

    // ハイフン、アンダースコアで分割し、各単語の先頭を大文字にしてスペースで結合
    return str
        .split(/[-_]+/)
        .filter((word) => word.length > 0)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
}

// EOF
