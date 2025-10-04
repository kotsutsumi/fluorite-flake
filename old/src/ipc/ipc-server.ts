/**
 * プロセス間通信（IPC）サーバー
 *
 * CLIと外部プロセス（GUI、TUI、Tauriサイドカー）間の通信のための
 * JSON-RPC 2.0サーバーを提供します。
 * TCP/UNIXソケットを使用してクライアント接続を受け入れ、
 * 認証、メソッドルーティング、ストリーミングレスポンスをサポートします。
 *
 * @module IPCServer
 */

import { randomBytes } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { type Server, type Socket, createServer } from 'node:net';
import type { WranglerDashboardData } from '../utils/wrangler-dashboard.js';

/**
 * JSON-RPC 2.0リクエストの型定義
 *
 * @interface JsonRpcRequest
 */
export interface JsonRpcRequest {
    /** JSON-RPCのバージョン指定（必ず'2.0'） */
    jsonrpc: '2.0';
    /** 呼び出すメソッド名 */
    method: string;
    /** メソッドのパラメータ（オプション） */
    params?: unknown;
    /** リクエストのID（レスポンスとの対応付け用） */
    id?: string | number | null;
}

/**
 * JSON-RPC 2.0レスポンスの型定義
 *
 * @interface JsonRpcResponse
 */
export interface JsonRpcResponse {
    /** JSON-RPCのバージョン指定（必ず'2.0'） */
    jsonrpc: '2.0';
    /** 成功時の結果データ */
    result?: unknown;
    /** エラー情報（失敗時） */
    error?: {
        /** エラーコード */
        code: number;
        /** エラーメッセージ */
        message: string;
        /** 追加のエラーデータ（オプション） */
        data?: unknown;
    };
    /** リクエストのID（対応するリクエストと同じ） */
    id: string | number | null;
}

/**
 * IPCメソッドハンドラの型定義
 *
 * 利用可能なすべてのIPCメソッドとそのシグネチャを定義します。
 * ダッシュボード管理、プロジェクト作成、システム操作などの機能を提供します。
 *
 * @interface IPCMethods
 */
export interface IPCMethods {
    /** Cloudflareダッシュボードデータの取得 */
    'dashboard.getData': () => Promise<WranglerDashboardData>;
    /** Workerのデプロイ実行 */
    'dashboard.deployWorker': (params: {
        name?: string;
        env?: string;
        dryRun?: boolean;
    }) => Promise<{ success: boolean; message: string }>;
    /** R2バケットの一覧取得 */
    'dashboard.listR2Buckets': () => Promise<Array<{ name: string; location?: string }>>;
    /** R2バケットの作成 */
    'dashboard.createR2Bucket': (params: { name: string }) => Promise<{
        success: boolean;
        message: string;
    }>;
    /** R2バケットの削除 */
    'dashboard.deleteR2Bucket': (params: { name: string }) => Promise<{
        success: boolean;
        message: string;
    }>;
    /** Workerログのリアルタイムストリーミング */
    'dashboard.tailLogs': (params: {
        workerName?: string;
        format?: 'json' | 'pretty';
    }) => AsyncGenerator<string, void, unknown>;
    /** 新しいプロジェクトの作成 */
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
    /** サーバーの稼働状態確認 */
    'system.ping': () => Promise<{ pong: true; timestamp: number }>;
    /** システムバージョン情報の取得 */
    'system.version': () => Promise<{ version: string; node: string }>;
    /** サーバーのシャットダウン */
    'system.shutdown': () => Promise<{ success: boolean }>;
}

/**
 * IPCサーバーのオプション設定
 *
 * @interface IPCServerOptions
 */
export interface IPCServerOptions {
    /** UNIXソケットのパス（TCPの代わりに使用） */
    socketPath?: string;
    /** TCPポート番号（デフォルト: 0 = 自動割り当て） */
    port?: number;
    /** ホスト名またはIPアドレス（デフォルト: 127.0.0.1） */
    host?: string;
    /** 最大同時接続数の制限 */
    maxConnections?: number;
    /** クライアント認証用のトークン */
    authToken?: string;
}

