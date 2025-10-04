import { validatePnpm } from "../../utils/pnpm-validator/index.js";
import type { PROJECT_TEMPLATES } from "./constants.js";
import type { CreateOptions, ProjectConfig } from "./types.js";
import { validateProjectType, validateTemplate } from "./validators.js";

/**
 * 引数からプロジェクト設定を作成
 */
export function createProjectConfig(
    projectType: string,
    options: CreateOptions
): ProjectConfig | null {
    // 未使用警告を避けるため、後で使用する予定のメッセージを取得
    // const { create } = getMessages();

    // monorepo-ready構造のためpnpmの存在を確認（デフォルトでmonorepo=trueのため常時チェック）
    let willUseMonorepo: boolean;
    if (options.simple) {
        willUseMonorepo = false;
    } else if (options.monorepo !== undefined) {
        willUseMonorepo = Boolean(options.monorepo);
    } else {
        willUseMonorepo = true;
    }
    if (willUseMonorepo) {
        const pnpmValid = validatePnpm();
        if (!pnpmValid) {
            return null;
        }
    }

    // プロジェクトタイプの検証
    if (!validateProjectType(projectType)) {
        return null;
    }

    const typedProjectType = projectType as keyof typeof PROJECT_TEMPLATES;

    // デフォルト値の設定
    const projectName = options.name || "my-fluorite-project";
    const directory = options.dir || projectName;
    const template = options.template || "typescript";

    // テンプレートの検証
    if (!validateTemplate(typedProjectType, template)) {
        return null;
    }

    // プロジェクト設定を返す（デフォルトでmonorepo-ready構造）
    return {
        type: typedProjectType,
        name: projectName,
        directory,
        template,
        force: Boolean(options.force),
        monorepo: willUseMonorepo, // 上で計算済み
    };
}

// EOF
