/**
 * Tauriサイドカー統合
 *
 * TauriデスクトップアプリケーションとFluorite Flake CLI間の
 * ブリッジを提供し、Cloudflare Workers管理機能をデスクトップアプリから
 * 利用できるようにします。
 *
 * サイドカープロセスとしてFluorite Flake CLIを起動し、IPC通信で
 * コマンドを実行し、結果をTauriアプリに返します。
 * プロセス管理、エラーハンドリング、自動再起動機能を提供します。
 *
 * @module TauriSidecar
 */

import { type ChildProcess, spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { type IPCClient, createIPCClient } from '../ipc/ipc-client.js';

/**
 * サイドカーの設定オプション
 *
 * @interface SidecarOptions
 */
export interface SidecarOptions {
    /** Fluorite Flake CLIバイナリのパス */
    cliPath?: string;
    /** IPCサーバーのポート番号 */
    ipcPort?: number;
    /** IPCサーバーのホスト名 */
    ipcHost?: string;
    /** IPC認証用トークン */
    authToken?: string;
    /** デバッグ出力を有効にする */
    debug?: boolean;
    /** クラッシュ時の自動再起動 */
    autoRestart?: boolean;
    /** 再起動の遅延時間（ミリ秒） */
    restartDelay?: number;
}

/**
 * サイドカープロセスの状態
 *
 * @enum SidecarState
 */
export enum SidecarState {
    /** 未開始状態 */
    IDLE = 'idle',
    /** 起動中 */
    STARTING = 'starting',
    /** 稼働中 */
    RUNNING = 'running',
    /** 停止中 */
    STOPPING = 'stopping',
    /** 停止済み */
    STOPPED = 'stopped',
    /** エラー状態 */
    ERROR = 'error',
    /** 再起動中 */
    RESTARTING = 'restarting',
}

/**
 * Tauriサイドカーマネージャ
 *
 * Fluorite Flake CLIサイドカープロセスのライフサイクルを管理し、
 * Tauriアプリケーション向けの高レベルAPIを提供します。
 *
 * プロセスの起動、停止、監視、再起動機能を管理し、
 * IPC通信でCLI機能にアクセスできるようにします。
 * エラーハンドリング、状態管理、イベント通知機能も備えています。
 *
 * @class TauriSidecar
 * @extends EventEmitter
 *
 * @example
 * ```typescript
 * const sidecar = new TauriSidecar({ debug: true, autoRestart: true });
 * await sidecar.start();
 * const result = await sidecar.call('system.ping');
 * await sidecar.stop();
 * ```
 */
export class TauriSidecar extends EventEmitter {
    /** サイドカープロセスのインスタンス */
    private process: ChildProcess | null = null;
    /** IPCクライアント接続 */
    private ipcClient: IPCClient | null = null;
    /** 現在のサイドカー状態 */
    private state: SidecarState = SidecarState.IDLE;
    /** 再起動用タイマー */
    private restartTimer?: NodeJS.Timeout;
    /** 再起動試行回数 */
    private restartCount = 0;
    /** 最大再起動回数 */
    private maxRestarts = 5;

    constructor(private options: SidecarOptions = {}) {
        super();
        this.options = {
            cliPath: options.cliPath || 'fluorite-flake',
            ipcPort: options.ipcPort || 9123,
            ipcHost: options.ipcHost || '127.0.0.1',
            debug: options.debug || false,
            autoRestart: options.autoRestart || true,
            restartDelay: options.restartDelay || 5000,
            ...options,
        };
    }

    /**
     * サイドカープロセスの起動
     *
     * Fluorite Flake CLIをサイドカープロセスとして起動し、
     * IPCサーバーとの接続を確立します。エラー時の自動再起動、
     * プロセス状態の監視、イベント通知機能も含まれます。
     *
     * @returns Promise<void> 起動が完了したら解決されるPromise
     * @throws {Error} 起動に失敗した場合
     *
     * @example
     * ```typescript
     * await sidecar.start();
     * console.log('サイドカーが起動しました');
     * ```
     */
    async start(): Promise<void> {
        if (this.state === SidecarState.RUNNING) {
            return;
        }

        this.setState(SidecarState.STARTING);

        try {
            // IPCサーバープロセスを起動
            await this.startIPCServer();

            // IPCサーバーに接続
            await this.connectToIPC();

            this.setState(SidecarState.RUNNING);
            this.restartCount = 0;
            this.emit('started');
        } catch (error) {
            this.setState(SidecarState.ERROR);
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * サイドカープロセスの停止
     *
     * サイドカープロセスを安全に停止し、リソースをクリーンアップします。
     * IPC接続の切断、タイマーのクリア、プロセスの終了を順次実行します。
     * 強制終了のタイムアウト機能も備えています。
     *
     * @returns Promise<void> 停止が完了したら解決されるPromise
     *
     * @example
     * ```typescript
     * await sidecar.stop();
     * console.log('サイドカーが停止しました');
     * ```
     */
    async stop(): Promise<void> {
        if (this.state === SidecarState.STOPPED || this.state === SidecarState.IDLE) {
            return;
        }

        this.setState(SidecarState.STOPPING);

        // 再起動タイマーをクリア
        if (this.restartTimer) {
            clearTimeout(this.restartTimer);
            this.restartTimer = undefined;
        }

        // IPCクライアントを切断
        if (this.ipcClient) {
            this.ipcClient.disconnect();
            this.ipcClient = null;
        }

        // プロセスを終了
        if (this.process) {
            this.process.kill('SIGTERM');
            await new Promise<void>((resolve) => {
                const timeout = setTimeout(() => {
                    this.process?.kill('SIGKILL');
                    resolve();
                }, 5000);

                this.process?.once('exit', () => {
                    clearTimeout(timeout);
                    resolve();
                });
            });
            this.process = null;
        }

        this.setState(SidecarState.STOPPED);
        this.emit('stopped');
    }

    /**
     * サイドカープロセスの再起動
     *
     * 現在のサイドカープロセスを停止し、新しいプロセスで再起動します。
     * システムの状態をリセットし、新たなIPC接続を磺立します。
     *
     * @returns Promise<void> 再起動が完了したら解決されるPromise
     *
     * @example
     * ```typescript
     * await sidecar.restart();
     * console.log('サイドカーが再起動しました');
     * ```
     */
    async restart(): Promise<void> {
        await this.stop();
        await this.start();
    }

    /**
     * IPCサーバープロセスの起動
     *
     * Fluorite Flake CLIをIPCサーバーモードで起動し、
     * サーバーの準備が完了するまで待機します。
     * プロセスのエラーと終了イベントを監視します。
     *
     * @private
     * @returns Promise<void> サーバーが起動したら解決されるPromise
     * @throws {Error} サーバー起動に失敗した場合
     */
    private async startIPCServer(): Promise<void> {
        const args = [
            'ipc',
            '--port',
            (this.options.ipcPort || 9123).toString(),
            '--host',
            this.options.ipcHost || '127.0.0.1',
        ];

        if (this.options.authToken) {
            args.push('--token', this.options.authToken);
        }

        if (this.options.debug) {
            args.push('--verbose');
        }

        this.process = spawn(this.options.cliPath || 'fluorite-flake', args, {
            stdio: this.options.debug ? 'inherit' : 'ignore',
            detached: false,
        });

        this.process.on('error', (error) => {
            this.emit('process-error', error);
            this.handleProcessError(error);
        });

        this.process.on('exit', (code, signal) => {
            this.emit('process-exit', { code, signal });
            this.handleProcessExit(code, signal);
        });

        // サーバーの準備完了を待機
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('IPC server startup timeout'));
            }, 10000);

            const checkServer = async () => {
                try {
                    const testClient = createIPCClient({
                        port: this.options.ipcPort,
                        host: this.options.ipcHost,
                        authToken: this.options.authToken,
                    });

                    await testClient.connect();
                    testClient.disconnect();
                    clearTimeout(timeout);
                    resolve();
                } catch {
                    setTimeout(checkServer, 500);
                }
            };

            setTimeout(checkServer, 1000);
        });
    }

    /**
     * IPCサーバーへの接続
     *
     * 起動したIPCサーバーにクライアントとして接続し、
     * 通信チャンネルを確立します。接続イベントのハンドラを設定し、
     * 自動再接続機能を有効にします。
     *
     * @private
     * @returns Promise<void> 接続が完了したら解決されるPromise
     */
    private async connectToIPC(): Promise<void> {
        this.ipcClient = createIPCClient({
            port: this.options.ipcPort,
            host: this.options.ipcHost,
            authToken: this.options.authToken,
            reconnect: true,
            reconnectInterval: 5000,
        });

        await this.ipcClient.connect();

        this.ipcClient.on('disconnected', () => {
            this.emit('ipc-disconnected');
        });

        this.ipcClient.on('connected', () => {
            this.emit('ipc-connected');
        });

        this.ipcClient.on('error', (error) => {
            this.emit('ipc-error', error);
        });
    }

    /**
     * プロセスエラーの処理
     *
     * サイドカープロセスでエラーが発生した際の処理を行います。
     * 自動再起動が有効な場合は再起動をスケジュールし、
     * 最大再起動回数に達した場合はエラー状態に移行します。
     *
     * @private
     * @param error - 発生したエラー
     */
    private handleProcessError(error: Error): void {
        if (this.options.debug) {
            console.error('[Sidecar] Process error:', error);
        }

        if (this.options.autoRestart && this.restartCount < this.maxRestarts) {
            this.scheduleRestart();
        } else {
            this.setState(SidecarState.ERROR);
        }
    }

    /**
     * プロセス終了の処理
     *
     * サイドカープロセスが終了した際の処理を行います。
     * 意図的な停止でない場合は、自動再起動機能が有効であれば
     * 再起動をスケジュールします。最大再起動回数に達した場合は
     * エラー状態に移行します。
     *
     * @private
     * @param code - 終了コード
     * @param signal - 終了シグナル
     */
    private handleProcessExit(code: number | null, signal: string | null): void {
        if (this.options.debug) {
            console.log(`[Sidecar] Process exited with code ${code}, signal ${signal}`);
        }

        if (this.state === SidecarState.STOPPING) {
            return; // 予期された終了
        }

        if (this.options.autoRestart && this.restartCount < this.maxRestarts) {
            this.scheduleRestart();
        } else if (this.restartCount >= this.maxRestarts) {
            this.setState(SidecarState.ERROR);
            this.emit('max-restarts-reached', this.restartCount);
        }
    }

    /**
     * 再起動のスケジュール
     *
     * 指定された遅延時間後にサイドカープロセスの再起動を実行します。
     * 再起動回数をカウントし、状態を再起動中に変更してから
     * タイマーを設定します。再起動に失敗した場合はイベントを発火します。
     *
     * @private
     */
    private scheduleRestart(): void {
        this.setState(SidecarState.RESTARTING);
        this.restartCount++;

        this.restartTimer = setTimeout(async () => {
            try {
                await this.start();
            } catch (error) {
                this.emit('restart-failed', error);
            }
        }, this.options.restartDelay);
    }

    /**
     * サイドカー状態の設定
     *
     * サイドカーの状態を変更し、状態変更イベントを発火します。
     * 古い状態と新しい状態の両方を含むイベントデータが提供されます。
     *
     * @private
     * @param state - 新しい状態
     */
    private setState(state: SidecarState): void {
        const oldState = this.state;
        this.state = state;
        this.emit('state-change', { from: oldState, to: state });
    }

    /**
     * 現在の状態を取得
     *
     * @returns SidecarState サイドカーの現在の状態
     */
    getState(): SidecarState {
        return this.state;
    }

    /**
     * サイドカーの稼働状態を確認
     *
     * @returns boolean 稼働中の場合はtrue
     */
    isRunning(): boolean {
        return this.state === SidecarState.RUNNING;
    }

    /**
     * IPCクライアントの取得
     *
     * @returns IPCClient | null IPCクライアントインスタンスまたはnull
     */
    getIPCClient(): IPCClient | null {
        return this.ipcClient;
    }

    /**
     * IPCメソッドの呼び出し
     *
     * 接続されたIPCクライアントを使用して、指定されたメソッドを実行します。
     * 簡単なラッパーメソッドで、内部のIPCクライアントを直接操作せずに済みます。
     *
     * @template T - 戻り値の型
     * @param method - 呼び出すメソッド名
     * @param params - メソッドのパラメータ
     * @returns Promise<T> メソッドの実行結果
     * @throws {Error} IPCクライアントが接続していない場合
     */
    async call<T = unknown>(method: string, params?: unknown): Promise<T> {
        if (!this.ipcClient) {
            throw new Error('IPC client not connected');
        }
        return this.ipcClient.call(method as never, params as never) as T;
    }
}

