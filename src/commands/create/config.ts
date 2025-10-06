/**
 * プロジェクト設定作成機能
 */
import { validatePnpm } from "../../utils/pnpm-validator/index.js";
import { PROJECT_TYPE_DESCRIPTIONS } from "./constants.js";
import type {
    CreateOptions,
    ExtendedProjectConfig,
    ProjectConfig,
    ProjectType,
} from "./types.js";
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

    const typedProjectType = projectType as ProjectType;

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
        database: options.database, // データベース設定を追加
        databaseConfig: undefined,
        databaseCredentials: undefined,
        blobConfig: undefined,
    };
}

/**
 * 拡張プロジェクト設定を作成（詳細情報付き）
 */
export function createExtendedProjectConfig(
    projectType: string,
    options: CreateOptions
): ExtendedProjectConfig | null {
    // 基本設定を作成
    const baseConfig = createProjectConfig(projectType, options);
    if (!baseConfig) {
        return null;
    }

    const typedProjectType = projectType as ProjectType;
    const template = options.template || "typescript";

    // プロジェクトタイプの説明情報を取得
    const typeDescription = PROJECT_TYPE_DESCRIPTIONS[typedProjectType];
    const templateDescription =
        typeDescription.templates[
            template as keyof typeof typeDescription.templates
        ];

    // テンプレートに基づく機能の判定
    const isFullStack =
        template.includes("fullstack") || template.includes("admin");
    const hasAuthentication =
        template.includes("admin") || template.includes("fullstack");
    const hasDatabase =
        template.includes("admin") || template.includes("fullstack");

    // フレームワークの判定
    let framework = typeDescription.name;
    if (template.includes("graphql")) {
        framework += " + GraphQL";
    }
    if (template.includes("admin")) {
        framework += " + Admin Dashboard";
    }

    // 機能リストの作成
    const features: string[] = [];
    if (hasAuthentication) {
        features.push("Authentication");
    }
    if (hasDatabase) {
        features.push("Database Integration");
    }
    if (template.includes("admin")) {
        features.push(
            "Admin Dashboard",
            "User Management",
            "Organization Management"
        );
    }
    if (template.includes("graphql")) {
        features.push("GraphQL API", "Apollo Client/Server");
    }
    if (template.includes("cross-platform")) {
        features.push("Desktop App", "Mobile App");
    }
    if (template.includes("desktop-admin")) {
        features.push("Desktop App", "Admin Panel", "IPC Communication");
    }

    // 拡張設定を返す
    return {
        ...baseConfig,
        description: typeDescription.description,
        templateDescription,
        isFullStack,
        hasAuthentication,
        hasDatabase,
        framework,
        features,
    };
}

// EOF
