import { describe, expect, it, afterEach } from 'vitest';
import { createIPCServer } from '../../../src/ipc/ipc-server.js';
import { createIPCClient } from '../../../src/ipc/ipc-client.js';

describe('IPC Basic Functionality', () => {
    let server: ReturnType<typeof createIPCServer> | undefined;
    let client: ReturnType<typeof createIPCClient> | undefined;

    afterEach(async () => {
        if (client?.isConnected()) {
            client.disconnect();
        }
        if (server?.getInfo().isRunning) {
            await server.stop();
        }
    });

    it('should create server and client instances', () => {
        server = createIPCServer();
        expect(server).toBeDefined();
        expect(server.getInfo).toBeDefined();

        client = createIPCClient({ port: 9123 });
        expect(client).toBeDefined();
        expect(client.connect).toBeDefined();
    });

    it('should start and stop server', async () => {
        server = createIPCServer({ port: 0 });

        await server.start();
        const info = server.getInfo();
        expect(info.isRunning).toBe(true);

        await server.stop();
        expect(server.getInfo().isRunning).toBe(false);
    });

    it('should register and list methods', () => {
        server = createIPCServer();

        const testMethod = async () => ({ result: 'test' });
        server.registerMethod('test.method', testMethod);

        // Verify method was registered
        // @ts-expect-error - accessing private property for testing
        expect(server.methods.has('test.method')).toBe(true);
    });

    it('should generate authentication token', () => {
        server = createIPCServer();
        const info = server.getInfo();

        expect(info.token).toBeDefined();
        expect(info.token.length).toBeGreaterThan(0);
    });

    it('should support broadcasting', async () => {
        server = createIPCServer({ port: 0 });
        await server.start();

        // Test broadcast doesn't throw
        expect(() => {
            server.broadcast('test.notification', { data: 'test' });
        }).not.toThrow();

        await server.stop();
    });

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
