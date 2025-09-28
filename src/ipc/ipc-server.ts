/**
 * IPC Server for inter-process communication
 *
 * Provides a JSON-RPC 2.0 server for communication between
 * the CLI and external processes (GUI, TUI, Tauri sidecar).
 */

import { createServer, type Server, type Socket } from 'node:net';
import { EventEmitter } from 'node:events';
import { randomBytes } from 'node:crypto';
import type { WranglerDashboardData } from '../utils/wrangler-dashboard.js';

/**
 * JSON-RPC 2.0 Request
 */
export interface JsonRpcRequest {
    jsonrpc: '2.0';
    method: string;
    params?: unknown;
    id?: string | number | null;
}

/**
 * JSON-RPC 2.0 Response
 */
export interface JsonRpcResponse {
    jsonrpc: '2.0';
    result?: unknown;
    error?: {
        code: number;
        message: string;
        data?: unknown;
    };
    id: string | number | null;
}

/**
 * IPC Method handlers
 */
export interface IPCMethods {
    'dashboard.getData': () => Promise<WranglerDashboardData>;
    'dashboard.deployWorker': (params: {
        name?: string;
        env?: string;
        dryRun?: boolean;
    }) => Promise<{ success: boolean; message: string }>;
    'dashboard.listR2Buckets': () => Promise<Array<{ name: string; location?: string }>>;
    'dashboard.createR2Bucket': (params: { name: string }) => Promise<{
        success: boolean;
        message: string;
    }>;
    'dashboard.deleteR2Bucket': (params: { name: string }) => Promise<{
        success: boolean;
        message: string;
    }>;
    'dashboard.tailLogs': (params: {
        workerName?: string;
        format?: 'json' | 'pretty';
    }) => AsyncGenerator<string, void, unknown>;
    'project.create': (params: {
        framework: string;
        name: string;
        path: string;
        database?: string;
        orm?: string;
        storage?: string;
        auth?: boolean;
        deployment?: boolean;
        packageManager?: string;
    }) => Promise<{ success: boolean; projectPath: string }>;
    'system.ping': () => Promise<{ pong: true; timestamp: number }>;
    'system.version': () => Promise<{ version: string; node: string }>;
    'system.shutdown': () => Promise<{ success: boolean }>;
}

/**
 * IPC Server Options
 */
export interface IPCServerOptions {
    socketPath?: string;
    port?: number;
    host?: string;
    maxConnections?: number;
    authToken?: string;
}

/**
 * IPC Server implementation
 */
export class IPCServer extends EventEmitter {
    private server: Server | null = null;
    private clients: Set<Socket> = new Set();
    // biome-ignore lint/suspicious/noExplicitAny: Generic method handler storage
    private methods: Map<string, (...args: any[]) => any> = new Map();
    private authToken: string;
    private isRunning = false;

    constructor(private options: IPCServerOptions = {}) {
        super();
        this.authToken = options.authToken || this.generateToken();
    }

    /**
     * Generate a secure random token
     */
    private generateToken(): string {
        return randomBytes(32).toString('hex');
    }

    /**
     * Register a method handler
     */
    registerMethod<K extends keyof IPCMethods>(method: K, handler: IPCMethods[K]): void {
        // biome-ignore lint/suspicious/noExplicitAny: Type compatibility for generic handler
        this.methods.set(method, handler as any);
    }

    /**
     * Register multiple method handlers
     */
    registerMethods(methods: Partial<IPCMethods>): void {
        for (const [name, handler] of Object.entries(methods)) {
            if (handler) {
                // biome-ignore lint/suspicious/noExplicitAny: Type compatibility for generic handler
                this.methods.set(name, handler as any);
            }
        }
    }

    /**
     * Start the IPC server
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            throw new Error('Server is already running');
        }

        return new Promise((resolve, reject) => {
            this.server = createServer();

            this.server.on('connection', this.handleConnection.bind(this));
            this.server.on('error', (error) => {
                this.emit('error', error);
                reject(error);
            });

            const listenOptions = this.options.socketPath
                ? { path: this.options.socketPath }
                : { port: this.options.port || 0, host: this.options.host || '127.0.0.1' };

            this.server.listen(listenOptions, () => {
                this.isRunning = true;
                const address = this.server?.address();

                if (typeof address === 'string') {
                    this.emit('listening', { socketPath: address, token: this.authToken });
                } else if (address) {
                    this.emit('listening', {
                        port: address.port,
                        host: address.address,
                        token: this.authToken,
                    });
                }

                resolve();
            });

            if (this.options.maxConnections) {
                this.server.maxConnections = this.options.maxConnections;
            }
        });
    }

    /**
     * Stop the IPC server
     */
    async stop(): Promise<void> {
        if (!this.isRunning) {
            return;
        }

        return new Promise((resolve) => {
            // Close all client connections
            for (const client of this.clients) {
                client.destroy();
            }
            this.clients.clear();

            // Close the server
            this.server?.close(() => {
                this.isRunning = false;
                this.emit('closed');
                resolve();
            });
        });
    }

