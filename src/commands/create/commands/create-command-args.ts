/**
 * create/newコマンドで共有する引数定義を保持するモジュール
 */
import { initialMessages } from "./shared.js"; // 引数説明文に利用するメッセージを読み込む

/**
 * createコマンド用の引数定義オブジェクト
 */
export const createCommandArgs = {
    name: {
        type: "positional", // プロジェクト名は位置引数で受け取る
        description: initialMessages.create.args.name, // 説明文
        required: false, // 任意入力
    },
    type: {
        type: "string", // プロジェクトタイプを文字列で受け取る
        description: initialMessages.create.args.type, // 説明文
        alias: "t", // ショートハンド
    },
    template: {
        type: "string", // テンプレート指定
        description: initialMessages.create.args.template, // 説明文
        alias: "T", // ショートハンド
    },
    dir: {
        type: "string", // 出力ディレクトリ指定
        description: initialMessages.create.args.dir, // 説明文
        alias: "d", // ショートハンド
    },
    force: {
        type: "boolean", // 既存ディレクトリ上書きのフラグ
        description: initialMessages.create.args.force, // 説明文
        alias: "f", // ショートハンド
    },
    monorepo: {
        type: "boolean", // モノレポ構成を切り替える真偽値
        description: initialMessages.create.args.monorepo, // 説明文
        alias: "m", // ショートハンド
        default: true, // デフォルトでモノレポ有効
    },
    simple: {
        type: "boolean", // シンプル構成を選択する真偽値
        description: "Create a simple project (non-monorepo structure)", // 説明文
        alias: "s", // ショートハンド
    },
    database: {
        type: "string", // データベース種別を文字列入力
        description: initialMessages.create.args.database, // 説明文
        alias: "db", // ショートハンド
    },
} as const;

// EOF
