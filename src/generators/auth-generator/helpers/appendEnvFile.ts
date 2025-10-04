import fs from 'fs-extra';

/**
 * 環境変数ファイルに新しい設定を追加する
 * 既存の内容と重複しないように、未追加の行のみを追記する
 */
export async function appendEnvFile(envPath: string, block: string) {
    let existing = '';

    try {
        existing = await fs.readFile(envPath, 'utf-8');
    } catch (_error) {
        // ファイルがまだ存在しない
    }

    const linesToAdd = block
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    const linesMissing = linesToAdd.filter((line) => !existing.includes(line));

    if (linesMissing.length === 0) {
        return;
    }

    const newline = existing.endsWith('\n') || existing.length === 0 ? '' : '\n';
    const updated = `${existing}${newline}${linesMissing.join('\n')}\n`;
    await fs.outputFile(envPath, updated);
}
