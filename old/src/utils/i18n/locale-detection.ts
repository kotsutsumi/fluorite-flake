import type { SupportedLocale } from './types.js';

// サポートしているロケール一覧
const SUPPORTED_LOCALES = ['en', 'ja'] as const;

/**
 * 言語タグを抽出して正規化する
 * アンダースコアをハイフンに変換（例: ja_JP → ja-JP）
 * @param value - 入力文字列（環境変数など）
 * @returns 正規化された言語タグまたはundefined
 */
function extractLanguageTag(value?: string | null): string | undefined {
    if (!value) {
        return undefined;
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return undefined;
    }
    // POSIX形式（ja_JP）をBCP47形式（ja-JP）に変換
    return trimmed.replace('_', '-');
}

/**
 * 環境変数から初期ロケールを決定する
 * 優先順位：
 * 1. FLUORITE_LOCALE（専用環境変数）
 * 2. LC_ALL, LC_MESSAGES, LANG（標準的なロケール環境変数）
 * 3. システムのデフォルトロケール（Intl API経由）
 * @returns ロケール文字列またはundefined
 */
export function initialLocaleFromEnvironment(): string | undefined {
    // 専用環境変数を最優先でチェック
    const forced = extractLanguageTag(process.env.FLUORITE_LOCALE);
    if (forced) {
        return forced;
    }
    // 標準的なロケール環境変数を順番にチェック
    const candidates = [process.env.LC_ALL, process.env.LC_MESSAGES, process.env.LANG];
    for (const candidate of candidates) {
        const tag = extractLanguageTag(candidate);
        if (tag) {
            return tag;
        }
    }
    // システムのデフォルトロケールを取得
    try {
        const resolved = Intl.DateTimeFormat().resolvedOptions().locale;
        if (resolved) {
            return resolved;
        }
    } catch {
        // Intl APIが利用できない環境では無視してデフォルトへフォールバック
    }
    return undefined;
}

/**
 * ロケール文字列をサポートされているロケールに正規化する
 * 例: 'ja-JP' → 'ja', 'en-US' → 'en'
 * @param value - 入力ロケール文字列
 * @returns サポートされているロケール（デフォルト: 'en'）
 */
export function normalizeLocale(value?: string | null): SupportedLocale {
    if (!value || typeof value !== 'string') {
        return 'en'; // デフォルトは英語
    }
    const lower = value.toLowerCase();
    // サポートされているロケールにマッチするかチェック
    for (const locale of SUPPORTED_LOCALES) {
        // 完全一致または地域コード付きの一致を確認（例: 'ja' or 'ja-JP'）
        if (lower === locale || lower.startsWith(`${locale}-`)) {
            return locale;
        }
    }
    return 'en'; // マッチしない場合は英語にフォールバック
}