/**
 * IPCサーバーの実装
 *
 * JSON-RPC 2.0プロトコルを使用してクライアントからの接続を受け入れ、
 * 登録されたメソッドハンドラを実行します。
 * 認証、ストリーミングレスポンス、ブロードキャスト通知をサポートします。
 *
 * @class IPCServer
 * @extends EventEmitter
 *
 * @example
 * ```typescript
 * const server = new IPCServer({ port: 9123, authToken: 'token' });
 * server.registerMethod('test.ping', async () => ({ pong: true }));
 * await server.start();
 * ```
 */
export class IPCServer extends EventEmitter {
    /** TCP/UNIXソケットサーバーインスタンス */
    private server: Server | null = null;
    /** 接続中のクライアントソケットの管理 */
    private clients: Set<Socket> = new Set();
    /** 登録されたメソッドハンドラのマップ */
    // biome-ignore lint/suspicious/noExplicitAny: Generic method handler storage
    private methods: Map<string, (...args: any[]) => any> = new Map();
    /** クライアント認証用のトークン */
    private authToken: string;
    /** サーバーの稼働状態 */
    private isRunning = false;

    constructor(private options: IPCServerOptions = {}) {
        super();
        this.authToken = options.authToken || this.generateToken();
    }

    /**
     * セキュアなランダムトークンの生成
     *
     * 32バイトのランダムデータを生成し、16進数文字列として返します。
     * クライアント認証に使用され、十分なセキュリティ強度を持ちます。
     *
     * @private
     * @returns string 64文字の16進数トークン
     */
    private generateToken(): string {
        return randomBytes(32).toString('hex');
    }

    /**
     * メソッドハンドラの登録
     *
     * 指定されたメソッド名に対してハンドラ関数を登録します。
     * クライアントからのリクエスト時に、このハンドラが実行されます。
     *
     * @template K - IPCMethodsのメソッド名
     * @param method - 登録するメソッド名
     * @param handler - メソッドの実装関数
     *
     * @example
     * ```typescript
     * server.registerMethod('system.ping', async () => ({ pong: true }));
     * ```
     */
    registerMethod<K extends keyof IPCMethods>(method: K, handler: IPCMethods[K]): void {
        // biome-ignore lint/suspicious/noExplicitAny: Type compatibility for generic handler
        this.methods.set(method, handler as any);
    }

    /**
     * 複数のメソッドハンドラの一括登録
     *
     * メソッド名とハンドラのペアを含むオブジェクトを受け取り、
     * すべてのハンドラを一度に登録します。
     *
     * @param methods - 登録するメソッドハンドラのオブジェクト
     *
     * @example
     * ```typescript
     * server.registerMethods({
     *   'system.ping': async () => ({ pong: true }),
     *   'system.version': async () => ({ version: '1.0.0' })
     * });
     * ```
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
     * IPCサーバーの起動
     *
     * ソケットサーバーを作成し、指定されたポートまたはソケットパスで
     * クライアント接続の待受けを開始します。
     * 起動完了時に'listening'イベントを発行します。
     *
     * @returns Promise<void> サーバーが起動したら解決されるPromise
     * @throws {Error} サーバーが既に稼働中または起動に失敗した場合
     *
     * @example
     * ```typescript
     * await server.start();
     * console.log('サーバーが起動しました');
     * ```
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
     * IPCサーバーの停止
     *
     * すべてのクライアント接続を閉じ、サーバーをシャットダウンします。
     * 停止完了時に'closed'イベントを発行します。
     *
     * @returns Promise<void> サーバーが停止したら解決されるPromise
     *
     * @example
     * ```typescript
     * await server.stop();
     * console.log('サーバーが停止しました');
     * ```
     */
    async stop(): Promise<void> {
        if (!this.isRunning) {
            return;
        }

        return new Promise((resolve) => {
            // すべてのクライアント接続を閉じる
            for (const client of this.clients) {
                client.destroy();
            }
            this.clients.clear();

            // サーバーを閉じる
            this.server?.close(() => {
                this.isRunning = false;
                this.emit('closed');
                resolve();
            });
        });
    }

