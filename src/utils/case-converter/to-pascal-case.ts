/**
 * 文字列をパスカルケースに変換する
 * 例: "my-project" → "MyProject", "fluorite-flake" → "FluoriteFlake"
 */

/**
 * 文字列をパスカルケースに変換する関数
 * @param str - 変換する文字列
 * @returns パスカルケース形式の文字列
 */
export function toPascalCase(str: string): string {
    // 空文字列の場合はそのまま返す
    if (!str) return str;

    // ハイフン、アンダースコア、スペースで分割し、各単語の先頭を大文字にして結合
    return str
        .split(/[-_\s]+/)
        .filter((word) => word.length > 0)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join("");
}

// EOF
