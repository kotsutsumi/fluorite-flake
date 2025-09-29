import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs-extra';

// ES Modules環境で__dirname相当を取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * templatesディレクトリからテンプレートファイルを読み込みます
 * @param templatePath src/templates/ディレクトリからの相対パス
 * @returns テンプレートの内容（文字列）
 */
export async function readTemplate(templatePath: string): Promise<string> {
    // テンプレートファイルのフルパスを構築
    const fullPath = path.join(__dirname, '..', 'templates', templatePath);
    return await fs.readFile(fullPath, 'utf8');
}

/**
 * テンプレートを読み込み、プレースホルダーを置換します
 * @param templatePath src/templates/ディレクトリからの相対パス
 * @param replacements 置換用のキー・値ペア
 * @returns 処理されたテンプレート内容
 */
export async function readTemplateWithReplacements(
    templatePath: string,
    replacements: Record<string, string>
): Promise<string> {
    let content = await readTemplate(templatePath);

    // 置換用キーと値のペアを順次処理
    for (const [key, value] of Object.entries(replacements)) {
        // {{key}}形式のプレースホルダーを全て置換
        const regex = new RegExp(`{{${key}}}`, 'g');
        content = content.replace(regex, value);
    }

    return content;
}

/**
 * テンプレートファイルが存在するかチェックします
 * @param templatePath src/templates/ディレクトリからの相対パス
 * @returns テンプレートが存在する場合はtrue
 */
export async function templateExists(templatePath: string): Promise<boolean> {
    // テンプレートファイルのフルパスを構築
    const fullPath = path.join(__dirname, '..', 'templates', templatePath);
    return await fs.pathExists(fullPath);
}
