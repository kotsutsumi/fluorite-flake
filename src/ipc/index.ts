/**
 * IPCモジュールのエクスポート
 *
 * このモジュールは、プロセス間通信（IPC）のための主要なコンポーネントを提供します。
 * JSON-RPC 2.0プロトコルを使用してクライアントとサーバー間の通信を実現し、
 * Cloudflare Workers の管理、プロジェクト作成、システム操作などの機能を
 * 外部プロセス（GUI、TUI、Tauri アプリケーション）から利用可能にします。
 *
 * @module IPC
 */

// IPCサーバー関連のエクスポート
export { createIPCServer, type IPCServer, type IPCServerOptions } from './ipc-server.js';

// IPCクライアント関連のエクスポート
export { createIPCClient, type IPCClient, type IPCClientOptions } from './ipc-client.js';

// IPC統合機能のエクスポート
export { setupIPCServer, startIPCDaemon } from './ipc-integration.js';

// JSON-RPC関連の型定義のエクスポート
export type {
    JsonRpcRequest, // JSON-RPCリクエストの型定義
    JsonRpcResponse, // JSON-RPCレスポンスの型定義
    IPCMethods, // 利用可能なIPCメソッドの型定義
} from './ipc-server.js';
