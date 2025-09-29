import type { MessageKey, MessageParams } from './types.js';
import { messageMap } from './message-map.js';
import { getLocale } from './locale-state.js';

/**
 * メッセージキーから実際のメッセージを解決する
 * 現在のロケールにメッセージがない場合は英語にフォールバック
 * @param key - メッセージキー
 * @param params - テンプレートパラメータ
 * @returns 解決されたメッセージ文字列
 */
export function resolveMessage(key: MessageKey, params: MessageParams = {}): string {
    const currentLocale = getLocale();
    // 現在のロケールのメッセージ辞書を取得
    const localeMessages = messageMap[currentLocale] ?? messageMap.en;
    const fallbackMessages = messageMap.en;
    // メッセージを検索（見つからない場合は英語版を使用）
    const message = localeMessages[key] ?? fallbackMessages[key];
    if (!message) {
        // メッセージが定義されていない場合はキーそのものを返す（デバッグ用）
        return key;
    }
    // 関数型メッセージの場合はパラメータを渡して実行
    if (typeof message === 'function') {
        return message(params);
    }
    // 単純な文字列メッセージの場合はそのまま返す
    return message;
}
