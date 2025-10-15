/**
 * プロジェクト設定作成機能
 */
import { validatePnpm } from "../../utils/pnpm-validator/index.js"; // pnpmが利用可能かを検証するヘルパーを読み込む
import { PROJECT_TYPE_DESCRIPTIONS } from "./constants.js"; // プロジェクトタイプごとの説明定義を参照する
import type { CreateOptions, ExtendedProjectConfig, ProjectConfig, ProjectType } from "./types.js"; // 設定生成に必要な型群を取り込む
import { validateProjectType, validateTemplate } from "./validators/index.js"; // プロジェクトタイプとテンプレートの検証関数を読み込む

/**
 * 引数からプロジェクト設定を作成
 */
export function createProjectConfig(projectType: string, options: CreateOptions): ProjectConfig | null {
    // monorepo-ready構造のためpnpmの存在を確認（デフォルトでmonorepo=trueのため常時チェック）
    let willUseMonorepo: boolean; // モノレポ構築を行うかどうかのフラグを用意する
    if (options.simple) {
        willUseMonorepo = false; // simple指定時は常にモノレポを無効にする
    } else if (options.monorepo !== undefined) {
        willUseMonorepo = Boolean(options.monorepo); // 引数が与えられていればその値を採用する
    } else {
        willUseMonorepo = true; // それ以外はデフォルトでモノレポを有効にする
    }
    if (willUseMonorepo) {
        const pnpmValid = validatePnpm(); // モノレポ構成ではpnpmの利用可否をチェックする
        if (!pnpmValid) {
            return null; // pnpmが使えない場合は設定生成を中断する
        }
    }

    // プロジェクトタイプの検証
    if (!validateProjectType(projectType)) {
        return null; // 不正なプロジェクトタイプは受け付けない
    }

    const typedProjectType = projectType as ProjectType; // 以降はProjectTypeとして扱うためキャストする

    // デフォルト値の設定
    const projectName = options.name || "my-fluorite-project"; // プロジェクト名が未指定ならデフォルト名を使う
    const directory = options.dir || projectName; // 出力ディレクトリが未指定ならプロジェクト名を利用する
    const template = options.template || "typescript"; // テンプレート未指定時はTypeScriptテンプレートを採用する

    // テンプレートの検証
    if (!validateTemplate(typedProjectType, template)) {
        return null; // テンプレートが不正なら終了する
    }

    // プロジェクト設定を返す（デフォルトでmonorepo-ready構造）
    return {
        type: typedProjectType, // プロジェクトタイプを設定する
        name: projectName, // プロジェクト名を設定する
        directory, // 出力ディレクトリを設定する
        template, // テンプレート名を設定する
        force: Boolean(options.force), // --forceフラグを真偽値に正規化する
        monorepo: willUseMonorepo, // モノレポ利用有無を反映する
        database: options.database, // データベース設定をそのまま保持する
        databaseConfig: undefined, // 後続処理で設定されるため初期値は未定義
        databaseCredentials: undefined, // プロビジョニング結果を保持する領域を用意する
        blobConfig: undefined, // Blob設定は後で追加される可能性がある
        shouldGenerateDocs: false, // デフォルトではドキュメント生成を行わない
    };
}

/**
 * 拡張プロジェクト設定を作成（詳細情報付き）
 */
export function createExtendedProjectConfig(projectType: string, options: CreateOptions): ExtendedProjectConfig | null {
    const baseConfig = createProjectConfig(projectType, options); // まずは基本設定を構築する
    if (!baseConfig) {
        return null; // 基本設定が得られない場合は処理を中断する
    }

    const typedProjectType = projectType as ProjectType; // プロジェクトタイプを厳密な型に変換する
    const template = options.template || "typescript"; // テンプレート未指定時はデフォルトを使用する

    // プロジェクトタイプの説明情報を取得
    const typeDescription = PROJECT_TYPE_DESCRIPTIONS[typedProjectType]; // プロジェクトタイプごとの説明を引き当てる
    const templateDescription = typeDescription.templates[template as keyof typeof typeDescription.templates]; // テンプレート固有の説明を取得する

    // テンプレートに基づく機能の判定
    const isFullStack = template.includes("fullstack") || template.includes("admin"); // フルスタックかどうかを判定する
    const hasAuthentication = template.includes("admin") || template.includes("fullstack"); // 認証機能が含まれるかを判定する
    const hasDatabase = template.includes("admin") || template.includes("fullstack"); // データベース統合が含まれるかを判定する

    // フレームワークの判定
    let framework = typeDescription.name; // ベースのフレームワーク名を設定する
    if (template.includes("graphql")) {
        framework += " + GraphQL"; // GraphQL対応の場合は追記する
    }
    if (template.includes("admin")) {
        framework += " + Admin Dashboard"; // 管理画面付きテンプレートの場合は追記する
    }

    // 機能リストの作成
    const features: string[] = []; // 機能ラベルを保持する配列を初期化する
    if (hasAuthentication) {
        features.push("Authentication"); // 認証機能があれば追加する
    }
    if (hasDatabase) {
        features.push("Database Integration"); // データベース統合があれば追加する
    }
    if (template.includes("admin")) {
        features.push("Admin Dashboard", "User Management", "Organization Management"); // 管理画面テンプレート向けの機能を追加する
    }
    if (template.includes("graphql")) {
        features.push("GraphQL API", "Apollo Client/Server"); // GraphQL構成の場合の機能を追加する
    }
    if (template.includes("cross-platform")) {
        features.push("Desktop App", "Mobile App"); // クロスプラットフォーム対応時の機能を追加する
    }
    if (template.includes("desktop-admin")) {
        features.push("Desktop App", "Admin Panel", "IPC Communication"); // デスクトップ管理テンプレート向けの機能を追加する
    }

    // 拡張設定を返す
    return {
        ...baseConfig, // 基本設定を展開する
        description: typeDescription.description, // プロジェクトタイプの説明文を追加する
        templateDescription, // テンプレート固有の説明文を追加する
        isFullStack, // フルスタック判定結果を設定する
        hasAuthentication, // 認証機能有無を設定する
        hasDatabase, // データベース統合有無を設定する
        framework, // フレームワークの説明を設定する
        features, // 機能一覧を設定する
    };
}

// EOF
