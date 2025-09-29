/**
 * フレームワーク設定ヘルパー関数
 * フレームワーク設定の取得、検証、機能チェック等のユーティリティ関数
 */

import { DATABASE_CONFIGS } from './database-configs.js';
import { FRAMEWORK_CONFIGS } from './frameworks.js';
import type {
    DatabaseType,
    FrameworkConfig,
    FrameworkFeatures,
    FrameworkType,
    OrmType,
    StorageType,
} from './types.js';

/**
 * フレームワーク設定を取得
 * @param framework - 取得したいフレームワークの種類
 * @returns 指定されたフレームワークの設定
 */
export function getFrameworkConfig(framework: FrameworkType): FrameworkConfig {
    return FRAMEWORK_CONFIGS[framework];
}

/**
 * フレームワークが特定の機能をサポートしているかチェック
 * @param framework - チェックしたいフレームワーク
 * @param feature - チェックしたい機能
 * @returns 機能サポートの有無
 */
export function supportsFeature(
    framework: FrameworkType,
    feature: keyof FrameworkFeatures
): boolean {
    return FRAMEWORK_CONFIGS[framework].supportedFeatures[feature];
}

/**
 * フレームワークがサポートするデータベース一覧を取得
 * @param framework - 対象フレームワーク
 * @returns サポートされているデータベースの配列
 */
export function getSupportedDatabases(framework: FrameworkType): DatabaseType[] {
    return FRAMEWORK_CONFIGS[framework].supportedDatabases;
}

/**
 * フレームワークがサポートするストレージサービス一覧を取得
 * @param framework - 対象フレームワーク
 * @returns サポートされているストレージサービスの配列
 */
export function getSupportedStorage(framework: FrameworkType): StorageType[] {
    return FRAMEWORK_CONFIGS[framework].supportedStorage;
}

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
