/**
 * 文字列をケバブケースに変換する
 * 例: "MyProject" → "my-project", "FluoriteFlake" → "fluorite-flake"
 */

/**
 * 文字列をケバブケースに変換する関数
 * @param str - 変換する文字列
 * @returns ケバブケース形式の文字列
 */
export function toKebabCase(str: string): string {
    // 空文字列の場合はそのまま返す
    if (!str) return str;

    // パスカルケース、キャメルケース、スペース区切りなどを処理
    return (
        str
            // 大文字の前にハイフンを挿入（先頭は除く）
            .replace(/([a-z])([A-Z])/g, "$1-$2")
            // 数字の前にハイフンを挿入
            .replace(/([a-zA-Z])(\d)/g, "$1-$2")
            // 数字の後にハイフンを挿入
            .replace(/(\d)([a-zA-Z])/g, "$1-$2")
            // アンダースコアやスペースをハイフンに置換
            .replace(/[_\s]+/g, "-")
            // 連続するハイフンを1つに
            .replace(/-+/g, "-")
            // 全体を小文字に
            .toLowerCase()
            // 前後のハイフンを削除
            .replace(/^-+|-+$/g, "")
    );
}

// EOF
