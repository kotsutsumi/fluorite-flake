/**
 * JSON-RPC 2.0 型定義
 *
 * ダッシュボードとコアインフラ間のWebSocket通信用に
 * JSON-RPC 2.0仕様を実装した型定義集
 */

/**
 * JSON-RPCリクエスト
 * クライアントからサーバーへのメソッド呼び出しリクエスト
 */
export interface JsonRpcRequest {
    jsonrpc: '2.0'; // JSON-RPCバージョン指定
    method: string; // 呼び出すメソッド名
    params?: unknown; // メソッドパラメータ
    id?: string | number | null; // リクエスト識別子（通知の場合は省略）
}

/**
 * JSON-RPCレスポンス
 * サーバーからクライアントへのメソッド実行結果
 */
export interface JsonRpcResponse {
    jsonrpc: '2.0'; // JSON-RPCバージョン指定
    result?: unknown; // 成功時の結果データ
    error?: JsonRpcError; // エラー時のエラー情報
    id: string | number | null; // 対応するリクエストのID
}

/**
 * JSON-RPCエラー
 * メソッド実行時に発生したエラーの詳細情報
 */
export interface JsonRpcError {
    code: number; // エラーコード（JSON-RPC標準に準拠）
    message: string; // エラーメッセージ
    data?: unknown; // エラーの追加情報
}

/**
 * JSON-RPC通知
 * レスポンスを必要としない片方向のメッセージ
 */
export interface JsonRpcNotification {
    jsonrpc: '2.0'; // JSON-RPCバージョン指定
    method: string; // 実行するメソッド名
    params?: unknown; // メソッドパラメータ
}

/**
 * RPCメソッドハンドラー
 * 各RPCメソッドの実装関数の型
 */
export type RpcMethodHandler = (params: unknown, context: RpcContext) => Promise<unknown>;

/**
 * RPCコンテキスト
 * RPCメソッド実行時のコンテキスト情報
 */
export interface RpcContext {
    userId?: string; // ユーザーID（認証済みの場合）
    sessionId: string; // セッションID
    timestamp: number; // リクエスト時刻（Unix timestamp）
    metadata?: Record<string, unknown>; // 追加コンテキスト情報
}

/**
 * RPCメソッドレジストリ
 * 利用可能なメソッドとそのハンドラーのマッピング
 */
export interface RpcMethodRegistry {
    [method: string]: RpcMethodHandler; // メソッド名とハンドラーの対応
}

/**
 * WebSocket接続
 * クライアントとの個別接続情報と状態管理
 */
export interface WebSocketConnection {
    id: string; // 接続の一意識別子
    socket: unknown; // WebSocketインスタンス
    userId?: string; // ユーザーID（認証済みの場合）
    sessionId: string; // セッションID
    subscriptions: Set<string>; // 購読中のイベントタイプセット
    lastActivity: number; // 最終活動時刻（Unix timestamp）
}

/**
 * WebSocketメッセージ
 * WebSocket経由で送受信されるメッセージの包絡情報
 */
export interface WebSocketMessage {
    type: 'request' | 'response' | 'notification' | 'error'; // メッセージタイプ
    data: JsonRpcRequest | JsonRpcResponse | JsonRpcNotification; // JSON-RPCメッセージデータ
    connectionId: string; // 送信元接続ID
    timestamp: number; // メッセージ送信時刻（Unix timestamp）
}

/**
 * 購読フィルター
 * リアルタイム更新通知のフィルタリング条件
 */
export interface SubscriptionFilter {
    eventType?: string; // 通知対象のイベントタイプ
    source?: string; // イベントの発生元
    tags?: string[]; // フィルタリング用タグ
    metadata?: Record<string, unknown>; // 追加フィルター条件
}

/**
 * 購読情報
 * クライアントのリアルタイム更新購読状態
 */
export interface Subscription {
    id: string; // 購読の一意識別子
    connectionId: string; // 購読元の接続ID
    filter: SubscriptionFilter; // 通知フィルター条件
    createdAt: number; // 購読開始時刻（Unix timestamp）
    lastNotified?: number; // 最終通知時刻（Unix timestamp）
}

// バッチリクエスト（複数のリクエストを配列で送信）
export interface JsonRpcBatchRequest extends Array<JsonRpcRequest> {}
// バッチレスポンス（複数のレスポンスを配列で返却）
export interface JsonRpcBatchResponse extends Array<JsonRpcResponse> {}

/**
 * ストリーミングレスポンス
 * 大きなデータを分割して送信するためのチャンクデータ
 */
export interface StreamingResponse {
    streamId: string; // ストリームの一意識別子
    method: string; // 元のメソッド名
    totalChunks?: number; // 総チャンク数（不明の場合は省略）
    currentChunk: number; // 現在のチャンク番号（0ベース）
    data: unknown; // このチャンクのデータ
    isComplete: boolean; // ストリーム終了フラグ
}

/**
 * RPC認証コンテキスト
 * RPCメソッド実行時の認証・許可情報
 */
export interface RpcAuthContext {
    token?: string; // 認証トークン
    permissions: string[]; // 保有権限一覧
    roles: string[]; // 割り当てられたロール一覧
    expiresAt?: number; // 認証有効期限（Unix timestamp）
}

/**
 * レート制限設定
 * API呼び出しの頻度制限設定
 */
export interface RateLimitConfig {
    windowMs: number; // 制限時間窓（ミリ秒）
    maxRequests: number; // 時間窓内の最大リクエスト数
    keyGenerator?: (context: RpcContext) => string; // 制限キー生成関数（カスタマイズ用）
}

/**
 * レート制限状態
 * 現在のレート制限状態とカウンター
 */
export interface RateLimitState {
    requests: number; // 現在の時間窓内のリクエスト数
    windowStart: number; // 現在の時間窓開始時刻（Unix timestamp）
    isBlocked: boolean; // 制限中かどうか
    resetTime?: number; // 制限リセット時刻（Unix timestamp）
}
