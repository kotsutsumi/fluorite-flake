/**
 * IPC サーバー / クライアントの基礎的なライフサイクルと補助機能を網羅的に検証するユニットテスト。
 * サーバーの起動・停止状態、メソッド登録とトークン生成、通知ブロードキャスト、クライアント初期化など
 * CLI 内部で利用する IPC インフラが仕様どおり動作し続けるかを確認することを目的としている。
 */
import { afterEach, describe, expect, it } from 'vitest';
import { createIPCClient } from '../../../src/ipc/ipc-client.js';
import { createIPCServer } from '../../../src/ipc/ipc-server.js';

describe('IPC Basic Functionality', () => {
    let server: ReturnType<typeof createIPCServer> | undefined;
    let client: ReturnType<typeof createIPCClient> | undefined;

    /**
     * 各テストが終了したら、クライアント切断とサーバー停止を確実に行い状態汚染を防ぐ。
     * `getInfo().isRunning` で起動中か判定し、安全に stop を呼び出す。
     */
    afterEach(async () => {
        if (client?.isConnected()) {
            client.disconnect();
        }
        if (server?.getInfo().isRunning) {
            await server.stop();
        }
    });

    /**
     * createIPCServer / createIPCClient が最低限の API を備えたインスタンスを返すことを確認する。
     * 具体的には `getInfo`, `connect` などの主要メソッドの有無を検査する。
     */
    it('should create server and client instances', () => {
        server = createIPCServer();
        expect(server).toBeDefined();
        expect(server.getInfo).toBeDefined();

        client = createIPCClient({ port: 9123 });
        expect(client).toBeDefined();
        expect(client.connect).toBeDefined();
    });

    /**
     * サーバーの start → stop フローが `isRunning` フラグに反映されることを検証する。
     * `port: 0` でポート自動割当を行い、副作用なく起動可能なことも確認する。
     */
    it('should start and stop server', async () => {
        server = createIPCServer({ port: 0 });

        await server.start();
        const info = server.getInfo();
        expect(info.isRunning).toBe(true);

        await server.stop();
        expect(server.getInfo().isRunning).toBe(false);
    });

    /**
     * `registerMethod` により任意のメソッド ID が内部レジストリへ追加されるかを確認する。
     * テストでは単純な非同期ハンドラを登録し、methods マップにキーが存在することを検証する。
     */
    it('should register and list methods', () => {
        server = createIPCServer();

        const testMethod = async () => ({ result: 'test' });
        server.registerMethod('test.method', testMethod);

        // プライベート相当のコレクションに直接アクセスし、登録済みかどうかを確認する
        // @ts-expect-error - テスト目的で private 相当のプロパティへアクセス
        expect(server.methods.has('test.method')).toBe(true);
    });

    /**
     * サーバー生成時に認証トークンが自動生成され、空文字列でないことを保証する。
     * セキュリティ上トークンは必須であるため、存在チェックと長さチェックを行う。
     */
    it('should generate authentication token', () => {
        server = createIPCServer();
        const info = server.getInfo();

        expect(info.token).toBeDefined();
        expect(info.token.length).toBeGreaterThan(0);
    });

    /**
     * `broadcast` API が接続クライアント不在でも例外を投げず完了することを検証する。
     * 実際の通知内容は検証しないが、通知処理がサーバーの状態を壊さないことが目的。
     */
    it('should support broadcasting', async () => {
        server = createIPCServer({ port: 0 });
        await server.start();

        expect(() => {
            server.broadcast('test.notification', { data: 'test' });
        }).not.toThrow();

        await server.stop();
    });

    /**
     * `getInfo` が起動前・起動後で適切に情報を返すか検証する。
     * 起動前は `isRunning=false` / `clients=0` であり、起動後は `address` が設定されることを確認する。
     */
    it('should handle server info correctly', async () => {
        server = createIPCServer({ port: 0 });

        let info = server.getInfo();
        expect(info.isRunning).toBe(false);
        expect(info.clients).toBe(0);

        await server.start();

        info = server.getInfo();
        expect(info.isRunning).toBe(true);
        expect(info.address).toBeDefined();

        await server.stop();
    });

    /**
     * クライアント生成時に各種オプションが受け入れられ、接続前は `isConnected=false` かつ
     * 認証未完了状態であることを確認する。接続トークン指定などオプション受け取りの基本動作を担保する。
     */
    it('should handle client creation with options', () => {
        const options = {
            port: 9999,
            host: 'localhost',
            authToken: 'test-token',
            reconnect: true,
            timeout: 5000,
        };

        client = createIPCClient(options);
        expect(client).toBeDefined();
        expect(client.isConnected()).toBe(false);
        expect(client.isAuthenticated()).toBe(false);
    });
});
