/**
 * 国際化（i18n）モジュール
 *
 * このファイルは後方互換性のために保持されています。
 * 新しい実装は ./i18n/ ディレクトリに分割されています。
 */

// 型定義とすべての関数を再エクスポート
export type { SupportedLocale, MessageKey, MessageParams } from './i18n/index.js';
export {
    setLocale,
    getLocale,
    t,
    formatInvalidOption,
    getCliDescription,
    getCreateCommandDescription,
    getLocaleOptionDescription,
    getMissingArgsMessage,
    getOrmRequiredMessage,
    getInvalidR2ActionMessage,
} from './i18n/index.js';
