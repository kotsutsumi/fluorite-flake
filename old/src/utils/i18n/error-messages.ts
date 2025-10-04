import { t } from './translate.js';

/**
 * 必須引数不足エラーメッセージを取得
 */
export function getMissingArgsMessage(): string {
    return t('create.missingRequiredArgs');
}

/**
 * ORM必須エラーメッセージを取得
 */
export function getOrmRequiredMessage(): string {
    return t('create.ormRequired');
}

/**
 * 無効なR2アクションエラーメッセージを取得
 */
export function getInvalidR2ActionMessage(): string {
    return t('r2.invalidAction');
}
