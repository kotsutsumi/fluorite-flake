/**
 * IPC module exports
 */

export { createIPCServer, type IPCServer, type IPCServerOptions } from './ipc-server.js';
export { createIPCClient, type IPCClient, type IPCClientOptions } from './ipc-client.js';
export { setupIPCServer, startIPCDaemon } from './ipc-integration.js';

export type {
    JsonRpcRequest,
    JsonRpcResponse,
    IPCMethods,
} from './ipc-server.js';
