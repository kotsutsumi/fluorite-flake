/**
 * JSON-RPC 2.0 モジュール
 *
 * JSON-RPC 2.0仕様を実装した型定義と定数の統一エクスポート
 * ダッシュボードとコアインフラ間のWebSocket通信用
 */

// 型定義をエクスポート
export type {
    JsonRpcBatchRequest,
    JsonRpcBatchResponse,
    JsonRpcError,
    JsonRpcNotification,
    JsonRpcRequest,
    JsonRpcResponse,
    RateLimitConfig,
    RateLimitState,
    RpcAuthContext,
    RpcContext,
    RpcMethodHandler,
    RpcMethodRegistry,
    StreamingResponse,
    Subscription,
    SubscriptionFilter,
    WebSocketConnection,
    WebSocketMessage,
} from './types.js';

// 定数をエクスポート
export { RPC_ERROR_CODES, type RpcErrorCode } from './constants.js';