/**
 * 新しいTauriサイドカーインスタンスを作成
 *
 * 指定されたオプションでTauriサイドカーインスタンスを作成します。
 * このファクトリ関数を使用することで、一貫した設定と初期化が保証されます。
 *
 * @param options - サイドカーの設定オプション（オプション）
 * @returns TauriSidecar 設定済みのサイドカーインスタンス
 *
 * @example
 * ```typescript
 * const sidecar = createTauriSidecar({
 *   debug: true,
 *   autoRestart: true,
 *   restartDelay: 3000
 * });
 * ```
 */
export function createTauriSidecar(options?: SidecarOptions): TauriSidecar {
    return new TauriSidecar(options);
}

/**
 * Tauriコマンドバインディング
 *
 * これらの関数はTauriコマンドシステムを通じてTauriフロントエンドに
 * 公開され、UIから直接呼び出すことができます。
 * グローバルサイドカーインスタンスを管理し、簡単なインターフェースを提供します。
 */

let sidecar: TauriSidecar | null = null;

/**
 * サイドカーの初期化
 *
 * グローバルサイドカーインスタンスを作成し、起動します。
 * 既存のサイドカーが存在する場合は、まず停止してから新しいインスタンスを作成します。
 * Tauriアプリケーションから呼び出すことを想定しています。
 *
 * @param options - サイドカーの設定オプション（オプション）
 * @returns Promise<void> 初期化が完了したら解決されるPromise
 *
 * @example
 * ```typescript
 * // Tauriコマンドで使用
 * await initializeSidecar({ debug: true });
 * ```
 */
