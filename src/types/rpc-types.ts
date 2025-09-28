/**
 * JSON-RPC 2.0 Type Definitions
 *
 * Implements the JSON-RPC 2.0 specification for WebSocket communication
 * between the dashboard and core infrastructure.
 */

export interface JsonRpcRequest {
    jsonrpc: '2.0';
    method: string;
    params?: unknown;
    id?: string | number | null;
}

export interface JsonRpcResponse {
    jsonrpc: '2.0';
    result?: unknown;
    error?: JsonRpcError;
    id: string | number | null;
}

export interface JsonRpcError {
    code: number;
    message: string;
    data?: unknown;
}

export interface JsonRpcNotification {
    jsonrpc: '2.0';
    method: string;
    params?: unknown;
}

// Standard JSON-RPC error codes
export const RPC_ERROR_CODES = {
    PARSE_ERROR: -32700,
    INVALID_REQUEST: -32600,
    METHOD_NOT_FOUND: -32601,
    INVALID_PARAMS: -32602,
    INTERNAL_ERROR: -32603,
    // Custom application error codes (range: -32000 to -32099)
    SERVICE_ERROR: -32000,
    CLI_ADAPTER_ERROR: -32001,
    DATA_STORE_ERROR: -32002,
    VALIDATION_ERROR: -32003,
    AUTHENTICATION_ERROR: -32004,
    AUTHORIZATION_ERROR: -32005,
    RESOURCE_NOT_FOUND: -32006,
    RESOURCE_CONFLICT: -32007,
    RATE_LIMIT_EXCEEDED: -32008,
    SERVICE_UNAVAILABLE: -32009,
} as const;

export type RpcErrorCode = (typeof RPC_ERROR_CODES)[keyof typeof RPC_ERROR_CODES];

// RPC Method Types
export type RpcMethodHandler = (params: unknown, context: RpcContext) => Promise<unknown>;

export interface RpcContext {
    userId?: string;
    sessionId: string;
    timestamp: number;
    metadata?: Record<string, unknown>;
}

export interface RpcMethodRegistry {
    [method: string]: RpcMethodHandler;
}

// WebSocket Connection Types
export interface WebSocketConnection {
    id: string;
    socket: unknown; // WebSocket instance
    userId?: string;
    sessionId: string;
    subscriptions: Set<string>;
    lastActivity: number;
}

export interface WebSocketMessage {
    type: 'request' | 'response' | 'notification' | 'error';
    data: JsonRpcRequest | JsonRpcResponse | JsonRpcNotification;
    connectionId: string;
    timestamp: number;
}

// Subscription Types for Real-time Updates
export interface SubscriptionFilter {
    eventType?: string;
    source?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
}

export interface Subscription {
    id: string;
    connectionId: string;
    filter: SubscriptionFilter;
    createdAt: number;
    lastNotified?: number;
}

// Batch Request Support
export interface JsonRpcBatchRequest extends Array<JsonRpcRequest> {}
export interface JsonRpcBatchResponse extends Array<JsonRpcResponse> {}

// Streaming Support for Large Responses
export interface StreamingResponse {
    streamId: string;
    method: string;
    totalChunks?: number;
    currentChunk: number;
    data: unknown;
    isComplete: boolean;
}

// Authentication and Authorization
export interface RpcAuthContext {
    token?: string;
    permissions: string[];
    roles: string[];
    expiresAt?: number;
}

// Rate Limiting
export interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    keyGenerator?: (context: RpcContext) => string;
}

export interface RateLimitState {
    requests: number;
    windowStart: number;
    isBlocked: boolean;
    resetTime?: number;
}