    /**
     * 新しいクライアント接続の処理
     *
     * クライアントが接続した時の初期化処理を行います。
     * データ受信、認証、エラーハンドリングのイベントリスナーを設定します。
     *
     * @private
     * @param socket - 接続されたクライアントソケット
     */
    private handleConnection(socket: Socket): void {
        this.clients.add(socket);
        this.emit('connection', socket);

        let buffer = '';
        let authenticated = !this.options.authToken;

        socket.on('data', async (data) => {
            buffer += data.toString();

            // 改行で区切られたJSONメッセージを処理
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.trim()) {
                    continue;
                }

                try {
                    const message = JSON.parse(line);

                    // 認証処理
                    if (!authenticated && message.method === 'auth.login') {
                        authenticated = this.handleAuth(message, socket);
                        continue;
                    }

                    if (!authenticated) {
                        this.sendError(socket, message.id, -32001, 'Authentication required');
                        continue;
                    }

                    // JSON-RPCリクエストを処理
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
     * 認証処理
     *
     * クライアントからの認証リクエストを処理します。
     * 提供されたトークンがサーバーの認証トークンと一致するか確認します。
     *
     * @private
     * @param request - 認証リクエスト
     * @param socket - クライアントソケット
     * @returns boolean 認証成功時はtrue
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
     * JSON-RPCリクエストの処理
     *
     * クライアントからのJSON-RPCリクエストを処理します。
     * メソッドの存在を確認し、適切なハンドラを実行して結果を返します。
     * ストリーミングレスポンスもサポートします。
     *
     * @private
     * @param request - JSON-RPCリクエスト
     * @param socket - クライアントソケット
     */
    private async handleRequest(request: JsonRpcRequest, socket: Socket): Promise<void> {
        // JSON-RPC 2.0フォーマットの検証
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

            // ストリーミングレスポンス用の非同期ジェネレータを処理
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
     * JSON-RPCレスポンスの送信
     *
     * 成功結果を含むJSON-RPCレスポンスをクライアントに送信します。
     *
     * @private
     * @param socket - クライアントソケット
     * @param id - リクエストID
     * @param result - メソッドの実行結果
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
     * JSON-RPCエラーの送信
     *
     * エラー情報を含むJSON-RPCレスポンスをクライアントに送信します。
     *
     * @private
     * @param socket - クライアントソケット
     * @param id - リクエストID
     * @param code - エラーコード
     * @param message - エラーメッセージ
     * @param data - 追加のエラーデータ（オプション）
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
     * JSON-RPC通知の送信
     *
     * 応答を期待しない通知メッセージをクライアントに送信します。
     * ストリーミングチャンクやイベント通知に使用されます。
     *
     * @private
     * @param socket - クライアントソケット
     * @param method - 通知メソッド名
     * @param params - 通知パラメータ（オプション）
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
     * すべてのクライアントに通知をブロードキャスト
     *
     * 接続中のすべてのクライアントに同じ通知メッセージを送信します。
     * システムイベントや状態変更の通知に使用されます。
     *
     * @param method - 通知メソッド名
     * @param params - 通知パラメータ（オプション）
     *
     * @example
     * ```typescript
     * server.broadcast('system.status', { status: 'shutdown' });
     * ```
     */
    broadcast(method: string, params?: unknown): void {
        for (const client of this.clients) {
            this.sendNotification(client, method, params);
        }
    }

    /**
     * サーバー情報の取得
     *
     * サーバーの現在の状態、接続中クライアント数、
     * アドレス情報、認証トークンなどの情報を返します。
     *
     * @returns サーバーの現在の状態情報
     *
     * @example
     * ```typescript
     * const info = server.getInfo();
     * console.log(`Clients: ${info.clients}, Running: ${info.isRunning}`);
     * ```
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
 * 新しいIPCサーバーインスタンスを作成します
 *
 * 指定されたオプションでIPCサーバーを作成し、初期化済みのインスタンスを返します。
 * このファクトリ関数を使用することで、一貫したサーバー設定と初期化が保証されます。
 *
 * @param options - IPCサーバーの設定オプション（オプション）
 * @returns IPCServer 設定済みのIPCサーバーインスタンス
 *
 * @example
 * ```typescript
 * const server = createIPCServer({
 *   port: 9123,
 *   host: '127.0.0.1',
 *   authToken: 'my-secret-token',
 *   maxConnections: 10
 * });
 * ```
 */
export function createIPCServer(options?: IPCServerOptions): IPCServer {
    return new IPCServer(options);
}
