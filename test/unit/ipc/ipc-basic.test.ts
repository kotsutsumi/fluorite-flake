/**
 * IPC サーバー / クライアントの基本的なライフサイクルとユーティリティ機能を検証するユニットテスト。
 * サーバーの起動停止・メソッド登録・トークン生成・ブロードキャスト実行・クライアント初期化など
 * CLI 内の IPC インフラが期待どおり動作するかを網羅的に確認する。
 */
import { describe, expect, it, afterEach } from 'vitest';
import { createIPCServer } from '../../../src/ipc/ipc-server.js';
import { createIPCClient } from '../../../src/ipc/ipc-client.js';

describe('IPC Basic Functionality', () => {
    let server: ReturnType<typeof createIPCServer> | undefined;
    let client: ReturnType<typeof createIPCClient> | undefined;

    // 各テスト後にクライアント切断とサーバー停止を実施し、副作用を残さない
    afterEach(async () => {
        if (client?.isConnected()) {
            client.disconnect();
        }
        if (server?.getInfo().isRunning) {
            await server.stop();
        }
    });

    // サーバー・クライアントのインスタンス生成が成功し、主要メソッドが存在することを確認する
    it('should create server and client instances', () => {
        server = createIPCServer();
        expect(server).toBeDefined();
        expect(server.getInfo).toBeDefined();

        client = createIPCClient({ port: 9123 });
        expect(client).toBeDefined();
        expect(client.connect).toBeDefined();
    });

    // サーバーを起動してランタイム情報の変化を確認し、停止後に isRunning が false に戻ることを検証する
    it('should start and stop server', async () => {
        server = createIPCServer({ port: 0 });

        await server.start();
        const info = server.getInfo();
        expect(info.isRunning).toBe(true);

        await server.stop();
        expect(server.getInfo().isRunning).toBe(false);
    });

    // メソッド登録 API が指定キーでハンドラを保持することを確認する
    it('should register and list methods', () => {
        server = createIPCServer();

        const testMethod = async () => ({ result: 'test' });
        server.registerMethod('test.method', testMethod);

        // メソッド登録が内部マップに反映されていることを検証する
        // @ts-expect-error - テスト目的で private 相当のプロパティへアクセス
        expect(server.methods.has('test.method')).toBe(true);
    });

    // 認証用トークンが自動生成され、空文字ではないことを保証する
    it('should generate authentication token', () => {
        server = createIPCServer();
        const info = server.getInfo();

        expect(info.token).toBeDefined();
        expect(info.token.length).toBeGreaterThan(0);
    });

    // ブロードキャスト API を呼び出した際に例外を投げず実行できることを確認する
    it('should support broadcasting', async () => {
        server = createIPCServer({ port: 0 });
        await server.start();

        // ブロードキャスト呼び出しが例外なく実行されることを検証
        expect(() => {
            server.broadcast('test.notification', { data: 'test' });
        }).not.toThrow();

        await server.stop();
    });

    // サーバー情報オブジェクトが起動前後で正しい状態値を返すことを確認する
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

    // クライアント生成時に指定オプションが反映され、接続前は未接続かつ未認証であることを検証する
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
