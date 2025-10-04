/**
 * プロセス間通信（IPC）クライアント
 *
 * 外部プロセスからIPCサーバーとの通信を行うための
 * JSON-RPC 2.0クライアントを提供します。
 * TCP/UNIXソケットを使用して、認証、自動再接続、
 * ストリーミングレスポンスなどの機能をサポートします。
 *
 * @module IPCClient
 */

import { EventEmitter } from 'node:events';
import { Socket } from 'node:net';
import type { IPCMethods, JsonRpcRequest, JsonRpcResponse } from './ipc-server.js';

/**
 * IPCクライアントのオプション設定
 *
 * @interface IPCClientOptions
 */
export interface IPCClientOptions {
    /** UNIXソケットのパス（TCPの代わりに使用） */
    socketPath?: string;
    /** TCPポート番号（デフォルト: 9123） */
    port?: number;
    /** ホスト名またはIPアドレス（デフォルト: 127.0.0.1） */
    host?: string;
    /** サーバー認証用のトークン */
    authToken?: string;
    /** 接続断絶時の自動再接続を有効にするか */
    reconnect?: boolean;
    /** 再接続の間隔（ミリ秒） */
    reconnectInterval?: number;
    /** リクエストのタイムアウト時間（ミリ秒） */
    timeout?: number;
}

/**
 * 保留中のリクエストの追跡情報
 *
 * @interface PendingRequest
 */
interface PendingRequest {
    /** リクエスト成功時に呼び出されるコールバック */
    resolve: (value: unknown) => void;
    /** リクエスト失敗時に呼び出されるコールバック */
    reject: (error: Error) => void;
    /** 呼び出されたメソッド名 */
    method: string;
    /** タイムアウト処理用のタイマー */
    timeout?: NodeJS.Timeout;
}

/**
 * IPCクライアントの実装
 *
 * JSON-RPC 2.0プロトコルを使用してIPCサーバーと通信を行います。
 * 自動認証、再接続、ストリーミングレスポンスなどの機能を提供し、
 * 外部プロセスからFluorite FlakeのCLI機能にアクセスできます。
 *
 * @class IPCClient
 * @extends EventEmitter
 *
 * @example
 * ```typescript
 * const client = new IPCClient({ port: 9123, authToken: 'token' });
 * await client.connect();
 * const result = await client.call('system.ping');
 * client.disconnect();
 * ```
 */
export class IPCClient extends EventEmitter {
    /** TCP/UNIXソケット接続 */
    private socket: Socket | null = null;
    /** サーバーへの接続状態 */
    private connected = false;
    /** 認証状態 */
    private authenticated = false;
    /** リクエストIDの連番カウンタ */
    private requestId = 0;
    /** 送信済みで応答待ちのリクエスト管理 */
    private pendingRequests: Map<string | number, PendingRequest> = new Map();
    /** 受信データの一時バッファ */
    private buffer = '';
    /** 再接続処理用のタイマー */
    private reconnectTimer?: NodeJS.Timeout;
    /** ストリーミングレスポンス用のハンドラ管理 */
    private streamHandlers: Map<string | number, (chunk: unknown) => void> = new Map();

    constructor(private options: IPCClientOptions) {
        super();
    }

