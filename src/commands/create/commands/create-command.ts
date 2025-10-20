/**
 * createコマンドの実装を提供するモジュール
 *
 * createコマンドは newCommand のエイリアスとして機能します
 */
import { defineCommand } from "citty";
import { newCommand } from "./new-command.js";

/**
 * createコマンドの定義
 * newCommand と同じ実装を使用
 */
export const createCommand = defineCommand({
    ...newCommand,
    meta: {
        ...newCommand.meta,
        name: "create",
    },
});

// EOF
