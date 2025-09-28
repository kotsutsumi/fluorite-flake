/**
 * IPC Client for inter-process communication
 *
 * Provides a JSON-RPC 2.0 client for communication with
 * the IPC server from external processes.
 */

import { Socket } from 'node:net';
import { EventEmitter } from 'node:events';
import type { JsonRpcRequest, JsonRpcResponse, IPCMethods } from './ipc-server.js';

/**
 * IPC Client Options
 */
export interface IPCClientOptions {
    socketPath?: string;
    port?: number;
    host?: string;
    authToken?: string;
    reconnect?: boolean;
    reconnectInterval?: number;
    timeout?: number;
}

/**
 * Pending request tracker
 */
interface PendingRequest {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    method: string;
    timeout?: NodeJS.Timeout;
}

/**
 * IPC Client implementation
 */
export class IPCClient extends EventEmitter {
    private socket: Socket | null = null;
    private connected = false;
    private authenticated = false;
    private requestId = 0;
    private pendingRequests: Map<string | number, PendingRequest> = new Map();
    private buffer = '';
    private reconnectTimer?: NodeJS.Timeout;
    private streamHandlers: Map<string | number, (chunk: unknown) => void> = new Map();

    constructor(private options: IPCClientOptions) {
        super();
    }

    /**
     * Connect to the IPC server
     */
    async connect(): Promise<void> {
        if (this.connected) {
            return;
        }

        return new Promise((resolve, reject) => {
            this.socket = new Socket();

            const connectOptions = this.options.socketPath
                ? { path: this.options.socketPath }
                : { port: this.options.port || 9123, host: this.options.host || '127.0.0.1' };

            this.socket.connect(connectOptions, async () => {
                this.connected = true;
                this.emit('connected');

                // Authenticate if token provided
                if (this.options.authToken) {
                    try {
                        await this.authenticate();
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                } else {
                    this.authenticated = true;
                    resolve();
                }
            });

            this.socket.on('data', (data) => {
                this.handleData(data);
            });

            this.socket.on('close', () => {
                this.handleDisconnect();
            });

            this.socket.on('error', (error) => {
                this.emit('error', error);
                reject(error);
            });
        });
    }

    /**
     * Disconnect from the IPC server
     */
    disconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = undefined;
        }

        if (this.socket) {
            this.socket.destroy();
            this.socket = null;
        }

