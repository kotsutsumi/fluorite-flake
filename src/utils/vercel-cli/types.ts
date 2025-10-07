/**
 * VercelCLIコマンドの実行オプション
 */
export type VercelCommandOptions = {
    /** 実行時の作業ディレクトリを指定 */
    cwd?: string;
    /** 詳細ログを表示 */
    debug?: boolean;
    /** グローバル設定ディレクトリを明示 */
    globalConfig?: string;
    /** 使用するvercel.jsonのパスを指定 */
    localConfig?: string;
    /** 現在のスコープとは別のチーム/個人で実行 */
    scope?: string;
    /** アクセストークンを明示 */
    token?: string;
    /** カラー出力と絵文字を無効化 */
    noColor?: boolean;
    /** 確認プロンプトをスキップ */
    yes?: boolean;
    /** 追加の引数 */
    args?: string[];
};

/**
 * VercelCLIコマンドの実行結果
 */
export type VercelCommandResult = {
    /** 実行成功フラグ */
    success: boolean;
    /** 標準出力 */
    stdout: string;
    /** 標準エラー出力 */
    stderr: string;
    /** 終了コード */
    exitCode: number;
    /** 実行したコマンド */
    command: string;
};

/**
 * デプロイ関連オプション
 */
export type VercelDeployOptions = VercelCommandOptions & {
    /** .vercel/outputの既存成果物をアップロード */
    prebuilt?: boolean;
    /** ビルド時の環境変数を追加 */
    buildEnv?: Record<string, string>;
    /** 実行時環境変数を追加 */
    env?: Record<string, string>;
    /** プロジェクト名を指定（非推奨） */
    name?: string;
    /** Production環境へ直接デプロイ */
    prod?: boolean;
    /** 自動エイリアス付与を抑止 */
    skipDomain?: boolean;
    /** /_srcでソースを公開 */
    public?: boolean;
    /** Functionsの実行リージョンを制限 */
    regions?: string[];
    /** 完了を待たずに終了 */
    noWait?: boolean;
    /** ビルドキャッシュを無視して再デプロイ */
    force?: boolean;
    /** --force使用時にキャッシュ保持 */
    withCache?: boolean;
    /** アップロード前にアーカイブ化 */
    archive?: "tgz" | "zip";
    /** ビルドログを同時出力 */
    logs?: boolean;
    /** デプロイメタデータを付与 */
    meta?: Record<string, string>;
    /** デプロイ先環境を明示 */
    target?: string;
};

/**
 * 環境変数操作のオプション
 */
export type VercelEnvOptions = VercelCommandOptions & {
    /** 取得対象環境を指定 */
    environment?: "development" | "preview" | "production" | string;
    /** ブランチ固有の値を取得 */
    gitBranch?: string;
};

/**
 * ドメイン操作のオプション
 */
export type VercelDomainOptions = VercelCommandOptions & {
    /** 取得件数を指定 */
    limit?: number;
    /** 既存プロジェクトから強制移動 */
    force?: boolean;
};

/**
 * Blob操作のオプション
 */
export type VercelBlobOptions = VercelCommandOptions & {
    /** 読み書きトークンを明示 */
    rwToken?: string;
    /** 一覧取得の制限数 */
    limit?: number;
    /** ページネーション用カーソル */
    cursor?: string;
    /** プレフィックスでフィルタ */
    prefix?: string;
    /** 表示モード */
    mode?: "expanded" | "folded";
    /** ランダムサフィックスを追加 */
    addRandomSuffix?: boolean;
    /** パス名を指定 */
    pathname?: string;
    /** コンテンツタイプを指定 */
    contentType?: string;
    /** キャッシュ制御の最大時間 */
    cacheControlMaxAge?: number;
    /** 強制実行 */
    force?: boolean;
    /** マルチパートアップロード */
    multipart?: boolean;
    /** リージョン指定 */
    region?: string;
};

/**
 * ログ取得のオプション
 */
export type VercelLogsOptions = VercelCommandOptions & {
    /** JSON形式で出力 */
    json?: boolean;
    /** ログを追跡（既定動作） */
    follow?: boolean;
    /** 取得行数を制限（非推奨） */
    limit?: number;
    /** 出力フォーマット指定（非推奨） */
    output?: "short" | "raw";
    /** 指定日時以降のログ（非推奨） */
    since?: string;
    /** 指定日時までのログ（非推奨） */
    until?: string;
};

/**
 * プロジェクト操作のオプション
 */
export type VercelProjectOptions = VercelCommandOptions & {
    /** JSON形式で出力 */
    json?: boolean;
    /** Node.jsランタイムの更新が必要なプロジェクトのみ抽出 */
    updateRequired?: boolean;
};

/**
 * デプロイ一覧取得のオプション
 */
export type VercelListOptions = VercelCommandOptions & {
    /** メタデータでフィルタ */
    meta?: Record<string, string>;
    /** 保持ポリシー情報を表示 */
    policy?: string;
    /** 特定環境のデプロイのみ表示 */
    environment?: string;
    /** 特定ステータスのデプロイに絞り込み */
    status?: string;
};

/**
 * 昇格操作のオプション
 */
export type VercelPromoteOptions = VercelCommandOptions & {
    /** 待機時間（既定3分、0で即時終了） */
    timeout?: string | number;
};

/**
 * 削除操作のオプション
 */
export type VercelRemoveOptions = VercelCommandOptions & {
    /** プレビュー/本番で使用中のデプロイを除外 */
    safe?: boolean;
};

/**
 * ロールバック操作のオプション
 */
export type VercelRollbackOptions = VercelCommandOptions & {
    /** 待機時間（0で即時戻りリクエストのみ） */
    timeout?: string | number;
};

/**
 * リンク操作のオプション
 */
export type VercelLinkOptions = VercelCommandOptions & {
    /** リポジトリ配下の各プロジェクトを一括リンク */
    repo?: boolean;
    /** 非対話時にプロジェクト名を明示 */
    project?: string;
};

/**
 * 開発サーバーのオプション
 */
export type VercelDevOptions = VercelCommandOptions & {
    /** 待受ポート指定 */
    listen?: string;
};

/**
 * ビルドオプション
 */
export type VercelBuildOptions = VercelCommandOptions & {
    /** Production環境変数でビルド */
    prod?: boolean;
    /** 不足する設定・環境変数を自動取得 */
    yes?: boolean;
    /** 対象環境を明示 */
    target?: string;
};

// EOF
