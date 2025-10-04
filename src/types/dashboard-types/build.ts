/**
 * ビルドとデプロイメント関連の型定義
 */

/**
 * ビルドプロセスの詳細情報
 * ビルドの実行状態、ログ、成果物、設定を管理
 */
export interface BuildProcess {
    id: string; // ビルドプロセスの一意識別子
    projectId: string; // 対象プロジェクトのID
    type: 'development' | 'production' | 'preview'; // ビルドタイプ
    status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled'; // ビルド状態
    startTime: number; // ビルド開始時間（Unix timestamp）
    endTime?: number; // ビルド終了時間（Unix timestamp）
    duration?: number; // ビルド実行時間（ミリ秒）
    logs: BuildLog[]; // ビルドログの配列
    artifacts: BuildArtifact[]; // ビルド成果物の配列
    configuration: BuildConfiguration; // ビルド設定
    triggeredBy: string; // ビルドの実行者またはトリガー
}

/**
 * ビルドログエントリ
 * ビルド実行中の各ログメッセージとメタデータ
 */
export interface BuildLog {
    id: string; // ログエントリの一意識別子
    timestamp: number; // ログ出力時間（Unix timestamp）
    level: 'debug' | 'info' | 'warn' | 'error'; // ログレベル
    message: string; // ログメッセージ
    source: string; // ログの出力元
    metadata?: Record<string, unknown>; // ログの追加メタデータ
}

/**
 * ビルド成果物
 * ビルド完了後に生成されるファイルやアセットの情報
 */
export interface BuildArtifact {
    id: string; // 成果物の一意識別子
    name: string; // 成果物の名前
    type: 'bundle' | 'source-map' | 'asset' | 'report'; // 成果物のタイプ
    path: string; // 成果物のファイルパス
    size: number; // ファイルサイズ（バイト）
    checksum: string; // ファイルのチェックサム
    createdAt: number; // 作成日時（Unix timestamp）
}

/**
 * ビルド設定
 * ビルド実行時の各種オプションと環境変数
 */
export interface BuildConfiguration {
    target: string; // ビルドターゲット
    optimization: boolean; // 最適化の有無
    minification: boolean; // 圧縮の有無
    sourceMap: boolean; // ソースマップ生成の有無
    environment: Record<string, string>; // 環境変数
    customFlags?: string[]; // カスタムビルドフラグ
}
