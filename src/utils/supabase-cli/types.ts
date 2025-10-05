/**
 * Supabase CLI ラッパーで使用される型定義
 *
 * このファイルは Supabase CLI の各コマンドとレスポンスに対応する型を定義します。
 * 全てのインターフェースは type alias として定義し、一貫性を保ちます。
 */

/**
 * コマンド実行のオプション設定
 */
export type ExecOptions = {
    /** コマンドのタイムアウト時間（ミリ秒） */
    timeout?: number;
    /** 環境変数の設定 */
    env?: Record<string, string>;
    /** 作業ディレクトリ */
    cwd?: string;
};

/**
 * コマンド実行結果
 */
export type CommandResult = {
    /** 標準出力 */
    stdout?: string;
    /** 標準エラー出力 */
    stderr?: string;
    /** 終了コード */
    exitCode: number;
    /** エラーオブジェクト（発生した場合） */
    error?: Error;
};

/**
 * グローバルフラグの設定
 */
export type GlobalFlags = {
    /** サポートチケットを作成 */
    createTicket?: boolean;
    /** デバッグログを出力 */
    debug?: boolean;
    /** DNS リゾルバーの種類 */
    dnsResolver?: "native" | "https";
    /** 実験的機能を有効化 */
    experimental?: boolean;
    /** Dockerネットワーク ID */
    networkId?: string;
    /** 出力フォーマット */
    output?: "env" | "pretty" | "json" | "toml" | "yaml";
    /** 使用するプロファイル */
    profile?: string;
    /** 作業ディレクトリ */
    workdir?: string;
    /** 全てのプロンプトに yes で回答 */
    yes?: boolean;
    /** プロジェクト参照 ID */
    projectRef?: string;
};

/**
 * プロジェクト情報
 */
export type ProjectInfo = {
    /** プロジェクト ID */
    id: string;
    /** プロジェクト名 */
    name: string;
    /** 組織 ID */
    orgId: string;
    /** リージョン */
    region: string;
    /** 作成日時 */
    createdAt: string;
    /** データベース URL */
    databaseUrl?: string;
    /** API URL */
    apiUrl?: string;
    /** API キー */
    apiKeys?: {
        anon: string;
        service: string;
    };
};

/**
 * プロジェクト作成オプション
 */
export type ProjectCreateOptions = {
    /** データベースパスワード */
    dbPassword?: string;
    /** 組織 ID */
    orgId?: string;
    /** リージョン */
    region?: string;
    /** インスタンスサイズ */
    size?: string;
};

/**
 * 認証情報
 */
export type AuthInfo = {
    /** アクセストークン */
    accessToken?: string;
    /** リフレッシュトークン */
    refreshToken?: string;
    /** 有効期限 */
    expiresAt?: string;
};

/**
 * ログイン情報
 */
export type LoginInfo = {
    /** ユーザー名またはメールアドレス */
    username: string;
    /** ログイン状態 */
    isLoggedIn: boolean;
};

/**
 * ログインオプション
 */
export type LoginOptions = {
    /** トークン名 */
    name?: string;
    /** ブラウザを開かない */
    noBrowser?: boolean;
    /** 直接トークンを使用 */
    token?: string;
};

/**
 * データベース操作オプション
 */
export type DatabaseOptions = {
    /** データベース URL */
    dbUrl?: string;
    /** ローカルデータベースを使用 */
    local?: boolean;
    /** リンクされたプロジェクトを使用 */
    linked?: boolean;
    /** パスワード */
    password?: string;
    /** スキーマ */
    schema?: string[];
};

/**
 * マイグレーション情報
 */
export type MigrationInfo = {
    /** バージョン */
    version: string;
    /** 名前 */
    name: string;
    /** 適用済みかどうか */
    applied: boolean;
    /** 適用日時 */
    appliedAt?: string;
};

/**
 * Functions 情報
 */
export type FunctionInfo = {
    /** Function 名 */
    name: string;
    /** バージョン */
    version?: string;
    /** 作成日時 */
    createdAt?: string;
    /** 更新日時 */
    updatedAt?: string;
    /** ステータス */
    status?: string;
};