        this.connected = false;
        this.authenticated = false;
        this.clearPendingRequests(new Error('Client disconnected'));
    }

    /**
     * Authenticate with the server
     */
    private async authenticate(): Promise<void> {
        const result = await this.request('auth.login', { token: this.options.authToken });

        if ((result as { authenticated?: boolean })?.authenticated) {
            this.authenticated = true;
            this.emit('authenticated');
        } else {
            throw new Error('Authentication failed');
        }
    }

    /**
     * Handle incoming data
     */
    private handleData(data: Buffer): void {
        this.buffer += data.toString();

        // Process complete messages (newline-delimited JSON)
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop() || '';

        for (const line of lines) {
            if (!line.trim()) {
                continue;
            }

            try {
                const message = JSON.parse(line) as JsonRpcResponse | JsonRpcRequest;

                if ('result' in message || 'error' in message) {
                    this.handleResponse(message as JsonRpcResponse);
                } else if ('method' in message) {
                    this.handleNotification(message as JsonRpcRequest);
                }
            } catch (error) {
                this.emit('parse-error', error);
            }
        }
    }

    /**
     * Handle JSON-RPC response
     */
    private handleResponse(response: JsonRpcResponse): void {
        const request = this.pendingRequests.get(response.id as string | number);

        if (!request) {
            return;
        }

        if (request.timeout) {
            clearTimeout(request.timeout);
        }

        this.pendingRequests.delete(response.id as string | number);

        if (response.error) {
            const error = new Error(response.error.message);
            (error as unknown as Record<string, unknown>).code = response.error.code;
            (error as unknown as Record<string, unknown>).data = response.error.data;
            request.reject(error);
        } else {
            request.resolve(response.result);
        }
    }

    /**
     * Handle JSON-RPC notification
     */
    private handleNotification(notification: JsonRpcRequest): void {
        // Handle streaming chunks
        if (notification.method.endsWith('.chunk')) {
            const params = notification.params as { id?: string | number; data?: unknown };
            if (params?.id) {
                const handler = this.streamHandlers.get(params.id);
                if (handler) {
                    handler(params.data);
                }
            }
        }

        // Emit notification event
        this.emit('notification', notification);
    }

    /**
     * Handle disconnection
     */
    private handleDisconnect(): void {
        this.connected = false;
        this.authenticated = false;
        this.emit('disconnected');

        // Clear pending requests
        this.clearPendingRequests(new Error('Connection lost'));

        // Attempt reconnection if enabled
        if (this.options.reconnect && !this.reconnectTimer) {
            this.reconnectTimer = setTimeout(() => {
                this.reconnectTimer = undefined;
                this.connect().catch((error) => {
                    this.emit('reconnect-error', error);
                    this.handleDisconnect();
                });
            }, this.options.reconnectInterval || 5000);
        }
    }

    /**
     * Clear all pending requests
     */
    private clearPendingRequests(error: Error): void {
        for (const request of this.pendingRequests.values()) {
            if (request.timeout) {
                clearTimeout(request.timeout);
            }
            request.reject(error);
        }
        this.pendingRequests.clear();
        this.streamHandlers.clear();
    }

    /**
     * Send a JSON-RPC request
     */
    private async request(method: string, params?: unknown): Promise<unknown> {
        if (!this.connected) {
            throw new Error('Client not connected');
        }

        const id = ++this.requestId;
        const request: JsonRpcRequest = {
            jsonrpc: '2.0',
            method,
            params,
            id,
        };

        return new Promise((resolve, reject) => {
            const pendingRequest: PendingRequest = {
                resolve,
                reject,
                method,
            };

            if (this.options.timeout) {
                pendingRequest.timeout = setTimeout(() => {
                    this.pendingRequests.delete(id);
                    reject(new Error(`Request timeout: ${method}`));
                }, this.options.timeout);
            }

            this.pendingRequests.set(id, pendingRequest);
            this.socket?.write(`${JSON.stringify(request)}\n`);
        });
    }

    /**
     * Call a remote method
     */
    async call<K extends keyof IPCMethods>(
        method: K,
        params?: Parameters<IPCMethods[K]>[0]
    ): Promise<ReturnType<IPCMethods[K]>> {
        const result = await this.request(method, params);
        return result as ReturnType<IPCMethods[K]>;
    }

    /**
     * Call a remote method with streaming response
     */
    async callStream<K extends keyof IPCMethods>(
        method: K,
        params?: Parameters<IPCMethods[K]>[0],
        onChunk?: (chunk: unknown) => void
    ): Promise<void> {
        const id = ++this.requestId;

        if (onChunk) {
            this.streamHandlers.set(id, onChunk);
        }

        const request: JsonRpcRequest = {
            jsonrpc: '2.0',
            method,
            params,
            id,
        };

        return new Promise((resolve, reject) => {
            const pendingRequest: PendingRequest = {
                resolve: () => {
                    this.streamHandlers.delete(id);
                    resolve();
                },
                reject: (error) => {
                    this.streamHandlers.delete(id);
                    reject(error);
                },
                method,
            };

            if (this.options.timeout) {
                pendingRequest.timeout = setTimeout(() => {
                    this.pendingRequests.delete(id);
                    this.streamHandlers.delete(id);
                    reject(new Error(`Request timeout: ${method}`));
                }, this.options.timeout);
            }

            this.pendingRequests.set(id, pendingRequest);
            this.socket?.write(`${JSON.stringify(request)}\n`);
        });
    }

    /**
     * Check if client is connected
     */
    isConnected(): boolean {
        return this.connected;
    }

    /**
     * Check if client is authenticated
     */
    isAuthenticated(): boolean {
        return this.authenticated;
    }
}

/**
 * Create a new IPC client instance
 */
export function createIPCClient(options: IPCClientOptions): IPCClient {
    return new IPCClient(options);
}
