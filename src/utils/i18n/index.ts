/**
 * 国際化（i18n）モジュール
 * CLIの多言語対応を管理し、ロケールに応じたメッセージを提供する
 */

// 型定義をエクスポート
export type { SupportedLocale, MessageKey, MessageParams } from './types.js';

// ロケール管理関数をエクスポート
export { setLocale, getLocale } from './locale-state.js';

// 翻訳関数をエクスポート
export { t } from './translate.js';

// ヘルパー関数をエクスポート
export { formatInvalidOption } from './format-invalid-option.js';

// 個別メッセージ取得関数をエクスポート
export { getCliDescription } from './cli-messages.js';
export { getCreateCommandDescription } from './create-messages.js';
export { getLocaleOptionDescription } from './locale-option-messages.js';
export {
    getMissingArgsMessage,
    getOrmRequiredMessage,
    getInvalidR2ActionMessage,
} from './error-messages.js';