/**
 * Function デプロイオプション
 */
export type FunctionDeployOptions = {
    /** インポートマップファイル */
    importMap?: string;
    /** 並列ジョブ数 */
    jobs?: number;
    /** JWT 検証を無効化 */
    noVerifyJwt?: boolean;
    /** 存在しない Functions を削除 */
    prune?: boolean;
    /** Management API を使用 */
    useApi?: boolean;
    /** Docker を使用 */
    useDocker?: boolean;
};

/**
 * ブランチ情報
 */
export type BranchInfo = {
    /** ブランチ名 */
    name: string;
    /** ブランチ ID */
    id: string;
    /** Git ブランチ */
    gitBranch?: string;
    /** 永続ブランチかどうか */
    persistent: boolean;
    /** ステータス */
    status: string;
    /** 作成日時 */
    createdAt: string;
    /** データベース URL */
    databaseUrl?: string;
};

/**
 * ブランチ作成オプション
 */
export type BranchCreateOptions = {
    /** 永続ブランチとして作成 */
    persistent?: boolean;
    /** リージョン */
    region?: string;
    /** インスタンスサイズ */
    size?: string;
    /** 本番データをクローン */
    withData?: boolean;
};

/**
 * ブランチ更新オプション
 */
export type BranchUpdateOptions = {
    /** Git ブランチ名 */
    gitBranch?: string;
    /** ブランチ名の変更 */
    name?: string;
    /** 永続ブランチの切り替え */
    persistent?: boolean;
    /** ステータスの上書き */
    status?: string;
};

/**
 * 組織情報
 */
export type OrgInfo = {
    /** 組織 ID */
    id: string;
    /** 組織名 */
    name: string;
    /** 作成日時 */
    createdAt: string;
};

/**
 * シークレット情報
 */
export type SecretInfo = {
    /** シークレット名 */
    name: string;
    /** 値 */
    value?: string;
};

/**
 * シークレット設定オプション
 */
export type SecretSetOptions = {
    /** 環境ファイルから読み込み */
    envFile?: string;
};

/**
 * バックアップ情報
 */
export type BackupInfo = {
    /** バックアップ ID */
    id: string;
    /** 作成日時 */
    createdAt: string;
    /** サイズ */
    size: string;
    /** ステータス */
    status: string;
};

/**
 * バックアップ復元オプション
 */
export type BackupRestoreOptions = {
    /** タイムスタンプ */
    timestamp: number;
};

/**
 * ドメイン情報
 */
export type DomainInfo = {
    /** カスタムホスト名 */
    customHostname: string;
    /** ステータス */
    status: string;
    /** 証明書ステータス */
    certificateStatus?: string;
};

/**
 * ドメイン作成オプション
 */
export type DomainCreateOptions = {
    /** カスタムホスト名 */
    customHostname: string;
};

/**
 * 型生成オプション
 */
export type TypeGenOptions = {
    /** データベース URL */
    dbUrl?: string;
    /** 出力言語 */
    lang?: "typescript" | "go" | "swift";
    /** リンクされたプロジェクトから生成 */
    linked?: boolean;
    /** ローカルデータベースから生成 */
    local?: boolean;
    /** PostgREST v9 互換性 */
    postgrestV9Compat?: boolean;
    /** プロジェクト ID */
    projectId?: string;
    /** クエリタイムアウト */
    queryTimeout?: string;
    /** スキーマ */
    schema?: string[];
    /** Swift アクセス制御 */
    swiftAccessControl?: "internal" | "public";
};

/**
 * JWT 生成オプション
 */
export type JwtGenOptions = {
    /** 有効期限 */
    exp?: string;
    /** カスタムクレーム */
    payload?: string;
    /** ロール */
    role?: string;
    /** ユーザー ID */
    sub?: string;
    /** 有効期間 */
    validFor?: string;
};

/**
 * コマンドエラーの詳細
 */
export type SupabaseCommandError = {
    /** エラーメッセージ */
    message: string;
    /** 実行されたコマンド */
    command: string;
    /** 終了コード */
    exitCode: number;
    /** 標準エラー出力 */
    stderr?: string;
};

// EOF
