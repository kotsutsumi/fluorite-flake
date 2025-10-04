/**
 * Cloudflare Wrangler ダッシュボード周りのユーティリティが CLI 連携を正しく扱えるかを検証するユニットテスト。
 * Wrangler の存在確認や認証状態、リソース一覧取得、デプロイ操作など多様なコマンド呼び出しをモックし、
 * CLI からの各種操作結果が期待どおりに解析・整形されるかを網羅的にチェックする。
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { execa } from 'execa';
import {
    WranglerDashboard,
    createWranglerDashboard,
    formatDashboardData,
    type WranglerDashboardData,
} from '../../../src/utils/wrangler-dashboard.js';

vi.mock('execa');

// WranglerDashboard クラス単体のメソッド検証をまとめたスイート
describe('WranglerDashboard', () => {
    let dashboard: WranglerDashboard;
    const mockExeca = vi.mocked(execa);

    beforeEach(() => {
        dashboard = new WranglerDashboard();
        vi.clearAllMocks();
    });

    // wrangler コマンドの存在を判定する isAvailable の挙動を確認する
    describe('isAvailable', () => {
        // Wrangler がインストール済みの場合に true を返し、--version が呼ばれることを検証する
        it('should return true when wrangler is available', async () => {
            mockExeca.mockResolvedValue({
                stdout: '⛅️ wrangler 3.0.0',
                stderr: '',
            } as unknown as Awaited<ReturnType<typeof execa>>);

            const result = await dashboard.isAvailable();
            expect(result).toBe(true);
            expect(mockExeca).toHaveBeenCalledWith('wrangler', ['--version']);
        });

        // コマンドが失敗した場合に false を返すことを確認し、エラー時のフォールバックを検証する
        it('should return false when wrangler is not available', async () => {
            mockExeca.mockRejectedValue(new Error('Command not found'));

            const result = await dashboard.isAvailable();
            expect(result).toBe(false);
        });
    });

    // getVersion が実際のバージョン文字列を返すか、失敗時に null を返すかを検証する
    describe('getVersion', () => {
        // 正常系で stdout のバージョン文字列が返却されることを確認する
        it('should return version string when available', async () => {
            mockExeca.mockResolvedValue({
                stdout: '⛅️ wrangler 3.0.0',
                stderr: '',
            } as unknown as Awaited<ReturnType<typeof execa>>);

            const result = await dashboard.getVersion();
            expect(result).toBe('⛅️ wrangler 3.0.0');
        });

        // コマンドが失敗した場合に null が返ることを検証する
        it('should return null when command fails', async () => {
            mockExeca.mockRejectedValue(new Error('Command failed'));

            const result = await dashboard.getVersion();
            expect(result).toBeNull();
        });
    });

    // isAuthenticated がログイン状態を判定できるかをテストする
    describe('isAuthenticated', () => {
        // 認証済みメッセージを解析して true を返すことを確認する
        it('should return true when authenticated', async () => {
            mockExeca.mockResolvedValue({
                stdout: 'You are logged in as: user@example.com',
                stderr: '',
            } as unknown as Awaited<ReturnType<typeof execa>>);

            const result = await dashboard.isAuthenticated();
            expect(result).toBe(true);
        });

        // 未認証メッセージでは false を返すことを検証する
        it('should return false when not authenticated', async () => {
            mockExeca.mockResolvedValue({
                stdout: 'You are not authenticated',
                stderr: '',
            } as unknown as Awaited<ReturnType<typeof execa>>);

            const result = await dashboard.isAuthenticated();
            expect(result).toBe(false);
        });
    });

    // whoami がメールアドレスとアカウント ID を抽出できるか確認する
    describe('whoami', () => {
        // 正常系でメールとアカウント ID をパースできることを検証する
        it('should parse email and account ID from output', async () => {
            mockExeca.mockResolvedValue({
                stdout: 'You are logged in as: user@example.com\nAccount ID: 123456',
                stderr: '',
            } as unknown as Awaited<ReturnType<typeof execa>>);

            const result = await dashboard.whoami();
            expect(result).toEqual({
                email: 'user@example.com',
                accountId: '123456',
            });
        });

        // 失敗時に null を返すことを確認する
        it('should return null on error', async () => {
            mockExeca.mockRejectedValue(new Error('Not authenticated'));

            const result = await dashboard.whoami();
            expect(result).toBeNull();
        });
    });

    // R2 バケット一覧取得の解析ロジックを検証する
    describe('listR2Buckets', () => {
        // テーブル形式の出力からバケット情報を配列化できることを確認する
        it('should parse bucket list from output', async () => {
            mockExeca.mockResolvedValue({
                stdout: `Name           Created        Location
----           -------        --------
my-bucket      2024-01-01     us-east-1
test-bucket    2024-01-02     eu-west-1`,
                stderr: '',
            } as unknown as Awaited<ReturnType<typeof execa>>);

            const result = await dashboard.listR2Buckets();
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                name: 'my-bucket',
                created_on: '2024-01-01',
                location: 'us-east-1',
            });
            expect(result[1]).toEqual({
                name: 'test-bucket',
                created_on: '2024-01-02',
                location: 'eu-west-1',
            });
        });

        // エラー時に空配列を返すフォールバックを検証する
        it('should return empty array on error', async () => {
            mockExeca.mockRejectedValue(new Error('R2 not available'));

            const result = await dashboard.listR2Buckets();
            expect(result).toEqual([]);
        });
    });

    // KV Namespace 一覧の取得と解析ロジックを検証する
    describe('listKVNamespaces', () => {
        // JSON 出力をパースして配列に変換できることを確認する
        it('should parse KV namespace list from JSON output', async () => {
            mockExeca.mockResolvedValue({
                stdout: JSON.stringify([
                    { id: 'abc123', title: 'my-namespace', supports_url_encoding: true },
                    { id: 'def456', title: 'test-namespace' },
                ]),
                stderr: '',
            } as unknown as Awaited<ReturnType<typeof execa>>);

            const result = await dashboard.listKVNamespaces();
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                id: 'abc123',
                title: 'my-namespace',
                supports_url_encoding: true,
            });
        });

        // テキスト形式出力でもパースできることを検証する
        it('should parse KV namespace list from text output', async () => {
            mockExeca.mockResolvedValue({
                stdout: `abc123: my-namespace
def456: test-namespace`,
                stderr: '',
            } as unknown as Awaited<ReturnType<typeof execa>>);

            const result = await dashboard.listKVNamespaces();
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                id: 'abc123',
                title: 'my-namespace',
            });
        });

        // エラー時に空配列が返ることを確認する
        it('should return empty array on error', async () => {
            mockExeca.mockRejectedValue(new Error('KV not available'));

            const result = await dashboard.listKVNamespaces();
            expect(result).toEqual([]);
        });
    });

    // Workers デプロイの挙動を検証する
    describe('deployWorker', () => {
        // デフォルトで dry-run デプロイを行い、成功レスポンスを整形することを確認する
        it('should deploy with dry run by default', async () => {
            mockExeca.mockResolvedValue({
                stdout: 'Deployment successful (dry run)',
                stderr: '',
            } as unknown as Awaited<ReturnType<typeof execa>>);

            const result = await dashboard.deployWorker({ name: 'my-worker' });
            expect(result).toEqual({
                success: true,
                message: 'Deployment successful (dry run)',
            });
            expect(mockExeca).toHaveBeenCalledWith('wrangler', [
                'deploy',
                '--dry-run',
                '--name',
                'my-worker',
            ]);
        });

        // デプロイでエラーが発生した際のエラーメッセージ整形を検証する
        it('should handle deployment errors', async () => {
            mockExeca.mockRejectedValue({
                stderr: 'Deployment failed',
                message: 'Command failed',
            });

            const result = await dashboard.deployWorker();
            expect(result).toEqual({
                success: false,
                message: 'Deployment failed',
            });
        });
    });

    // R2 バケット作成の成否を確認する
    describe('createR2Bucket', () => {
        // バケット作成成功時のレスポンス整形を検証する
        it('should create bucket successfully', async () => {
            mockExeca.mockResolvedValue({
                stdout: 'Bucket created successfully',
                stderr: '',
            } as unknown as Awaited<ReturnType<typeof execa>>);

            const result = await dashboard.createR2Bucket('new-bucket');
            expect(result).toEqual({
                success: true,
                message: 'Bucket created successfully',
            });
            expect(mockExeca).toHaveBeenCalledWith('wrangler', [
                'r2',
                'bucket',
                'create',
                'new-bucket',
            ]);
        });

        // 作成失敗時にエラーメッセージを保持して返すことを確認する
        it('should handle creation errors', async () => {
            mockExeca.mockRejectedValue({
                stderr: 'Bucket already exists',
                message: 'Command failed',
            });

            const result = await dashboard.createR2Bucket('existing-bucket');
            expect(result).toEqual({
                success: false,
                message: 'Bucket already exists',
            });
        });
    });

    // KV Namespace 作成時に ID 抽出ができるか検証する
    describe('createKVNamespace', () => {
        // 作成結果の文字列から namespace ID を抜き出す処理を確認する
        it('should create namespace and extract ID', async () => {
            mockExeca.mockResolvedValue({
                stdout: 'Created namespace with id = "xyz789"',
                stderr: '',
            } as unknown as Awaited<ReturnType<typeof execa>>);

            const result = await dashboard.createKVNamespace('new-namespace');
            expect(result).toEqual({
                success: true,
                message: 'Created namespace with id = "xyz789"',
                id: 'xyz789',
            });
        });
    });

    // getDashboardData が複数の CLI 呼び出し結果を集約できるか検証する
    describe('getDashboardData', () => {
        // Workers/R2/KV の情報をまとめて取得し、欠損時は空配列となることを確認する
        it('should aggregate all dashboard data', async () => {
            // ワーカーをモック化
            mockExeca.mockImplementation((_cmd, args) => {
                if (args?.includes('--dry-run')) {
                    return Promise.resolve({
                        stdout: 'Worker: my-worker',
                        stderr: '',
                    } as unknown as Awaited<ReturnType<typeof execa>>);
                }
                if (args?.[0] === 'r2' && args?.[1] === 'bucket') {
                    return Promise.resolve({
                        stdout: 'Name\n----\nmy-bucket',
                        stderr: '',
                    } as unknown as Awaited<ReturnType<typeof execa>>);
                }
                if (args?.[0] === 'kv:namespace') {
                    return Promise.resolve({
                        stdout: 'abc123: my-namespace',
                        stderr: '',
                    } as unknown as Awaited<ReturnType<typeof execa>>);
                }
                return Promise.reject(new Error('Unknown command'));
            });

            const result = await dashboard.getDashboardData();
            expect(result.workers).toHaveLength(1);
            expect(result.r2Buckets).toHaveLength(1);
            expect(result.kvNamespaces).toHaveLength(1);
            expect(result.durableObjects).toEqual([]);
            expect(result.deployments).toEqual([]);
        });
    });
});

// WranglerDashboard のファクトリ関数とデータ整形ヘルパーを検証するスイート
describe('createWranglerDashboard', () => {
    // デフォルト設定で WranglerDashboard インスタンスが生成されることを確認する
    it('should create a WranglerDashboard instance', () => {
        const dashboard = createWranglerDashboard();
        expect(dashboard).toBeInstanceOf(WranglerDashboard);
    });

    // カスタムパスを指定した場合でもインスタンス化できることを検証する
    it('should accept custom wrangler path', () => {
        const dashboard = createWranglerDashboard('/custom/path/wrangler');
        expect(dashboard).toBeInstanceOf(WranglerDashboard);
    });
});

// ダッシュボード統合データのフォーマット関数を検証するスイート
describe('formatDashboardData', () => {
    // 各リソースを絵文字付きの可読な文字列へ整形できることを確認する
    it('should format dashboard data as readable string', () => {
        const data: WranglerDashboardData = {
            workers: [{ name: 'worker1', routes: ['example.com/*'] }, { name: 'worker2' }],
            r2Buckets: [{ name: 'bucket1', location: 'us-east-1' }],
            kvNamespaces: [{ id: 'abc123', title: 'namespace1' }],
            durableObjects: [],
            deployments: [],
            analytics: {
                requests: { success: 100, error: 5, total: 105 },
                bandwidth: { bytes: 1024000 },
                cpu_time: {
                    percentiles: { p50: 10, p75: 20, p99: 100 },
                },
            },
        };

        const result = formatDashboardData(data);
        expect(result).toContain('📦 Workers:');
        expect(result).toContain('worker1 (example.com/*)');
        expect(result).toContain('🪣 R2 Buckets:');
        expect(result).toContain('bucket1 (us-east-1)');
        expect(result).toContain('🗄️ KV Namespaces:');
        expect(result).toContain('namespace1 (abc123)');
        expect(result).toContain('📊 Analytics:');
        expect(result).toContain('105 (100 success, 5 error)');
    });

    // リソースが空の場合に空文字列を返すフォールバックを検証する
    it('should handle empty data', () => {
        const data: WranglerDashboardData = {
            workers: [],
            r2Buckets: [],
            kvNamespaces: [],
            durableObjects: [],
            deployments: [],
        };

        const result = formatDashboardData(data);
        expect(result).toBe('');
    });
});
