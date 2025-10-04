/**
 * 文字列をURLフレンドリーなスラッグに変換します
 * @param value 変換する文字列
 * @returns スラッグ化された文字列
 * @example
 * slugify('Hello World!') // => 'hello-world'
 * slugify('My Project 123') // => 'my-project-123'
 */
export function slugify(value: string): string {
    return value
        .toLowerCase() // 小文字に変換
        .replace(/[^a-z0-9]+/g, '-') // 英数字以外をハイフンに置換
        .replace(/^-+|-+$/g, '') // 先頭と末尾のハイフンを削除
        .replace(/-{2,}/g, '-'); // 連続するハイフンを単一に統合
}
