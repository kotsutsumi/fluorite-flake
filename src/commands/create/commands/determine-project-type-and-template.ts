/**
 * プロジェクトタイプとテンプレート選択ロジックを担当するモジュール
 */
import { selectProjectTemplate } from "../template-selector/index.js"; // テンプレート選択UIを提供する関数を読み込む
import { validateProjectType } from "../validators/index.js"; // プロジェクトタイプの検証関数を取り込む
import { ADVANCED_TEMPLATES } from "./shared.js"; // 高度テンプレートのマップを利用する

/**
 * ユーザー入力をもとにプロジェクトタイプとテンプレートを決定する
 */
export async function determineProjectTypeAndTemplate(
    args: {
        type?: string;
        template?: string;
        simple?: boolean;
        monorepo?: boolean;
    },
    hasExplicitMonorepo: boolean
): Promise<{
    projectType: string;
    template: string | undefined;
    monorepoPreference: boolean | undefined;
}> {
    // 引数として渡された値をローカル変数に保持する
    let projectType = args.type;
    let template = args.template;
    let monorepoPreference: boolean | undefined;

    // simpleフラグ時はモノレポを強制的に無効化する
    if (args.simple) {
        monorepoPreference = false;
    } else if (hasExplicitMonorepo) {
        // フラグが明示されている場合はそのまま尊重する
        monorepoPreference = Boolean(args.monorepo);
    }

    // タイプやテンプレートが足りない場合は対話的な選択フローを起動する
    const shouldPromptForSelection = !(projectType && template);
    if (shouldPromptForSelection) {
        // 事前入力されたタイプが妥当な場合は初期選択として渡す
        const initialProjectType = projectType && validateProjectType(projectType) ? projectType : undefined;

        // テンプレートセレクタを表示し、選択結果を取得する
        const selection = await selectProjectTemplate(initialProjectType, {
            templateFilter: ({ projectType: selectedType, templateKey }) => {
                const allowedTemplates = ADVANCED_TEMPLATES[selectedType];
                if (!allowedTemplates) {
                    return true;
                }
                return allowedTemplates.includes(templateKey);
            },
            disableMonorepoPrompt: true,
        });
        if (!selection) {
            process.exit(0);
        }

        // 選択結果からタイプとテンプレートを更新する
        projectType = selection.projectType;
        template = selection.template;

        // simpleや明示フラグで固定されていない場合は選択内容を採用する
        if (!(args.simple || hasExplicitMonorepo) && monorepoPreference === undefined) {
            monorepoPreference = selection.useMonorepo;
        }
    }

    // 最終決定値をオブジェクトとして返却する
    return {
        projectType: projectType ?? "nextjs",
        template,
        monorepoPreference,
    };
}

// EOF
