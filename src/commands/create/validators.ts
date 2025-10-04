/**
 * createコマンドのバリデーション関数
 */
import { PROJECT_TEMPLATES } from "./constants.js";

/**
 * プロジェクトタイプの検証
 */
export function validateProjectType(
    type: string
): type is keyof typeof PROJECT_TEMPLATES {
    return type in PROJECT_TEMPLATES;
}

/**
 * プロジェクトタイプ用テンプレートの検証
 */
export function validateTemplate(
    type: keyof typeof PROJECT_TEMPLATES,
    template: string
): boolean {
    return (PROJECT_TEMPLATES[type] as readonly string[]).includes(template);
}

// EOF
