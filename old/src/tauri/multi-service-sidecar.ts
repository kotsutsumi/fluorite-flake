/**
 * マルチサービスTauriサイドカー統合
 *
 * WebSocketプロトコル上のJSON-RPC 2.0を通じて複数のクラウドサービスを
 * サポートする拡張Tauriサイドカー。サポートされる全サービス
 * (Vercel、Supabase、Turso、AWS、GitHub、Cloudflare)用の統合インターフェースを提供します。
 */

import { EventEmitter } from 'node:events';
import { v4 as uuidv4 } from 'uuid';
import { type WebSocket, WebSocketServer } from 'ws';
import { DashboardOrchestrator } from '../dashboard/dashboard-orchestrator.js';
import type { DashboardConfig } from '../dashboard/dashboard-orchestrator.js';
import type {
    AuthConfig,
    ServiceAction,
    ServiceConfig,
} from '../services/base-service-adapter/index.js';
import { DefaultServiceFactory } from '../services/service-factory/index.js';

/**
 * JSON-RPC 2.0メッセージタイプ
 */
interface JsonRpcRequest {
    jsonrpc: '2.0';
    method: string;
    params?: Record<string, unknown>;
    id?: string | number | null;
}

interface JsonRpcResponse {
    jsonrpc: '2.0';
    result?: Record<string, unknown>;
    error?: JsonRpcError;
    id: string | number | null;
}

interface JsonRpcError {
    code: number;
    message: string;
    data?: Record<string, unknown>;
}

/**
 * マルチサービスサイドカー設定
 */
export interface MultiServiceSidecarConfig {
    /** WebSocketサーバーポート */
    port?: number;
    /** WebSocketサーバーホスト */
    host?: string;
    /** 認証トークン */
    authToken?: string;
    /** デバッグログを有効にする */
    debug?: boolean;
    /** ダッシュボード更新間隔（ミリ秒） */
    refreshInterval?: number;
    /** サービス設定 */
    services?: Record<string, ServiceConfig>;
    /** バイナリデータ用MessagePackを有効にする */
    enableMessagePack?: boolean;
}

/**
 * サービスメソッドレジストリ
 */
