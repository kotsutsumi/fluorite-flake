/**
 * イベントシステム型定義
 *
 * ダッシュボードコンポーネントとコアサービス間の
 * リアルタイム通信用イベント駆動アーキテクチャを定義
 */

/**
 * 基本イベント構造
 */

/**
 * ベースイベント
 * すべてのイベントの基本構造と共通フィールド
 */
export interface BaseEvent {
    id: string; // イベントの一意識別子
    type: string; // イベントタイプ（ドット区切り形式）
    source: string; // イベントの発生元
    timestamp: number; // イベント発生時刻（Unix timestamp）
    version: string; // イベントスキーマのバージョン
    correlationId?: string; // 関連イベントのグループ化ID
    metadata?: Record<string, unknown>; // イベントの追加メタデータ
}

/**
 * イベントペイロード
 * データを含むイベントのジェネリック型
 */
export interface EventPayload<T = unknown> extends BaseEvent {
    data: T; // イベント固有のデータ
}

/**
 * イベントカテゴリ
 * イベントの分類とフィルタリング用のカテゴリ定義
 */
export type EventCategory =
    | 'project' // プロジェクト関連
    | 'build' // ビルド関連
    | 'deployment' // デプロイメント関連
    | 'file-system' // ファイルシステム関連
    | 'service' // サービス関連
    | 'user' // ユーザーアクション関連
    | 'system' // システム関連
    | 'analytics' // 分析・指標関連
    | 'collaboration'; // コラボレーション関連

/**
 * プロジェクト関連イベント
 */

/**
 * プロジェクトイベント
 * プロジェクトのライフサイクルに関するイベント
 */
export interface ProjectEvent extends BaseEvent {
    type:
        | 'project.created' // プロジェクト作成
        | 'project.updated' // プロジェクト更新
        | 'project.deleted' // プロジェクト削除
        | 'project.opened' // プロジェクト開放
        | 'project.closed'; // プロジェクト閉鎖
    projectId: string; // 対象プロジェクトのID
}

/**
 * プロジェクト作成イベント
 * 新しいプロジェクトが作成されたときに発生
 */
export interface ProjectCreatedEvent extends ProjectEvent {
    type: 'project.created';
    data: {
        project: {
            id: string; // 作成されたプロジェクトのID
            name: string; // プロジェクト名
            framework: string; // 使用フレームワーク
            path: string; // プロジェクトパス
        };
    };
}

/**
 * プロジェクト更新イベント
 * プロジェクトの設定やメタデータが更新されたときに発生
 */
export interface ProjectUpdatedEvent extends ProjectEvent {
    type: 'project.updated';
    data: {
        projectId: string; // 更新されたプロジェクトのID
        changes: Record<string, unknown>; // 変更された項目と新しい値
        previousValues?: Record<string, unknown>; // 変更前の値（差分表示用）
    };
}

/**
 * ビルド関連イベント
 */

/**
 * ビルドイベント
 * ビルドプロセスのライフサイクルに関するイベント
 */
export interface BuildEvent extends BaseEvent {
    type:
        | 'build.started' // ビルド開始
        | 'build.progress' // ビルド進行状況
        | 'build.completed' // ビルド完了
        | 'build.failed' // ビルド失敗
        | 'build.cancelled'; // ビルドキャンセル
    buildId: string; // ビルドの一意識別子
    projectId: string; // 対象プロジェクトのID
}

/**
 * ビルド開始イベント
 * ビルドプロセスが開始されたときに発生
 */
export interface BuildStartedEvent extends BuildEvent {
    type: 'build.started';
    data: {
        buildId: string; // ビルドの一意識別子
        projectId: string; // 対象プロジェクトのID
        configuration: {
            target: string; // ビルド対象（dev, prod, test等）
            environment: string; // 環境設定
        };
    };
}

/**
 * ビルド進行状況イベント
 * ビルドの進行状況や段階が更新されたときに発生
 */
export interface BuildProgressEvent extends BuildEvent {
    type: 'build.progress';
    data: {
        buildId: string; // ビルドの一意識別子
        stage: string; // 現在のビルド段階
        progress: number; // 進行率（0-100）
        message?: string; // 進行状況メッセージ
        estimatedTimeRemaining?: number; // 残り時間の推定値（秒）
    };
}

