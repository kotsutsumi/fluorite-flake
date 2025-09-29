import path from 'node:path';
import fs from 'fs-extra';

/**
 * 環境変数の値を正規化します（スペースや改行が含まれる場合はクォートで囲む）
 * @param value 正規化する値
 * @returns 正規化された値
 */
function normalizeValue(value: string) {
    // 改行やスペースが含まれる場合はクォートで囲む
    if (value.includes('\n') || value.includes(' ')) {
        return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
}

/**
 * 環境変数ファイルを更新または作成します（既存のキーは更新、新しいキーは追加）
 * @param projectPath プロジェクトのパス
 * @param filename 環境変数ファイル名
 * @param updates 更新する環境変数のキー・値ペア
 */
export async function upsertEnvFile(
    projectPath: string,
    filename: string,
    updates: Record<string, string>
) {
    // 更新するキーがない場合は何もしない
    if (Object.keys(updates).length === 0) {
        return;
    }

    const filePath = path.join(projectPath, filename);
    // 既存ファイルを読み込み（存在しない場合は空文字列）
    const existing = await fs.readFile(filePath, 'utf-8').catch(() => '');
    // 改行で分割し、空行を除去
    const lines = existing.split(/\r?\n/).filter((line) => line.trim().length > 0);
    // 更新対象のキーをSetで管理
    const keys = new Set(Object.keys(updates));

    // 更新対象でない行をフィルタリング
    const filtered = lines.filter((line) => {
        const [key] = line.split('=', 1);
        return !keys.has(key ?? '');
    });

    // 更新対象のキー・値ペアを追加
    for (const [key, value] of Object.entries(updates)) {
        filtered.push(`${key}=${normalizeValue(value)}`);
    }

    // ファイルを出力（ディレクトリが存在しない場合は自動作成）
    await fs.outputFile(filePath, `${filtered.join('\n')}\n`);
}
