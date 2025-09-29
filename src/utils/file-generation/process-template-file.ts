import fs from 'fs-extra';
import { processTemplate } from './process-template.js';
import { writeCodeFile } from './write-code-file.js';

/**
 * テンプレートファイルを読み込み、変数を処理します
 * @param templatePath テンプレートファイルのパス
 * @param variables 置換する変数のキー・値ペア
 * @param outputPath 出力先のファイルパス
 */
export async function processTemplateFile(
    templatePath: string,
    variables: Record<string, string | number | boolean>,
    outputPath: string
): Promise<void> {
    const template = await fs.readFile(templatePath, 'utf-8');
    const processed = processTemplate(template, variables);
    await writeCodeFile(outputPath, processed);
}
