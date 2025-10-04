/**
 * JSON-RPC 2.0 定数定義
 *
 * JSON-RPC仕様で使用される標準エラーコードとアプリケーション固有の
 * エラーコード定義
 */

/**
 * 標準JSON-RPCエラーコード定義
 * JSON-RPC 2.0仕様で定義された標準エラーコードとアプリ独自エラーコード
 */
export const RPC_ERROR_CODES = {
    // JSON-RPC 2.0標準エラーコード
    PARSE_ERROR: -32700, // JSONパースエラー
    INVALID_REQUEST: -32600, // 無効なリクエスト
    METHOD_NOT_FOUND: -32601, // メソッドが見つからない
    INVALID_PARAMS: -32602, // 無効なパラメータ
    INTERNAL_ERROR: -32603, // 内部エラー
    // アプリケーション独自エラーコード（-32000 から -32099の範囲）
    SERVICE_ERROR: -32000, // サービスエラー
    CLI_ADAPTER_ERROR: -32001, // CLIアダプターエラー
    DATA_STORE_ERROR: -32002, // データストアエラー
    VALIDATION_ERROR: -32003, // バリデーションエラー
    AUTHENTICATION_ERROR: -32004, // 認証エラー
    AUTHORIZATION_ERROR: -32005, // 許可エラー
    RESOURCE_NOT_FOUND: -32006, // リソースが見つからない
    RESOURCE_CONFLICT: -32007, // リソース競合状態
    RATE_LIMIT_EXCEEDED: -32008, // レート制限超過
    SERVICE_UNAVAILABLE: -32009, // サービス利用不可
} as const;

// RPCエラーコードの型定義
export type RpcErrorCode = (typeof RPC_ERROR_CODES)[keyof typeof RPC_ERROR_CODES];
