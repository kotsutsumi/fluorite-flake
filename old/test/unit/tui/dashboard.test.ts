/**
 * TUI Dashboard のユニットテスト
 *
 * blessed と blessed-contrib を使った TUI ダッシュボードコンポーネントのテスト。
 * 主にインスタンス化、メソッドの存在確認、IPC 接続のモックテストを行う。
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TUIDashboard } from '../../../src/tui/dashboard.js';

// blessed と blessed-contrib をモック化
vi.mock('blessed', () => ({
    default: {
        screen: vi.fn(() => ({
            render: vi.fn(),
            destroy: vi.fn(),
            key: vi.fn(),
            on: vi.fn(),
            address: vi.fn(),
        })),
        box: vi.fn(() => ({
            setContent: vi.fn(),
            destroy: vi.fn(),
            focus: vi.fn(),
            key: vi.fn(),
        })),
        log: vi.fn(() => ({
            log: vi.fn(),
        })),
    },
}));

vi.mock('blessed-contrib', () => ({
    default: {
        grid: vi.fn(() => ({
            set: vi.fn(() => ({
                setData: vi.fn(),
                setPercent: vi.fn(),
                log: vi.fn(),
            })),
        })),
        table: vi.fn(),
        line: vi.fn(),
        gauge: vi.fn(),
    },
}));

// IPC クライアントをモック化
vi.mock('../../../src/ipc/ipc-client.js', () => ({
    createIPCClient: vi.fn(() => ({
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn(),
        isConnected: vi.fn(() => true),
        call: vi.fn().mockResolvedValue({
            workers: [],
            r2Buckets: [],
            kvNamespaces: [],
            durableObjects: [],
            deployments: [],
            analytics: null,
        }),
        on: vi.fn(),
    })),
}));

describe('TUIDashboard', () => {
    let dashboard: TUIDashboard;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ダッシュボードのインスタンス化ができることを確認
    describe('constructor', () => {
        it('should create dashboard instance with default options', () => {
            dashboard = new TUIDashboard();
            expect(dashboard).toBeInstanceOf(TUIDashboard);
        });

        it('should accept custom options', () => {
            dashboard = new TUIDashboard({
                refreshInterval: 10000,
                ipcPort: 9999,
                ipcHost: 'localhost',
                theme: 'light',
            });
            expect(dashboard).toBeInstanceOf(TUIDashboard);
        });
    });

    // メソッドの存在確認
    describe('methods', () => {
        beforeEach(() => {
            dashboard = new TUIDashboard();
        });

        it('should have connect method', () => {
            expect(dashboard.connect).toBeDefined();
            expect(typeof dashboard.connect).toBe('function');
        });

        it('should have start method', () => {
            expect(dashboard.start).toBeDefined();
            expect(typeof dashboard.start).toBe('function');
        });

        it('should have stop method', () => {
            expect(dashboard.stop).toBeDefined();
            expect(typeof dashboard.stop).toBe('function');
        });
    });

    // IPC サーバーへの接続テスト
    describe('connect', () => {
        it('should connect to IPC server', async () => {
            dashboard = new TUIDashboard();
            await expect(dashboard.connect()).resolves.toBeUndefined();
        });
    });

    // ダッシュボードの起動テスト
    describe('start', () => {
        it('should start dashboard and connect to IPC', async () => {
            dashboard = new TUIDashboard();
            await expect(dashboard.start()).resolves.toBeUndefined();
        });
    });

    // ダッシュボードの停止テスト
    describe('stop', () => {
        it('should stop dashboard and cleanup resources', () => {
            dashboard = new TUIDashboard();
            expect(() => dashboard.stop()).not.toThrow();
        });
    });
});

// startTUIDashboard ヘルパー関数のテスト
describe('startTUIDashboard', () => {
    it('should create and start dashboard', async () => {
        const { startTUIDashboard } = await import('../../../src/tui/dashboard.js');
        const dashboard = await startTUIDashboard({
            refreshInterval: 5000,
        });
        expect(dashboard).toBeInstanceOf(TUIDashboard);
    });
});