/**
 * ビルド完了イベント
 * ビルドが正常に完了したときに発生
 */
export interface BuildCompletedEvent extends BuildEvent {
    type: 'build.completed';
    data: {
        buildId: string; // ビルドの一意識別子
        duration: number; // ビルド実行時間（ミリ秒）
        artifacts: Array<{
            // 生成されたアーティファクト
            name: string; // アーティファクト名
            size: number; // ファイルサイズ（バイト）
            type: string; // ファイルタイプ
        }>;
        metrics: {
            // ビルドメトリクス
            bundleSize: number; // バンドルサイズ（バイト）
            buildTime: number; // ビルド時間（ミリ秒）
            warnings: number; // 警告数
            errors: number; // エラー数
        };
    };
}

/**
 * ファイルシステム関連イベント
 */

/**
 * ファイルシステムイベント
 * ファイルやディレクトリの変更に関するイベント
 */
export interface FileSystemEvent extends BaseEvent {
    type:
        | 'file.created' // ファイル作成
        | 'file.updated' // ファイル更新
        | 'file.deleted' // ファイル削除
        | 'file.moved' // ファイル移動
        | 'directory.created' // ディレクトリ作成
        | 'directory.deleted'; // ディレクトリ削除
    projectId: string; // 対象プロジェクトのID
    path: string; // ファイル/ディレクトリのパス
}

/**
 * ファイル作成イベント
 * 新しいファイルが作成されたときに発生
 */
export interface FileCreatedEvent extends FileSystemEvent {
    type: 'file.created';
    data: {
        path: string; // 作成されたファイルのパス
        size: number; // ファイルサイズ（バイト）
        type: string; // ファイルタイプ（MIME type）
        encoding?: string; // ファイルエンコーディング
    };
}

/**
 * ファイル更新イベント
 * 既存ファイルが更新されたときに発生
 */
export interface FileUpdatedEvent extends FileSystemEvent {
    type: 'file.updated';
    data: {
        path: string; // 更新されたファイルのパス
        size: number; // 更新後のファイルサイズ（バイト）
        modifiedAt: number; // 最終更新時刻（Unix timestamp）
        changes?: {
            // 変更内容の詳細
            linesAdded: number; // 追加された行数
            linesRemoved: number; // 削除された行数
            characters: number; // 変更された文字数
        };
    };
}

/**
 * サービス関連イベント
 */

/**
 * サービスイベント
 * サービスのライフサイクルと状態変更に関するイベント
 */
export interface ServiceEvent extends BaseEvent {
    type:
        | 'service.started' // サービス開始
        | 'service.stopped' // サービス停止
        | 'service.error' // サービスエラー
        | 'service.health-check'; // ヘルスチェック
    serviceId: string; // サービスの一意識別子
}

/**
 * サービス開始イベント
 * サービスが正常に開始されたときに発生
 */
export interface ServiceStartedEvent extends ServiceEvent {
    type: 'service.started';
    data: {
        serviceId: string; // サービスの一意識別子
        serviceName: string; // サービス名
        pid?: number; // プロセスID
        port?: number; // 使用ポート番号
        version?: string; // サービスバージョン
    };
}

/**
 * サービスエラーイベント
 * サービスでエラーが発生したときに発生
 */
export interface ServiceErrorEvent extends ServiceEvent {
    type: 'service.error';
    data: {
        serviceId: string; // エラーが発生したサービスのID
        error: {
            // エラー詳細
            code: string; // エラーコード
            message: string; // エラーメッセージ
            stack?: string; // スタックトレース
        };
        recoverable: boolean; // 回復可能かどうか
    };
}

/**
 * ユーザー関連イベント
 */

/**
 * ユーザーイベント
 * ユーザーアクションとセッション管理に関するイベント
 */
export interface UserEvent extends BaseEvent {
    type:
        | 'user.action' // ユーザーアクション
        | 'user.session-start' // セッション開始
        | 'user.session-end'; // セッション終了
    userId?: string; // ユーザーID（匿名の場合はnull）
    sessionId: string; // セッションの一意識別子
}

/**
 * ユーザーアクションイベント
 * ユーザーが何らかのアクションを実行したときに発生
 */
export interface UserActionEvent extends UserEvent {
    type: 'user.action';
    data: {
        action: string; // 実行されたアクション名
        target?: string; // アクションの対象
        parameters?: Record<string, unknown>; // アクションパラメータ
        duration?: number; // アクション実行時間（ミリ秒）
    };
}

