/**
 * プロセス間通信（IPC）コマンドモジュール
 *
 * Fluorite Flake CLIのIPCサーバー起動と接続テスト機能を
 * 統合的に提供します。各機能は個別のモジュールに分離されており、
 * 保守性とテスタビリティを確保しています。
 *
 * @module ipc
 */

// IPCサーバー起動機能
export { startIPC } from './startIPC.js';

// IPC接続テスト機能
export { testIPC } from './testIPC.js';
