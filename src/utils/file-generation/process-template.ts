/**
 * 変数置換を使用してテンプレートを処理します
 * @param template 処理するテンプレート文字列
 * @param variables 置換する変数のキー・値ペア
 * @returns 処理されたテンプレート内容
 */
export function processTemplate(
    template: string,
    variables: Record<string, string | number | boolean>
): string {
    // {{key}}形式の変数を置換
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        const value = variables[key];
        return value !== undefined ? String(value) : match;
    });
}
