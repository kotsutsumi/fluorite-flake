import { resolveMessage } from './message-resolver.js';
import type { MessageKey, MessageParams } from './types.js';

/**
 * メッセージを翻訳する（tは'translate'の省略形）
 * 国際化のメイン関数
 * @param key - メッセージキー
 * @param params - テンプレートパラメータ
 * @returns 翻訳されたメッセージ
 */
export function t(key: MessageKey, params?: MessageParams): string {
    return resolveMessage(key, params);
}
