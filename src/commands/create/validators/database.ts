/**
 * データベース関連のバリデーションとエラーメッセージ表示を担当するモジュール
 */
import { getMessages } from "../../../i18n.js"; // CLIメッセージ辞書を取得する関数を読み込む
import type { DatabaseType } from "../types.js"; // データベース種別の型定義を取り込む

/**
 * 指定された文字列が有効なデータベースタイプかを判定する
 */
export function validateDatabase(database: string): database is DatabaseType {
    const validDatabases: DatabaseType[] = ["turso", "supabase", "sqlite"]; // サポート対象のデータベース一覧を定義する
    return validDatabases.includes(database as DatabaseType); // 入力値が一覧に含まれているかを確認する
}

/**
 * 無効なデータベースタイプが入力された場合にエラーメッセージを表示する
 */
export function showInvalidDatabaseError(database: string): void {
    const { create } = getMessages(); // createセクションのメッセージ群を取得する
    console.error(create.invalidDatabase(database)); // 無効なデータベース名を含むエラーメッセージを表示する
    console.error(create.availableDatabases); // 利用可能なデータベース一覧を案内する
}

// EOF