/**
 * システム関連イベント
 */

/**
 * システムイベント
 * システム全体の状態変更と管理に関するイベント
 */
export interface SystemEvent extends BaseEvent {
    type:
        | 'system.startup' // システム起動
        | 'system.shutdown' // システム停止
        | 'system.error' // システムエラー
        | 'system.resource-warning'; // リソース警告
}

/**
 * システムリソース警告イベント
 * システムリソースが閾値を超えたときに発生
 */
export interface SystemResourceWarningEvent extends SystemEvent {
    type: 'system.resource-warning';
    data: {
        resource: 'memory' | 'cpu' | 'disk' | 'network'; // リソースタイプ
        current: number; // 現在の使用量
        threshold: number; // 警告閾値
        unit: string; // 単位（%, MB, GB等）
        recommendation?: string; // 推奨対処法
    };
}

/**
 * 分析・指標関連イベント
 */

/**
 * 分析イベント
 * 指標収集とレポート生成に関するイベント
 */
export interface AnalyticsEvent extends BaseEvent {
    type:
        | 'analytics.metric' // 指標データ
        | 'analytics.milestone' // マイルストーン達成
        | 'analytics.report-generated'; // レポート生成完了
}

/**
 * 分析指標イベント
 * 指標データが収集されたときに発生
 */
export interface AnalyticsMetricEvent extends AnalyticsEvent {
    type: 'analytics.metric';
    data: {
        metric: string; // 指標名
        value: number; // 指標値
        unit?: string; // 単位
        tags?: Record<string, string>; // 分類タグ
        context?: Record<string, unknown>; // 追加コンテキスト
    };
}

/**
 * コラボレーション関連イベント
 */

/**
 * コラボレーションイベント
 * 複数ユーザー間の協同作業に関するイベント
 */
export interface CollaborationEvent extends BaseEvent {
    type:
        | 'collaboration.user-joined' // ユーザー参加
        | 'collaboration.user-left' // ユーザー離脱
        | 'collaboration.cursor-moved' // カーソル移動
        | 'collaboration.file-edited'; // ファイル編集
    sessionId: string; // コラボレーションセッションID
    userId: string; // ユーザーID
}

/**
 * コラボレーションユーザー参加イベント
 * ユーザーがコラボレーションセッションに参加したときに発生
 */
export interface CollaborationUserJoinedEvent extends CollaborationEvent {
    type: 'collaboration.user-joined';
    data: {
        user: {
            // 参加ユーザー情報
            id: string; // ユーザーID
            name: string; // ユーザー名
            avatar?: string; // アバター画像URL
            role: string; // ユーザーロール
        };
        sessionId: string; // コラボレーションセッションID
    };
}

/**
 * イベント処理関連の型定義
 */

/**
 * イベントハンドラー
 * 特定のイベントを処理する関数の型
 */
export type EventHandler<T extends BaseEvent = BaseEvent> = (event: T) => Promise<void> | void;

/**
 * イベントミドルウェア
 * イベント処理前後に実行される関数の型
 */
export type EventMiddleware = (event: BaseEvent, next: () => Promise<void>) => Promise<void>;

/**
 * イベントフィルター
 * イベントの選択的処理用のフィルター条件
 */
export interface EventFilter {
    type?: string | string[]; // イベントタイプ
    source?: string | string[]; // イベント発生元
    category?: EventCategory | EventCategory[]; // イベントカテゴリ
    metadata?: Record<string, unknown>; // メタデータ条件
    custom?: (event: BaseEvent) => boolean; // カスタムフィルター関数
}

/**
 * イベントストアと永続化関連の型定義
 */

/**
 * イベントストア設定
 * イベントの保存と管理に関する設定
 */
export interface EventStoreConfig {
    maxEvents: number; // 最大イベント保存数
    retentionDays: number; // イベント保存期間（日）
    batchSize: number; // バッチ処理サイズ
    compressionEnabled: boolean; // 圧縮の有効化
    indexFields: string[]; // インデックス化するフィールド
}

/**
 * 保存済みイベント
 * 永続化されたイベントの拡張情報
 */