export async function initializeSidecar(options?: SidecarOptions): Promise<void> {
    if (sidecar) {
        await sidecar.stop();
    }

    sidecar = createTauriSidecar(options);
    await sidecar.start();
}

/**
 * サイドカーのシャットダウン
 *
 * グローバルサイドカーインスタンスを停止し、リソースを解放します。
 * アプリケーション終了時やクリーンアップ時に呼び出します。
 * Tauriアプリケーションから呼び出すことを想定しています。
 *
 * @returns Promise<void> シャットダウンが完了したら解決されるPromise
 *
 * @example
 * ```typescript
 * // アプリ終了時に呼び出し
 * await shutdownSidecar();
 * ```
 */
export async function shutdownSidecar(): Promise<void> {
    if (sidecar) {
        await sidecar.stop();
        sidecar = null;
    }
}

/**
 * ダッシュボードデータの取得
 *
 * Cloudflareダッシュボードのデータを取得します。
 * Workers、R2バケット、KVネームスペースの情報が含まれます。
 *
 * @returns Promise<unknown> ダッシュボードデータ
 * @throws {Error} サイドカーが初期化されていない場合
 *
 * @example
 * ```typescript
 * const data = await getDashboardData();
 * console.log('ダッシュボードデータ:', data);
 * ```
 */
