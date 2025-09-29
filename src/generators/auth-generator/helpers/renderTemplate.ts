import { readTemplate, readTemplateWithReplacements } from '../../../utils/template-reader.js';

/**
 * テンプレートオプション（置換文字列とフラグ）の型定義
 */
export type TemplateOptions = {
    replacements?: Record<string, string>;
    flags?: Record<string, boolean>;
};

/**
 * テンプレートファイルを読み込み、文字列置換とフラグベースの条件分岐を処理する
 * 置換文字列とフラグベースの条件分岐（{{#if flag}}...{{/if}}）をサポート
 */
export async function renderTemplate(templatePath: string, options: TemplateOptions = {}) {
    const { replacements, flags } = options;

    let content = replacements
        ? await readTemplateWithReplacements(templatePath, replacements)
        : await readTemplate(templatePath);

    if (flags) {
        const flagMap = flags;
        content = content.replace(
            /{{#if (\w+)}}([\s\S]*?)(?:{{else}}([\s\S]*?))?{{\/if}}/g,
            (_match, key, truthy, falsy) => {
                return flagMap[key] ? truthy : (falsy ?? '');
            }
        );
    }

    return content;
}
