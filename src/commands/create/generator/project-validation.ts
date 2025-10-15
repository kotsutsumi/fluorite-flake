/**
 * プロジェクト生成前の事前検証を提供するモジュール
 */
import fs from "node:fs"; // ファイルアクセス用ユーティリティ
import path from "node:path"; // パス操作ユーティリティ

import type { ProjectConfig } from "../types.js"; // プロジェクト設定型

/**
 * プロジェクト生成が実行可能かを検証する
 */
export function validateProjectGeneration(config: ProjectConfig): { valid: boolean; reason?: string } {
    try {
        if (!config.directory || config.directory.trim() === "") {
            return { valid: false, reason: "プロジェクトディレクトリが指定されていません" }; // ディレクトリ名が空の場合の防御
        }

        const invalidChars = /[<>:"|?*]/; // 禁止文字を定義する
        if (invalidChars.test(config.directory)) {
            return { valid: false, reason: "プロジェクトディレクトリ名に無効な文字が含まれています" }; // 無効文字が含まれる場合
        }

        const parentDir = path.dirname(path.resolve(config.directory)); // 親ディレクトリを求める
        try {
            fs.accessSync(parentDir, fs.constants.W_OK); // 書き込み権限をチェックする
        } catch {
            return { valid: false, reason: `親ディレクトリへの書き込み権限がありません: ${parentDir}` }; // 権限不足の場合
        }

        if (!config.name || config.name.trim() === "") {
            return { valid: false, reason: "プロジェクト名が指定されていません" }; // プロジェクト名が空の場合
        }

        return { valid: true }; // すべて問題なければ成功
    } catch (error) {
        return { valid: false, reason: `事前検証中にエラーが発生: ${error}` }; // 例外発生時に理由を添えて返す
    }
}

// EOF
