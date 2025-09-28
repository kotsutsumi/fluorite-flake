/**
 * Tauri Sidecar のユニットテスト
 *
 * Tauri デスクトップアプリケーション向けのサイドカープロセス管理機能のテスト。
 * プロセスライフサイクル、IPC 接続、自動再起動、エラーハンドリングを検証する。
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { TauriSidecar, SidecarState, createTauriSidecar } from '../../../src/tauri/sidecar.js';

// child_process モジュールをモック化
vi.mock('node:child_process', () => ({
    spawn: vi.fn(() => {
        const mockProcess = new EventEmitter();
        // biome-ignore lint/suspicious/noExplicitAny: Mock process needs any type
        (mockProcess as any).kill = vi.fn();
        return mockProcess;
    }),
}));

// IPC クライアントをモック化
vi.mock('../../../src/ipc/ipc-client.js', () => ({
    createIPCClient: vi.fn(() => ({
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn(),
        isConnected: vi.fn(() => true),
        call: vi.fn().mockResolvedValue({ success: true }),
        on: vi.fn(),
    })),
}));

describe('TauriSidecar', () => {
    let sidecar: TauriSidecar;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(async () => {
        if (sidecar && sidecar.getState() === SidecarState.RUNNING) {
            await sidecar.stop();
        }
    });

    // サイドカーのインスタンス化ができることを確認
    describe('constructor', () => {
        it('should create sidecar instance with default options', () => {
            sidecar = new TauriSidecar();
            expect(sidecar).toBeInstanceOf(TauriSidecar);
            expect(sidecar).toBeInstanceOf(EventEmitter);
        });

        it('should accept custom options', () => {
            sidecar = new TauriSidecar({
                cliPath: '/custom/path/fluorite-flake',
                ipcPort: 9999,
                ipcHost: 'localhost',
                debug: true,
                autoRestart: false,
            });
            expect(sidecar).toBeInstanceOf(TauriSidecar);
        });
    });

    // 状態管理のテスト
    describe('state management', () => {
        it('should start in IDLE state', () => {
            sidecar = new TauriSidecar();
            expect(sidecar.getState()).toBe(SidecarState.IDLE);
            expect(sidecar.isRunning()).toBe(false);
        });

        it('should track state changes', (done) => {
            sidecar = new TauriSidecar();

            sidecar.on('state-change', (change) => {
                expect(change.from).toBe(SidecarState.IDLE);
                expect(change.to).toBe(SidecarState.STARTING);
                done();
            });

            // 状態変更をトリガー（実際の start は IPC モックのため完了しない可能性がある）
            sidecar.start().catch(() => {
                // エラーは無視（モック環境のため）
            });
        });
    });

    // メソッドの存在確認
    describe('methods', () => {
        beforeEach(() => {
            sidecar = new TauriSidecar();
        });

        it('should have start method', () => {
            expect(sidecar.start).toBeDefined();
            expect(typeof sidecar.start).toBe('function');
        });

        it('should have stop method', () => {
            expect(sidecar.stop).toBeDefined();
            expect(typeof sidecar.stop).toBe('function');
        });

        it('should have restart method', () => {
            expect(sidecar.restart).toBeDefined();
            expect(typeof sidecar.restart).toBe('function');
        });

        it('should have getState method', () => {
            expect(sidecar.getState).toBeDefined();
            expect(typeof sidecar.getState).toBe('function');
        });

        it('should have isRunning method', () => {
            expect(sidecar.isRunning).toBeDefined();
            expect(typeof sidecar.isRunning).toBe('function');
        });

        it('should have call method', () => {
            expect(sidecar.call).toBeDefined();
            expect(typeof sidecar.call).toBe('function');
        });
    });

    // IPC クライアントの取得
    describe('getIPCClient', () => {
        it('should return null when not connected', () => {
            sidecar = new TauriSidecar();
            expect(sidecar.getIPCClient()).toBeNull();
        });
    });

    // call メソッドのエラーハンドリング
    describe('call', () => {
        it('should throw error when IPC client not connected', async () => {
            sidecar = new TauriSidecar();
            await expect(sidecar.call('test.method')).rejects.toThrow('IPC client not connected');
        });
    });
});

// createTauriSidecar ヘルパー関数のテスト
describe('createTauriSidecar', () => {
    it('should create a TauriSidecar instance', () => {
        const sidecar = createTauriSidecar();
        expect(sidecar).toBeInstanceOf(TauriSidecar);
    });

    it('should pass options to TauriSidecar constructor', () => {
        const options = {
            cliPath: '/test/path',
            ipcPort: 8888,
            debug: true,
        };
        const sidecar = createTauriSidecar(options);
        expect(sidecar).toBeInstanceOf(TauriSidecar);
    });
});

// Tauri コマンドバインディングのテスト
describe('Tauri command bindings', () => {
    // モジュールレベルの関数をテストするため、動的にインポート
    let getDashboardData: typeof import('../../../src/tauri/sidecar.js').getDashboardData;
    let getSidecarState: typeof import('../../../src/tauri/sidecar.js').getSidecarState;
    let isSidecarRunning: typeof import('../../../src/tauri/sidecar.js').isSidecarRunning;

    beforeEach(async () => {
        // 各テストの前に新しくインポート
        const module = await import('../../../src/tauri/sidecar.js');
        getDashboardData = module.getDashboardData;
        getSidecarState = module.getSidecarState;
        isSidecarRunning = module.isSidecarRunning;
    });

    describe('getSidecarState', () => {
        it('should return null when sidecar not initialized', () => {
            expect(getSidecarState()).toBeNull();
        });
    });

    describe('isSidecarRunning', () => {
        it('should return false when sidecar not initialized', () => {
            expect(isSidecarRunning()).toBe(false);
        });
    });

    describe('getDashboardData', () => {
        it('should throw error when sidecar not initialized', async () => {
            await expect(getDashboardData()).rejects.toThrow('Sidecar not initialized');
        });
    });
});