export interface StoredEvent extends BaseEvent {
    persistedAt: number; // 保存時刻（Unix timestamp）
    sequence: number; // シーケンス番号
    checksum?: string; // データ整合性チェック用ハッシュ
}

/**
 * イベント検索クエリ
 * 保存されたイベントの検索条件
 */
export interface EventQuery {
    types?: string[]; // 検索対象のイベントタイプ
    sources?: string[]; // 検索対象の発生元
    startTime?: number; // 検索開始時刻
    endTime?: number; // 検索終了時刻
    correlationId?: string; // 関連ID
    limit?: number; // 取得件数制限
    offset?: number; // 取得開始位置
    orderBy?: 'timestamp' | 'sequence'; // ソート基準
    orderDirection?: 'asc' | 'desc'; // ソート順序
}

/**
 * イベントストリーミングとサブスクリプション関連の型定義
 */

/**
 * イベントストリーム
 * 継続的なイベント配信ストリームの設定
 */
export interface EventStream {
    id: string; // ストリームの一意識別子
    filter: EventFilter; // イベントフィルター
    batchSize: number; // バッチサイズ
    maxBatchWaitTime: number; // バッチ待機最大時間（ミリ秒）
    resumeToken?: string; // 再開用トークン
}

/**
 * イベントバッチ
 * バッチ処理用のイベント群
 */
export interface EventBatch {
    streamId: string; // 関連ストリームID
    events: BaseEvent[]; // バッチ内のイベント群
    resumeToken: string; // 次回継続用トークン
    hasMore: boolean; // 後続データの有無
}

/**
 * イベントサブスクリプション
 * クライアントのイベント購読設定
 */
export interface EventSubscription {
    id: string; // サブスクリプションの一意識別子
    filter: EventFilter; // 受信イベントフィルター
    connectionId: string; // 関連コネクションID
    createdAt: number; // 作成時刻
    lastActivity: number; // 最終アクティビティ時刻
    deliveryMode: 'realtime' | 'batch' | 'replay'; // 配信モード
    acknowledgmentRequired: boolean; // 受信確認の要求
}

/**
 * イベント受信確認
 * イベント処理完了の確認情報
 */
export interface EventAcknowledgment {
    subscriptionId: string; // 関連サブスクリプションID
    eventIds: string[]; // 処理済みイベントIDリスト
    timestamp: number; // 確認時刻
    status: 'processed' | 'failed' | 'skipped'; // 処理状態
    error?: string; // エラー情報（失敗時）
}

/**
 * イベントバス設定
 * イベントバスの動作設定
 */
export interface EventBusConfig {
    maxListeners: number; // 最大リスナー数
    eventTTL: number; // イベントの生存時間（ミリ秒）
    retryPolicy: {
        // リトライポリシー
        maxRetries: number; // 最大リトライ回数
        backoffMultiplier: number; // バックオフ倍率
        maxBackoffTime: number; // 最大バックオフ時間（ミリ秒）
    };
    deadLetterQueue: {
        // デッドレターキュー設定
        enabled: boolean; // 有効化フラグ
        maxSize: number; // 最大キューサイズ
    };
    metrics: {
        // メトリクス設定
        enabled: boolean; // メトリクス収集の有効化
        flushInterval: number; // メトリクス出力間隔（ミリ秒）
    };
}

/**
 * イベントパフォーマンスメトリクス
 * イベントシステムの性能指標
 */
export interface EventMetrics {
    totalEvents: number; // 総イベント処理数
    eventsPerSecond: number; // 秒間イベント処理数
    averageProcessingTime: number; // 平均処理時間（ミリ秒）
    failureRate: number; // 失敗率（0-1）
    queueDepth: number; // キューの深さ
    activeSubscriptions: number; // アクティブなサブスクリプション数
    lastProcessedEventTime: number; // 最終処理時刻
}

/**
 * 統合イベント型
 * ダッシュボードで使用される全イベント型の統合
 */
export type DashboardEvent =
    | ProjectEvent // プロジェクト関連イベント
    | BuildEvent // ビルド関連イベント
    | FileSystemEvent // ファイルシステム関連イベント
    | ServiceEvent // サービス関連イベント
    | UserEvent // ユーザー関連イベント
    | SystemEvent // システム関連イベント
    | AnalyticsEvent // 分析関連イベント
    | CollaborationEvent; // コラボレーション関連イベント
