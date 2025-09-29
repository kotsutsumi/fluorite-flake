/**
 * 文字列の最初の文字を大文字にする
 * TypeScriptの組み込み型Capitalize<T>と互換性のある実装
 * @param input - 入力文字列
 * @returns 最初の文字が大文字になった文字列
 */
export function capitalize<T extends string>(input: T): Capitalize<T> {
    return (input.charAt(0).toUpperCase() + input.slice(1)) as Capitalize<T>;
}