interface ServiceMethod {
    service: string;
    handler: (params: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

/**
 * マルチサービスTauriサイドカー
 *
 * 統合APIを通じて複数のクラウドサービスとインタラクションする
 * JSON-RPC 2.0リクエストを受け付けるWebSocketサーバーを提供します。
 */
export class MultiServiceTauriSidecar extends EventEmitter {
    private server?: WebSocketServer;
    private clients: Set<WebSocket> = new Set();
    private orchestrator: DashboardOrchestrator;
    private methods: Map<string, ServiceMethod> = new Map();
    private isRunning = false;

    constructor(private config: MultiServiceSidecarConfig = {}) {
        super();
        this.config = {
            port: config.port || 9124,
            host: config.host || '127.0.0.1',
            debug: config.debug || false,
            refreshInterval: config.refreshInterval || 5000,
            enableMessagePack: config.enableMessagePack || false,
            ...config,
        };

        // サイドカー設定からダッシュボード設定を作成
        const dashboardConfig: DashboardConfig = {
            refreshInterval: this.config.refreshInterval || 5000,
            autoInitServices: [],
            protocol: {
                primary: 'websocket',
                wsPort: this.config.port || 9124,
                httpPort: this.config.port || 9124,
                authToken: this.config.authToken,
            },
            display: {
                theme: 'dark',
                layout: 'grid',
                autoRefresh: true,
            },
        };

        const serviceFactory = new DefaultServiceFactory();
        this.orchestrator = new DashboardOrchestrator(dashboardConfig, serviceFactory);
        this.registerMethods();
    }

    /**
     * JSON-RPCメソッドを登録
     */
    private registerMethods(): void {
        // システムメソッド
        this.registerMethod('system.ping', async () => ({ pong: Date.now() }));
        this.registerMethod('system.info', async () => ({
            version: '1.0.0',
            services: this.orchestrator.getServices(),
            capabilities: {
                jsonrpc: true,
                websocket: true,
                messagePack: this.config.enableMessagePack,
            },
        }));

        // サービス管理メソッド
        this.registerMethod('service.add', async (params: Record<string, unknown>) => {
            const typedParams = params as {
                name: string;
                config?: ServiceConfig;
                authConfig?: AuthConfig;
            };
            await this.orchestrator.addService(
                typedParams.name,
                typedParams.config,
                typedParams.authConfig
            );
            return { success: true, service: typedParams.name };
        });

        this.registerMethod('service.remove', async (params: Record<string, unknown>) => {
            const typedParams = params as { name: string };
            await this.orchestrator.removeService(typedParams.name);
            return { success: true, service: typedParams.name };
        });

        this.registerMethod('service.list', async () => {
            return { services: this.orchestrator.getServices() };
        });

        this.registerMethod('service.status', async (params: Record<string, unknown>) => {
            const typedParams = params as { name: string };
            const adapter = this.orchestrator.getService(typedParams.name);
            if (!adapter) {
                throw new Error(`Service ${typedParams.name} not found`);
            }
            return adapter.getStatus() as unknown as Promise<Record<string, unknown>>;
        });

        // ダッシュボードデータメソッド
        this.registerMethod('dashboard.getData', async (params: Record<string, unknown>) => {
            const typedParams = params as { service?: string } | undefined;
            if (typedParams?.service) {
                return (await this.orchestrator.getServiceDashboardData(
                    typedParams.service
                )) as Record<string, unknown>;
            }
            return (await this.orchestrator.getMultiServiceDashboardData()) as unknown as Record<
                string,
                unknown
            >;
        });

        this.registerMethod('dashboard.getMetrics', async (params: Record<string, unknown>) => {
            const typedParams = params as { service?: string } | undefined;
            if (typedParams?.service) {
                const adapter = this.orchestrator.getService(typedParams.service);
                if (!adapter) {
                    throw new Error(`Service ${typedParams.service} not found`);
                }
                return (await adapter.getMetrics()) as unknown as Record<string, unknown>;
            }
            // すべてのサービスの集約メトリクスを返す
            const metrics: Record<string, Record<string, unknown>> = {};
            const services = this.orchestrator.getServices();
            for (const name of services) {
                const adapter = this.orchestrator.getService(name);
                if (adapter) {
                    metrics[name] = (await adapter.getMetrics()) as unknown as Record<
                        string,
                        unknown
                    >;
                }
            }
            return metrics;
        });

        // リソース管理メソッド
        this.registerMethod('resource.list', async (params: Record<string, unknown>) => {
            const typedParams = params as {
                service: string;
                type?: string;
            };
            const adapter = this.orchestrator.getService(typedParams.service);
            if (!adapter) {
                throw new Error(`Service ${typedParams.service} not found`);
            }
            return (await adapter.listResources(typedParams.type)) as unknown as Record<
                string,
                unknown
            >;
        });

        this.registerMethod('resource.get', async (params: Record<string, unknown>) => {
            const typedParams = params as {
                service: string;
                id: string;
                type: string;
            };
            const adapter = this.orchestrator.getService(typedParams.service);
            if (!adapter) {
                throw new Error(`Service ${typedParams.service} not found`);
            }
            return (await adapter.getResource(
                typedParams.id,
                typedParams.type
            )) as unknown as Record<string, unknown>;
        });

        this.registerMethod('resource.action', async (params: Record<string, unknown>) => {
            const typedParams = params as {
                service: string;
                action: Record<string, unknown>;
            };
            const adapter = this.orchestrator.getService(typedParams.service);
            if (!adapter) {
                throw new Error(`Service ${typedParams.service} not found`);
            }
            return (await adapter.executeAction(
                typedParams.action as unknown as ServiceAction
            )) as unknown as Record<string, unknown>;
        });

        // サービス固有メソッド
        this.registerServiceMethods('vercel', [
            'deployProject',
            'listDeployments',
            'promoteDeployment',
            'rollbackDeployment',
        ]);

        this.registerServiceMethods('supabase', [
            'createFunction',
            'deployFunction',
            'dbPush',
            'dbPull',
        ]);

        this.registerServiceMethods('turso', [
            'createDatabase',
            'createReplica',
            'showDatabaseUrl',
            'createToken',
        ]);

        this.registerServiceMethods('aws', [
            'startInstance',
            'stopInstance',
            'invokeFunction',
            'createStack',
        ]);

        this.registerServiceMethods('github', [
            'createIssue',
            'createPullRequest',
            'mergePullRequest',
            'runWorkflow',
        ]);

        this.registerServiceMethods('cloudflare', [
            'deployWorker',
            'listWorkers',
            'createKVNamespace',
            'createR2Bucket',
        ]);
    }

    /**
     * サービス固有メソッドを登録
     */
    private registerServiceMethods(service: string, methods: string[]): void {
        for (const method of methods) {
            this.registerMethod(`${service}.${method}`, async (params: Record<string, unknown>) => {
                const adapter = this.orchestrator.getService(service);
                if (!adapter) {
                    throw new Error(`Service ${service} not found`);
                }

                // メソッドをアクションタイプにマップ
                const action = {
                    type: method.replace(/([A-Z])/g, '-$1').toLowerCase(),
                    params,
                };

                return (await adapter.executeAction(action)) as unknown as Record<string, unknown>;
            });
        }
    }

    /**
     * JSON-RPCメソッドを登録
     */
    private registerMethod(
        name: string,
        handler: (params: Record<string, unknown>) => Promise<Record<string, unknown>>
    ): void {
        const [service] = name.split('.');
        this.methods.set(name, { service, handler });
    }

    /**
     * WebSocketサーバーを開始
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            return;
        }

        // WebSocketサーバーを作成
        this.server = new WebSocketServer({
            port: this.config.port,
            host: this.config.host,
        });

        this.server.on('connection', (ws: WebSocket, req: Record<string, unknown>) => {
            this.handleConnection(ws, req);
        });

        this.server.on('error', (error: Error) => {
            this.emit('error', error);
            if (this.config.debug) {
                console.error('[Sidecar] Server error:', error);
            }
        });

        this.isRunning = true;
        this.emit('started');

        if (this.config.debug) {
            console.log(
                `[Sidecar] WebSocket server started on ws://${this.config.host}:${this.config.port}`
            );
        }

        // 設定されている場合はデフォルトサービスを初期化
        if (this.config.services) {
            for (const [name, config] of Object.entries(this.config.services)) {
                try {
                    await this.orchestrator.addService(name, config);
                    if (this.config.debug) {
                        console.log(`[Sidecar] Added service: ${name}`);
                    }
                } catch (error) {
                    console.error(`[Sidecar] Failed to add service ${name}:`, error);
                }
            }
        }
    }

    /**
     * WebSocketサーバーを停止
     */
    async stop(): Promise<void> {
        if (!this.isRunning) {
            return;
        }

        // すべてのクライアント接続を閉じる
        for (const client of this.clients) {
            client.close(1000, 'Server shutting down');
        }
        this.clients.clear();

        // サーバーを閉じる
        if (this.server) {
            await new Promise<void>((resolve) => {
                this.server?.close(() => resolve());
            });
            this.server = undefined;
        }

        // オーケストレーターを停止
        await this.orchestrator.stop();

        this.isRunning = false;
        this.emit('stopped');

        if (this.config.debug) {
            console.log('[Sidecar] WebSocket server stopped');
        }
    }

    /**
     * WebSocket接続を処理
     */
    private handleConnection(ws: WebSocket, req: Record<string, unknown>): void {
        // トークンが設定されている場合は認証をチェック
        if (this.config.authToken) {
            // biome-ignore lint/suspicious/noExplicitAny: WebSocket request headers are loosely typed
            const token = (req.headers as any)?.authorization?.replace('Bearer ', '');
            if (token !== this.config.authToken) {
                ws.close(1008, 'Unauthorized');
                return;
            }
        }

        this.clients.add(ws);
        const clientId = uuidv4();

        if (this.config.debug) {
            console.log(`[Sidecar] Client connected: ${clientId}`);
        }

        ws.on('message', async (data: Buffer | string) => {
            try {
                const message = JSON.parse(data.toString());
                await this.handleMessage(ws, message);
            } catch (_error) {
                this.sendError(ws, null, -32700, 'Parse error');
            }
        });

        ws.on('close', () => {
            this.clients.delete(ws);
            if (this.config.debug) {
                console.log(`[Sidecar] Client disconnected: ${clientId}`);
            }
        });

        ws.on('error', (error: Error) => {
            if (this.config.debug) {
                console.error(`[Sidecar] Client error (${clientId}):`, error);
            }
        });

        // ウェルカムメッセージを送信
        this.sendNotification(ws, 'connected', {
            clientId,
            services: this.orchestrator.getServices(),
        });
    }

    /**
     * JSON-RPCメッセージを処理
     */
    private async handleMessage(ws: WebSocket, message: JsonRpcRequest): Promise<void> {
        // JSON-RPCフォーマットを検証
        if (message.jsonrpc !== '2.0') {
            this.sendError(ws, message.id || null, -32600, 'Invalid Request');
            return;
        }

        // 通知を処理（IDなし）
        if (message.id === undefined || message.id === null) {
            // 通知は応答を必要としない
            try {
                await this.executeMethod(message.method, message.params);
            } catch (error) {
                // エラーをログ出力するが、通知に対しては応答を送信しない
                if (this.config.debug) {
                    console.error('[Sidecar] Notification error:', error);
                }
            }
            return;
        }

        // リクエストを処理（IDあり）
        try {
            const result = await this.executeMethod(message.method, message.params);
            this.sendResponse(ws, message.id, result);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.sendError(ws, message.id, -32603, errorMessage);
        }
    }

    /**
     * 登録されたメソッドを実行
     */
    private async executeMethod(
        method: string,
        params?: Record<string, unknown>
    ): Promise<Record<string, unknown>> {
        const methodDef = this.methods.get(method);
        if (!methodDef) {
            throw new Error(`Method not found: ${method}`);
        }

        return await methodDef.handler(params || {});
    }

    /**
     * JSON-RPC応答を送信
     */
    private sendResponse(
        ws: WebSocket,
        id: string | number,
        result: Record<string, unknown>
    ): void {
        const response: JsonRpcResponse = {
            jsonrpc: '2.0',
            result,
            id,
        };
        ws.send(JSON.stringify(response));
    }

    /**
     * JSON-RPCエラーを送信
     */
    private sendError(
        ws: WebSocket,
        id: string | number | null,
        code: number,
        message: string,
        data?: Record<string, unknown>
    ): void {
        const response: JsonRpcResponse = {
            jsonrpc: '2.0',
            error: { code, message, data },
            id,
        };
        ws.send(JSON.stringify(response));
    }

    /**
     * JSON-RPC通知を送信
     */
    private sendNotification(
        ws: WebSocket,
        method: string,
        params?: Record<string, unknown>
    ): void {
        const notification: JsonRpcRequest = {
            jsonrpc: '2.0',
            method,
            params,
        };
        ws.send(JSON.stringify(notification));
    }

    /**
     * 全クライアントに通知をブロードキャスト
     */
    // private _broadcast(_method: string, _params?: any): void {
    //   for (const client of this.clients) {
    //     if (client.readyState === WebSocket.OPEN) {
    //       this.sendNotification(client, _method, _params);
    //     }
    //   }
    // }

    /**
     * サーバーステータスを取得
     */
    getStatus(): {
        running: boolean;
        clients: number;
        services: string[];
    } {
        return {
            running: this.isRunning,
            clients: this.clients.size,
            services: this.orchestrator.getServices(),
        };
    }
}

/**
 * マルチサービスTauriサイドカーを作成して開始
 */
export async function createMultiServiceSidecar(
    config?: MultiServiceSidecarConfig
): Promise<MultiServiceTauriSidecar> {
    const sidecar = new MultiServiceTauriSidecar(config);
    await sidecar.start();
    return sidecar;
}

// Tauriコマンド用のグローバルサイドカーインスタンス
let globalSidecar: MultiServiceTauriSidecar | null = null;

/**
 * Tauri用マルチサービスサイドカーを初期化
 */
export async function initializeMultiServiceSidecar(
    config?: MultiServiceSidecarConfig
): Promise<void> {
    if (globalSidecar) {
        await globalSidecar.stop();
    }

    globalSidecar = await createMultiServiceSidecar(config);
}

/**
 * マルチサービスサイドカーをシャットダウン
 */
export async function shutdownMultiServiceSidecar(): Promise<void> {
    if (globalSidecar) {
        await globalSidecar.stop();
        globalSidecar = null;
    }
}

/**
 * マルチサービスサイドカーのステータスを取得
 */
export function getMultiServiceSidecarStatus(): Record<string, unknown> {
    return (
        globalSidecar?.getStatus() || {
            running: false,
            clients: 0,
            services: [],
        }
    );
}
