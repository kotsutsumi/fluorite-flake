/**
 * フレームワーク設定組み合わせ検証関数
 */

import { DATABASE_CONFIGS } from '../database-configs.js';
import type { DatabaseType, FrameworkType, OrmType, StorageType } from '../types.js';
import { getFrameworkConfig } from './getFrameworkConfig.js';

/**
 * フレームワーク設定の組み合わせを検証
 * @param config - 検証したい設定の組み合わせ
 * @returns 検証結果とエラーメッセージ
 */
export function validateConfiguration(config: {
    framework: FrameworkType; // フレームワーク種類
    database: DatabaseType; // データベース種類
    orm?: OrmType; // ORM種類（オプション）
    storage: StorageType; // ストレージ種類
}): { valid: boolean; errors: string[] } {
    const errors: string[] = []; // エラーメッセージの配列
    const frameworkConfig = getFrameworkConfig(config.framework);

    // データベースのサポートチェック
    if (
        config.database !== 'none' &&
        !frameworkConfig.supportedDatabases.includes(config.database)
    ) {
        errors.push(
            `${frameworkConfig.displayName}は${config.database}データベースをサポートしていません`
        );
    }

    // ORMのサポートチェック
    if (config.orm && config.database !== 'none') {
        const dbConfig = DATABASE_CONFIGS[config.database as keyof typeof DATABASE_CONFIGS];
        if (dbConfig && !dbConfig.supportedOrms.includes(config.orm)) {
            errors.push(`${config.database}は${config.orm} ORMをサポートしていません`);
        }
    }

    // ストレージのサポートチェック
    if (config.storage !== 'none' && !frameworkConfig.supportedStorage.includes(config.storage)) {
        errors.push(
            `${frameworkConfig.displayName}は${config.storage}ストレージをサポートしていません`
        );
    }

    return {
        valid: errors.length === 0, // エラーがないかどうか
        errors, // エラーメッセージの配列
    };
}
