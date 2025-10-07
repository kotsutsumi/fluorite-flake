/**
 * プロジェクトテンプレート選択インターフェース
 */
import { cancel, confirm, isCancel, select } from "@clack/prompts";

import { getMessages } from "../../../i18n.js";
import { PROJECT_TYPE_DESCRIPTIONS } from "../constants.js";
import type { ProjectType } from "../types.js";
import { isFullStackTemplate, isMonorepoRecommended } from "../validators.js";
import type { TemplateSelectionResult } from "./types.js";

type TemplateSelectorOptions = {
    templateFilter?: (input: {
        projectType: ProjectType;
        templateKey: string;
        description: string;
    }) => boolean;
    disableMonorepoPrompt?: boolean;
};

/**
 * テンプレートの複雑度を判定
 */
function estimateTemplateComplexity(
    template: string,
    isFullStack: boolean
): "simple" | "moderate" | "complex" {
    if (isFullStack || template.includes("cross-platform")) {
        return "complex";
    }
    if (template.includes("admin") || template.includes("graphql")) {
        return "moderate";
    }
    return "simple";
}

/**
 * テンプレートの機能リストを作成
 */
function generateFeatureList(template: string): string[] {
    const features: string[] = [];

    if (template.includes("admin")) {
        features.push(
            "認証システム",
            "ユーザー管理",
            "組織管理",
            "管理ダッシュボード"
        );
    }
    if (template.includes("graphql")) {
        features.push("GraphQL API", "Apollo Client/Server", "型安全なクエリ");
    }
    if (template.includes("fullstack")) {
        features.push("フルスタック開発", "データベース統合", "API設計");
    }
    if (template.includes("cross-platform")) {
        features.push(
            "デスクトップアプリ",
            "モバイルアプリ",
            "クロスプラットフォーム"
        );
    }

    return features;
}

/**
 * プロジェクトタイプを選択
 */
async function selectProjectTypeIfNeeded(
    initialProjectType?: ProjectType
): Promise<ProjectType | null> {
    const { create } = getMessages();

    if (initialProjectType && initialProjectType in PROJECT_TYPE_DESCRIPTIONS) {
        return initialProjectType;
    }

    const projectTypeResult = await select({
        message: create.selectProjectTypePrompt,
        options: Object.entries(PROJECT_TYPE_DESCRIPTIONS).map(
            ([key, value]) => ({
                value: key as ProjectType,
                label: `${value.name} - ${value.description}`,
            })
        ),
    });

    if (isCancel(projectTypeResult)) {
        cancel(create.operationCancelled);
        return null;
    }

    return projectTypeResult as ProjectType;
}

/**
 * テンプレートを選択
 */
async function selectTemplate(
    projectType: ProjectType,
    templateFilter?: TemplateSelectorOptions["templateFilter"]
): Promise<string | null> {
    const { create } = getMessages();
    const typeDescription = PROJECT_TYPE_DESCRIPTIONS[projectType];

    const filteredTemplates = Object.entries(typeDescription.templates).filter(
        ([key, description]) =>
            !templateFilter ||
            templateFilter({
                projectType,
                templateKey: key,
                description,
            })
    );

    const templatesToDisplay =
        filteredTemplates.length > 0
            ? filteredTemplates
            : Object.entries(typeDescription.templates);

    if (templatesToDisplay.length === 1) {
        return templatesToDisplay[0][0];
    }

    const templateResult = await select({
        message: create.selectTemplatePrompt(typeDescription.name),
        options: templatesToDisplay.map(([key, description]) => ({
            value: key,
            label: `${key} - ${description}`,
        })),
    });

    if (isCancel(templateResult)) {
        cancel(create.operationCancelled);
        return null;
    }

    return templateResult as string;
}

/**
 * インタラクティブなプロジェクトテンプレート選択
 */
export async function selectProjectTemplate(
    initialProjectType?: ProjectType,
    options?: TemplateSelectorOptions
): Promise<TemplateSelectionResult | null> {
    const { create } = getMessages();

    // プロジェクトタイプの選択
    const projectType = await selectProjectTypeIfNeeded(initialProjectType);
    if (!projectType) {
        return null;
    }

    // テンプレートの選択
    const template = await selectTemplate(projectType, options?.templateFilter);
    if (!template) {
        return null;
    }

    // テンプレートの特性を判定
    const isFullStack = isFullStackTemplate(template);
    const requiresMonorepo = isMonorepoRecommended(template);
    let useMonorepo = requiresMonorepo;

    // 複雑度と機能リストの生成
    const estimatedComplexity = estimateTemplateComplexity(
        template,
        isFullStack
    );
    const features = generateFeatureList(template);

    // モノレポ構造の確認（推奨される場合）
    if (requiresMonorepo) {
        if (options?.disableMonorepoPrompt) {
            useMonorepo = true;
        } else {
            const confirmResult = await confirm({
                message: create.confirmMonorepoPrompt(template),
                initialValue: true,
            });

            if (isCancel(confirmResult)) {
                cancel(create.operationCancelled);
                return null;
            }

            useMonorepo = Boolean(confirmResult);
        }
    }

    return {
        projectType,
        template,
        isFullStack,
        requiresMonorepo,
        useMonorepo,
        estimatedComplexity,
        features,
    };
}

// EOF
