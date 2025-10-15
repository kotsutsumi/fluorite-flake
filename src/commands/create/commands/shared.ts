/**
 * createコマンド関連で共有する定数とメッセージを提供するユーティリティ
 */
import { getMessages } from "../../../i18n.js"; // 多言語メッセージを取得する関数を読み込む
import type { ProjectType } from "../types.js"; // プロジェクトタイプの型定義をインポートする

// 高度なテンプレート候補をマッピングした定数を公開する
export const ADVANCED_TEMPLATES: Partial<Record<ProjectType, readonly string[]>> = {
    nextjs: ["fullstack-admin"], // Next.jsで利用できる高度なテンプレート一覧
    expo: ["fullstack-graphql"], // Expoで利用できる高度なテンプレート一覧
    tauri: ["desktop-admin", "cross-platform"], // Tauriで利用できる高度なテンプレート一覧
};

// コマンドで利用するメッセージ群を初期化してキャッシュする
export const initialMessages = getMessages();

// EOF