    /**
     * IPCサーバーに接続します
     *
     * TCP/UNIXソケットを使用してサーバーに接続し、認証トークンが
     * 提供されている場合は自動的に認証を実行します。
     *
     * @returns Promise<void> 接続が完了したら解決されるPromise
     * @throws {Error} 接続または認証に失敗した場合
     *
     * @example
     * ```typescript
     * await client.connect();
     * console.log('接続しました');
     * ```
     */
    async connect(): Promise<void> {
        if (this.connected) {
            return;
        }

        return new Promise((resolve, reject) => {
            this.socket = new Socket();

            // ソケットパスまたはTCPポートを使用して接続オプションを設定
            const connectOptions = this.options.socketPath
                ? { path: this.options.socketPath }
                : { port: this.options.port || 9123, host: this.options.host || '127.0.0.1' };

            this.socket.connect(connectOptions, async () => {
                this.connected = true;
                this.emit('connected');

                // 認証トークンが提供されている場合は認証を実行
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
     * IPCサーバーから切断します
     *
     * ソケット接続を閉じ、保留中のリクエストをすべてキャンセルし、
     * 再接続タイマーを停止します。
     *
     * @example
     * ```typescript
     * client.disconnect();
     * console.log('切断しました');
     * ```
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
     * サーバーでの認証を実行します
     *
     * 設定された認証トークンを使用してサーバーにログインします。
     * 認証に成功すると、すべてのIPCメソッドにアクセスできるようになります。
     *
     * @private
     * @returns Promise<void> 認証が完了したら解決されるPromise
     * @throws {Error} 認証に失敗した場合
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
     * 受信データの処理
     *
     * ソケットから受信したデータをバッファに追加し、
     * 改行で区切られたJSONメッセージをパースして処理します。
     * JSON-RPCレスポンスと通知の両方をサポートします。
     *
     * @private
     * @param data - 受信したバイナリデータ
     */
    private handleData(data: Buffer): void {
        this.buffer += data.toString();

        // 改行で区切られたJSONメッセージを処理
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
     * JSON-RPCレスポンスの処理
     *
     * サーバーからのレスポンスを処理し、対応する保留中のリクエストを
     * 解決または拒否します。エラーレスポンスの場合はErrorオブジェクトを作成します。
     *
     * @private
     * @param response - JSON-RPCレスポンスオブジェクト
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
     * JSON-RPC通知の処理
     *
     * サーバーからの通知を処理します。ストリーミングチャンクの場合は
     * 対応するハンドラにデータを渡し、一般的な通知はイベントとして発行します。
     *
     * @private
     * @param notification - JSON-RPC通知オブジェクト
     */
    private handleNotification(notification: JsonRpcRequest): void {
        // ストリーミングチャンクの処理
        if (notification.method.endsWith('.chunk')) {
            const params = notification.params as { id?: string | number; data?: unknown };
            if (params?.id) {
                const handler = this.streamHandlers.get(params.id);
                if (handler) {
                    handler(params.data);
                }
            }
        }

        // 通知イベントを発行
        this.emit('notification', notification);
    }

    /**
     * 接続断絶の処理
     *
     * ソケット接続が失われた時の処理を行います。
     * 保留中のリクエストをクリアし、再接続が有効な場合は自動的に再接続を試みます。
     *
     * @private
     */
    private handleDisconnect(): void {
        this.connected = false;
        this.authenticated = false;
        this.emit('disconnected');

        // 保留中のリクエストをクリア
        this.clearPendingRequests(new Error('Connection lost'));

        // 再接続が有効な場合は再接続を試みる
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
     * すべての保留中リクエストのクリア
     *
     * 保留中のすべてのリクエストをエラーで拒否し、タイムアウトタイマーをクリアします。
     * ストリーミングハンドラも合わせてクリアします。
     *
     * @private
     * @param error - リクエストを拒否するためのエラー
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
     * JSON-RPCリクエストの送信
     *
     * 指定されたメソッドとパラメータでJSON-RPCリクエストを作成し、
     * サーバーに送信します。レスポンスを待つPromiseを返します。
     *
     * @private
     * @param method - 呼び出すメソッド名
     * @param params - メソッドのパラメータ
     * @returns Promise<unknown> メソッドの結果
     * @throws {Error} 接続していない、またはタイムアウトした場合
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
     * リモートメソッドの呼び出し
     *
     * 型安全な方法でIPCメソッドを呼び出します。
     * IPCMethodsインターフェースに定義されたメソッドのみ呼び出し可能です。
     *
     * @template K - IPCMethodsのメソッド名
     * @param method - 呼び出すメソッド名
     * @param params - メソッドのパラメータ
     * @returns Promise<ReturnType<IPCMethods[K]>> メソッドの戻り値
     *
     * @example
     * ```typescript
     * const result = await client.call('system.ping');
     * const data = await client.call('dashboard.getData');
     * ```
     */
    async call<K extends keyof IPCMethods>(
        method: K,
        params?: Parameters<IPCMethods[K]>[0]
    ): Promise<ReturnType<IPCMethods[K]>> {
        const result = await this.request(method, params);
        return result as ReturnType<IPCMethods[K]>;
    }

    /**
     * ストリーミングレスポンスでリモートメソッドを呼び出し
     *
     * ストリーミングレスポンスをサポートするメソッドを呼び出します。
     * チャンクデータはコールバック関数で逐次処理されます。
     *
     * @template K - IPCMethodsのメソッド名
     * @param method - 呼び出すメソッド名
     * @param params - メソッドのパラメータ
     * @param onChunk - チャンクデータを処理するコールバック
     * @returns Promise<void> ストリーミングが完了したら解決されるPromise
     *
     * @example
     * ```typescript
     * await client.callStream('dashboard.tailLogs', { workerName: 'my-worker' },
     *   (chunk) => console.log(chunk)
     * );
     * ```
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
     * クライアントの接続状態を確認
     *
     * @returns boolean 接続している場合はtrue
     */
    isConnected(): boolean {
        return this.connected;
    }

    /**
     * クライアントの認証状態を確認
     *
     * @returns boolean 認証済みの場合はtrue
     */
    isAuthenticated(): boolean {
        return this.authenticated;
    }
}

/**
 * 新しいIPCクライアントインスタンスを作成します
 *
 * 指定されたオプションでIPCクライアントを作成し、初期化済みのインスタンスを返します。
 * このファクトリ関数を使用することで、一貫したクライアント設定と初期化が保証されます。
 *
 * @param options - IPCクライアントの設定オプション
 * @returns IPCClient 設定済みのIPCクライアントインスタンス
 *
 * @example
 * ```typescript
 * const client = createIPCClient({
 *   port: 9123,
 *   host: '127.0.0.1',
 *   authToken: 'my-secret-token',
 *   reconnect: true
 * });
 * ```
 */
export function createIPCClient(options: IPCClientOptions): IPCClient {
    return new IPCClient(options);
}
