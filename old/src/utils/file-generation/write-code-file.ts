import path from 'node:path';
import fs from 'fs-extra';

/**
 * 適切なフォーマットでTypeScript/JavaScriptファイルを書き込みます
 * @param filePath 書き込み先のファイルパス
 * @param content ファイルの内容
 * @param options 書き込みオプション
 * @param options.addHeader ヘッダーコメントを追加するかどうか
 * @param options.headerComment カスタムヘッダーコメント
 */
export async function writeCodeFile(
    filePath: string,
    content: string,
    options?: {
        addHeader?: boolean;
        headerComment?: string;
    }
): Promise<void> {
    let finalContent = content;

    // ヘッダーコメントを追加する場合
    if (options?.addHeader) {
        const header =
            options.headerComment ??
            `/**\n * fluorite-flakeによって生成されました\n * ${new Date().toISOString()}\n */\n\n`;
        finalContent = header + content;
    }

    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, finalContent);
}
