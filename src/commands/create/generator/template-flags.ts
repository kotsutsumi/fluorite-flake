/**
 * テンプレートの種類を判定するユーティリティ
 */
import type { ProjectConfig } from "../types.js"; // プロジェクト設定の型を取り込む

/**
 * 指定された設定が拡張テンプレートを要求するかを判定する
 */
export function isAdvancedTemplate(config: ProjectConfig): boolean {
    // Next.js拡張テンプレートの判定
    const isNextJsAdvanced = config.type === "nextjs" && config.template === "fullstack-admin";

    // Expo拡張テンプレートの判定
    const isExpoAdvanced =
        config.type === "expo" && (config.template === "fullstack-graphql" || config.template === "fullstack-admin");

    // Tauri拡張テンプレートの判定
    const isTauriAdvanced = config.type === "tauri" && config.template === "cross-platform";

    // いずれかが該当すれば拡張テンプレートとみなす
    return isNextJsAdvanced || isExpoAdvanced || isTauriAdvanced;
}

// EOF