export async function getDashboardData(): Promise<unknown> {
    if (!sidecar) {
        throw new Error('Sidecar not initialized');
    }
    return sidecar.call('dashboard.getData');
}

/**
 * Workerのデプロイ
 *
 * 指定されたWorkerをCloudflareにデプロイします。
 * ドライランモード、環境指定などのオプションをサポートします。
 *
 * @param params - デプロイパラメータ
 * @param params.name - Worker名（オプション）
 * @param params.env - デプロイ環境（オプション）
 * @param params.dryRun - ドライランモード（オプション）
 * @returns Promise<unknown> デプロイ結果
 * @throws {Error} サイドカーが初期化されていない場合
 *
 * @example
 * ```typescript
 * // ドライランでテスト
 * await deployWorker({ name: 'my-worker', dryRun: true });
 *
 * // 本番環境にデプロイ
 * await deployWorker({ name: 'my-worker', env: 'production' });
 * ```
 */
export async function deployWorker(params: {
    name?: string;
    env?: string;
    dryRun?: boolean;
}): Promise<unknown> {
    if (!sidecar) {
        throw new Error('Sidecar not initialized');
    }
    return sidecar.call('dashboard.deployWorker', params);
}

/**
 * R2バケットの一覧取得
 *
 * Cloudflare R2バケットの一覧を取得します。
 * アカウントに関連付けられた全てのR2バケット情報を返します。
 *
 * @returns Promise<unknown> R2バケットの一覧データ
 * @throws {Error} サイドカーが初期化されていない場合
 *
 * @example
 * ```typescript
 * const buckets = await listR2Buckets();
 * console.log('R2バケット:', buckets);
 * ```
 */
