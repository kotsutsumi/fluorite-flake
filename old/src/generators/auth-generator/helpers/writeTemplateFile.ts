import path from 'node:path';
import fs from 'fs-extra';
import { type TemplateOptions, renderTemplate } from './renderTemplate.js';

/**
 * テンプレートファイルを指定の場所に書き込む
 * テンプレートの読み込み、処理、ディレクトリ作成、ファイル書き込みを一括で行う
 */
export async function writeTemplateFile(
    destination: string,
    templatePath: string,
    options?: TemplateOptions
) {
    const content = await renderTemplate(templatePath, options ?? {});
    await fs.ensureDir(path.dirname(destination));
    await fs.writeFile(destination, content);
}