    /**
     * Handle new client connections
     */
    private handleConnection(socket: Socket): void {
        this.clients.add(socket);
        this.emit('connection', socket);

        let buffer = '';
        let authenticated = !this.options.authToken;

        socket.on('data', async (data) => {
            buffer += data.toString();

            // Process complete messages (newline-delimited JSON)
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.trim()) {
                    continue;
                }

                try {
                    const message = JSON.parse(line);

                    // Handle authentication
                    if (!authenticated && message.method === 'auth.login') {
                        authenticated = this.handleAuth(message, socket);
                        continue;
                    }

                    if (!authenticated) {
                        this.sendError(socket, message.id, -32001, 'Authentication required');
                        continue;
                    }

                    // Handle JSON-RPC request
                    await this.handleRequest(message, socket);
                } catch (_error) {
                    this.sendError(socket, null, -32700, 'Parse error');
                }
            }
        });

        socket.on('close', () => {
            this.clients.delete(socket);
            this.emit('disconnection', socket);
        });

        socket.on('error', (error) => {
            this.emit('client-error', { socket, error });
        });
    }

    /**
     * Handle authentication
     */
    private handleAuth(request: JsonRpcRequest, socket: Socket): boolean {
        const params = request.params as { token?: string } | undefined;

        if (params?.token === this.authToken) {
            this.sendResponse(socket, request.id, { authenticated: true });
            return true;
        }

        this.sendError(socket, request.id, -32001, 'Invalid authentication token');
        return false;
    }

    /**
     * Handle JSON-RPC request
     */
    private async handleRequest(request: JsonRpcRequest, socket: Socket): Promise<void> {
        // Validate JSON-RPC 2.0 format
        if (request.jsonrpc !== '2.0') {
            this.sendError(socket, request.id, -32600, 'Invalid Request');
            return;
        }

        const handler = this.methods.get(request.method);

        if (!handler) {
            this.sendError(socket, request.id, -32601, 'Method not found');
            return;
        }

        try {
            const result = await handler(request.params);

            // Handle async generators for streaming responses
            if (result && typeof result === 'object' && Symbol.asyncIterator in result) {
                const generator = result as AsyncGenerator;
                for await (const chunk of generator) {
                    this.sendNotification(socket, `${request.method}.chunk`, {
                        id: request.id,
                        data: chunk,
                    });
                }
                this.sendResponse(socket, request.id, { stream: 'complete' });
            } else {
                this.sendResponse(socket, request.id, result);
            }
        } catch (error) {
            const err = error as Error;
            this.sendError(socket, request.id, -32000, err.message, err);
        }
    }

    /**
     * Send JSON-RPC response
     */
    private sendResponse(socket: Socket, id: unknown, result: unknown): void {
        const response: JsonRpcResponse = {
            jsonrpc: '2.0',
            result,
            id: id as string | number | null,
        };
        socket.write(`${JSON.stringify(response)}\n`);
    }

    /**
     * Send JSON-RPC error
     */
    private sendError(
        socket: Socket,
        id: unknown,
        code: number,
        message: string,
        data?: unknown
    ): void {
        const response: JsonRpcResponse = {
            jsonrpc: '2.0',
            error: { code, message, data },
            id: id as string | number | null,
        };
        socket.write(`${JSON.stringify(response)}\n`);
    }

    /**
     * Send JSON-RPC notification
     */
    private sendNotification(socket: Socket, method: string, params?: unknown): void {
        const notification: JsonRpcRequest = {
            jsonrpc: '2.0',
            method,
            params,
        };
        socket.write(`${JSON.stringify(notification)}\n`);
    }

    /**
     * Broadcast notification to all clients
     */
    broadcast(method: string, params?: unknown): void {
        for (const client of this.clients) {
            this.sendNotification(client, method, params);
        }
    }

    /**
     * Get server info
     */
    getInfo(): {
        isRunning: boolean;
        clients: number;
        address: string | { port: number; host: string } | null;
        token: string;
    } {
        const address = this.server?.address();
        return {
            isRunning: this.isRunning,
            clients: this.clients.size,
            address:
                typeof address === 'string'
                    ? address
                    : address
                      ? { port: address.port, host: address.address }
                      : null,
            token: this.authToken,
        };
    }
}

/**
 * Create a new IPC server instance
 */
export function createIPCServer(options?: IPCServerOptions): IPCServer {
    return new IPCServer(options);
}