export async function listR2Buckets(): Promise<unknown> {
    if (!sidecar) {
        throw new Error('Sidecar not initialized');
    }
    return sidecar.call('dashboard.listR2Buckets');
}

/**
 * R2バケットの作成
 *
 * 指定された名前でCloudflare R2バケットを作成します。
 * バケット名はグローバルに一意である必要があります。
 *
 * @param name - 作成するバケット名
 * @returns Promise<unknown> バケット作成結果
 * @throws {Error} サイドカーが初期化されていない場合
 *
 * @example
 * ```typescript
 * await createR2Bucket('my-new-bucket');
 * console.log('バケットを作成しました');
 * ```
 */
export async function createR2Bucket(name: string): Promise<unknown> {
    if (!sidecar) {
        throw new Error('Sidecar not initialized');
    }
    return sidecar.call('dashboard.createR2Bucket', { name });
}

/**
 * R2バケットの削除
 *
 * 指定された名前のCloudflare R2バケットを削除します。
 * バケット内にオブジェクトが存在する場合は削除に失敗する可能性があります。
 *
 * @param name - 削除するバケット名
 * @returns Promise<unknown> バケット削除結果
 * @throws {Error} サイドカーが初期化されていない場合
 *
 * @example
 * ```typescript
 * await deleteR2Bucket('old-bucket');
 * console.log('バケットを削除しました');
 * ```
 */
export async function deleteR2Bucket(name: string): Promise<unknown> {
    if (!sidecar) {
        throw new Error('Sidecar not initialized');
    }
    return sidecar.call('dashboard.deleteR2Bucket', { name });
}

/**
 * サイドカー状態の取得
 *
 * 現在のサイドカーインスタンスの状態を取得します。
 * サイドカーが初期化されていない場合はnullを返します。
 *
 * @returns SidecarState | null サイドカーの現在の状態またはnull
 *
 * @example
 * ```typescript
 * const state = getSidecarState();
 * console.log('サイドカー状態:', state);
 * ```
 */
export function getSidecarState(): SidecarState | null {
    return sidecar ? sidecar.getState() : null;
}

/**
 * サイドカー稼働状態の確認
 *
 * サイドカーが現在稼働中かどうかを確認します。
 * サイドカーが初期化されていない場合はfalseを返します。
 *
 * @returns boolean サイドカーが稼働中の場合はtrue、そうでなければfalse
 *
 * @example
 * ```typescript
 * if (isSidecarRunning()) {
 *   console.log('サイドカーは稼働中です');
 * }
 * ```
 */
export function isSidecarRunning(): boolean {
    return sidecar ? sidecar.isRunning() : false;
}
