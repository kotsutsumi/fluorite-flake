import path from 'node:path';
import fs from 'fs-extra';

/**
 * オブジェクトのキーを再帰的にソートするヘルパー関数
 * @param obj ソートするオブジェクト
 * @returns キーがソートされたオブジェクト
 */
function sortObjectKeys<T>(obj: T): T {
    // プリミティブ値、null、配列の場合はそのまま返す
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
        return obj;
    }

    const sorted = {} as T;
    // キーをアルファベット順にソート
    const keys = Object.keys(obj as Record<string, unknown>).sort();

    // ソートされたキーで新しいオブジェクトを構築
    for (const key of keys) {
        const value = (obj as Record<string, unknown>)[key];
        (sorted as Record<string, unknown>)[key] = sortObjectKeys(value);
    }

    return sorted;
}

/**
 * 一貫したフォーマットでJSONコンフィグファイルを書き込みます
 * @param filePath 書き込み先のファイルパス
 * @param config 書き込む設定オブジェクト
 * @param options フォーマットオプション
 * @param options.spaces インデントスペース数（デフォルト: 2）
 * @param options.sortKeys キーをソートするかどうか
 */
export async function writeConfigFile<T extends Record<string, unknown>>(
    filePath: string,
    config: T,
    options?: {
        spaces?: number;
        sortKeys?: boolean;
    }
): Promise<void> {
    let configToWrite = config;

    if (options?.sortKeys) {
        configToWrite = sortObjectKeys(config) as T;
    }

    await fs.ensureDir(path.dirname(filePath));
    await fs.writeJSON(filePath, configToWrite, {
        spaces: options?.spaces ?? 2,
    });
}
