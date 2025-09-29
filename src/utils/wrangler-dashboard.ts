/**
 * Wranglerダッシュボード統合
 *
 * コンパイル問題を引き起こす外部依存関係を使用しない
 * Cloudflare WorkersとR2ストレージの最小限のダッシュボード機能
 */

import { execa } from 'execa';
import type { ExecaError } from 'execa';

/**
 * Wranglerダッシュボードのデータ型定義
 */
/**
 * Cloudflare Workerの情報を表すインターフェース
 */
export interface WranglerWorker {
    /** Worker名 */
    name: string;
    /** Worker ID */
    id?: string;
    /** 作成日時 */
    created_on?: string;
    /** 更新日時 */
    modified_on?: string;
    /** ETagハッシュ */
    etag?: string;
    /** ルート情報 */
    routes?: string[];
    /** 使用モデル（バンドルまたはアンバウンド） */
    usage_model?: 'bundled' | 'unbound';
}

/**
 * Cloudflare R2バケットの情報を表すインターフェース
 */
export interface WranglerR2Bucket {
    /** バケット名 */
    name: string;
    /** 作成日時 */
    created_on?: string;
    /** ロケーション */
    location?: string;
}

/**
 * Cloudflare KVネームスペースの情報を表すインターフェース
 */
export interface WranglerKVNamespace {
    /** ネームスペースID */
    id: string;
    /** ネームスペースタイトル */
    title: string;
    /** URLエンコーディングサポート */
    supports_url_encoding?: boolean;
}

/**
 * Cloudflare Durable Objectの情報を表すインターフェース
 */
export interface WranglerDurableObject {
    /** Durable Object名 */
    name: string;
    /** クラス名 */
    class_name: string;
    /** スクリプト名 */
    script_name?: string;
}

/**
 * Cloudflare Workerのデプロイメント情報を表すインターフェース
 */
export interface WranglerDeployment {
    /** デプロイメントID */
    id: string;
    /** 作成日時 */
    created_on: string;
    /** 作成者 */
    author: string;
    /** デプロイメントソース */
    source: 'upload' | 'wrangler';
    /** デプロイメント戦略 */
    strategy: 'percentage' | 'weight';
    /** バージョン情報 */
    versions: Array<{
        /** バージョンID */
        version_id: string;
        /** トラフィックの割合 */
        percentage: number;
    }>;
}

/**
 * Workerのアナリティクス情報を表すインターフェース
 */
export interface WranglerAnalytics {
    /** リクエスト統計 */
    requests: {
        /** 成功リクエスト数 */
        success: number;
        /** エラーリクエスト数 */
        error: number;
        /** 総リクエスト数 */
        total: number;
    };
    /** 帯域幅統計 */
    bandwidth: {
        /** 使用バイト数 */
        bytes: number;
    };
    /** CPU時間統計 */
    cpu_time: {
        /** パーセンタイル値 */
        percentiles: {
            /** 50%タイル */
            p50: number;
            /** 75%タイル */
            p75: number;
            /** 99%タイル */
            p99: number;
        };
    };
}

/**
 * ダッシュボードの全データをまとめたインターフェース
 */
export interface WranglerDashboardData {
    /** Worker一覧 */
    workers: WranglerWorker[];
    /** R2バケット一覧 */
    r2Buckets: WranglerR2Bucket[];
    /** KVネームスペース一覧 */
    kvNamespaces: WranglerKVNamespace[];
    /** Durable Object一覧 */
    durableObjects: WranglerDurableObject[];
    /** デプロイメント一覧 */
    deployments: WranglerDeployment[];
    /** アナリティクス情報（オプション） */
    analytics?: WranglerAnalytics;
}

/**
 * ダッシュボード操作のためのWrangler CLIラッパークラス
 */
export class WranglerDashboard {
    /** Wrangler CLIのパス */
    private wranglerPath: string;

    /**
     * WranglerDashboardインスタンスを作成します
     * @param wranglerPath Wrangler CLIのパス（デフォルト: 'wrangler'）
     */
    constructor(wranglerPath = 'wrangler') {
        this.wranglerPath = wranglerPath;
    }

    /**
     * Wrangler CLIが利用可能かどうかをチェックします
     * @returns CLIが利用可能な場合はtrue
     */
    async isAvailable(): Promise<boolean> {
        try {
            await execa(this.wranglerPath, ['--version']);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Wranglerのバージョンを取得します
     * @returns バージョン文字列、取得できない場合はnull
     */
    async getVersion(): Promise<string | null> {
        try {
            const { stdout } = await execa(this.wranglerPath, ['--version']);
            return stdout.trim();
        } catch {
            return null;
        }
    }

    /**
     * 認証状態をチェックします
     * @returns 認証済みの場合はtrue
     */
    async isAuthenticated(): Promise<boolean> {
        try {
            const { stdout } = await execa(this.wranglerPath, ['whoami']);
            return !stdout.includes('You are not authenticated');
        } catch {
            return false;
        }
    }

    /**
     * 現在のユーザー情報を取得します
     * @returns ユーザー情報、取得できない場合はnull
     */
    async whoami(): Promise<{ email?: string; accountId?: string } | null> {
        try {
            const { stdout } = await execa(this.wranglerPath, ['whoami']);
            // 「You are logged in as: user@example.com」のような出力からメールをパース
            const emailMatch = stdout.match(/logged in as:\s*(.+?)(?:\s|\n|$)/);
            const accountMatch = stdout.match(/Account ID:\s*(.+?)(?:\s|\n|$)/);

            return {
                email: emailMatch?.[1]?.trim(),
                accountId: accountMatch?.[1]?.trim(),
            };
        } catch {
            return null;
        }
    }

    /**
     * 全てのWorkerを一覧取得します
     * @returns Workerの配列
     */
    async listWorkers(): Promise<WranglerWorker[]> {
        try {
            const { stdout } = await execa(this.wranglerPath, ['deploy', '--dry-run', '--json']);
            const data = JSON.parse(stdout);

            // 出力を我々のフォーマットに変換
            if (Array.isArray(data)) {
                return data.map((worker: unknown) => {
                    const w = worker as Record<string, unknown>;
                    return {
                        name: (w.name || w.script_name) as string,
                        id: w.id as string | undefined,
                        created_on: w.created_on as string | undefined,
                        modified_on: w.modified_on as string | undefined,
                        etag: w.etag as string | undefined,
                        routes: w.routes as string[] | undefined,
                        usage_model: w.usage_model as 'bundled' | 'unbound' | undefined,
                    };
                });
            }
            return [];
        } catch {
            // フォールバック: JSON以外の出力からパースを試みる
            try {
                const { stdout } = await execa(this.wranglerPath, ['deploy', '--dry-run']);
                // 出力からWorker名の基本的なパース
                const matches = stdout.matchAll(/Worker:\s*(.+)/g);
                return Array.from(matches).map((match) => ({ name: match[1] }));
            } catch {
                return [];
            }
        }
    }

    /**
     * R2バケットを一覧取得します
     * @returns R2バケットの配列
     */
    async listR2Buckets(): Promise<WranglerR2Bucket[]> {
        try {
            const { stdout } = await execa(this.wranglerPath, ['r2', 'bucket', 'list']);

            // 出力からバケット名をパース
            const lines = stdout.split('\n').filter((line) => line.trim());
            const buckets: WranglerR2Bucket[] = [];

            for (const line of lines) {
                // ヘッダーと空行をスキップ
                if (line.includes('Name') || line.includes('---') || !line.trim()) {
                    continue;
                }

                // バケット名（第1カラム）を抽出
                const parts = line.trim().split(/\s+/);
                if (parts[0]) {
                    buckets.push({
                        name: parts[0],
                        created_on: parts[1],
                        location: parts[2],
                    });
                }
            }

            return buckets;
        } catch (_error) {
            // R2が利用できないか、ユーザーがバケットを持っていない場合
            return [];
        }
    }

    /**
     * KVネームスペースを一覧取得します
     * @returns KVネームスペースの配列
     */
    async listKVNamespaces(): Promise<WranglerKVNamespace[]> {
        try {
            const { stdout } = await execa(this.wranglerPath, ['kv:namespace', 'list']);

            // 最初にJSON出力のパースを試みる
            try {
                const data = JSON.parse(stdout);
                if (Array.isArray(data)) {
                    return data.map((ns: unknown) => {
                        const namespace = ns as Record<string, unknown>;
                        return {
                            id: namespace.id as string,
                            title: (namespace.title || namespace.name) as string,
                            supports_url_encoding: namespace.supports_url_encoding as
                                | boolean
                                | undefined,
                        };
                    });
                }
            } catch {
                // テキスト出力のパースにフォールバック
                const lines = stdout.split('\n').filter((line) => line.trim());
                const namespaces: WranglerKVNamespace[] = [];

                for (const line of lines) {
                    // 「namespace_id: namespace_title」のような行をパース
                    const match = line.match(/(\w+):\s*(.+)/);
                    if (match) {
                        namespaces.push({
                            id: match[1],
                            title: match[2],
                        });
                    }
                }

                return namespaces;
            }

            return [];
        } catch {
            return [];
        }
    }

    /**
     * Workerのアナリティクスを取得します（有料プランが必要）
     * @param workerName Worker名
     * @param date 日付（オプション）
     * @returns アナリティクス情報、取得できない場合はnull
     */
    async getAnalytics(workerName: string, date?: string): Promise<WranglerAnalytics | null> {
        try {
            const args = ['analytics', workerName];
            if (date) {
                args.push('--date', date);
            }

            const { stdout } = await execa(this.wranglerPath, args);

            // 出力からアナリティクスをパース
            const requestsMatch = stdout.match(/Requests:\s*(\d+)\s*success,\s*(\d+)\s*error/);
            const bandwidthMatch = stdout.match(/Bandwidth:\s*(\d+)\s*bytes/);
            const cpuMatch = stdout.match(/CPU Time.*p50:\s*(\d+).*p75:\s*(\d+).*p99:\s*(\d+)/);

            if (requestsMatch) {
                return {
                    requests: {
                        success: Number.parseInt(requestsMatch[1], 10),
                        error: Number.parseInt(requestsMatch[2], 10),
                        total:
                            Number.parseInt(requestsMatch[1], 10) +
                            Number.parseInt(requestsMatch[2], 10),
                    },
                    bandwidth: {
                        bytes: bandwidthMatch ? Number.parseInt(bandwidthMatch[1], 10) : 0,
                    },
                    cpu_time: {
                        percentiles: {
                            p50: cpuMatch ? Number.parseInt(cpuMatch[1], 10) : 0,
                            p75: cpuMatch ? Number.parseInt(cpuMatch[2], 10) : 0,
                            p99: cpuMatch ? Number.parseInt(cpuMatch[3], 10) : 0,
                        },
                    },
                };
            }

            return null;
        } catch {
            return null;
        }
    }

    /**
     * 総合的なダッシュボードデータを取得します
     * @returns ダッシュボードの全データ
     */
    async getDashboardData(): Promise<WranglerDashboardData> {
        // 各サービスのデータを並行で取得
        const [workers, r2Buckets, kvNamespaces] = await Promise.all([
            this.listWorkers(),
            this.listR2Buckets(),
            this.listKVNamespaces(),
        ]);

        return {
            workers,
            r2Buckets,
            kvNamespaces,
            durableObjects: [], // wrangler.tomlのパースが必要
            deployments: [], // 追加のAPIコールが必要
        };
    }

    /**
     * Workerをデプロイします（安全のためデフォルトでドライラン）
     * @param options デプロイオプション
     * @param options.name Worker名
     * @param options.dryRun ドライランモード
     * @param options.env 環境名
     * @returns デプロイ結果
     */
    async deployWorker(
        options: {
            name?: string;
            dryRun?: boolean;
            env?: string;
        } = {}
    ): Promise<{ success: boolean; message: string }> {
        try {
            const args = ['deploy'];

            if (options.dryRun !== false) {
                args.push('--dry-run');
            }

            if (options.name) {
                args.push('--name', options.name);
            }

            if (options.env) {
                args.push('--env', options.env);
            }

            const { stdout } = await execa(this.wranglerPath, args);

            return {
                success: true,
                message: stdout,
            };
        } catch (error) {
            const execaError = error as ExecaError;
            const stderr = typeof execaError.stderr === 'string' ? execaError.stderr : '';
            return {
                success: false,
                message: stderr || execaError.message,
            };
        }
    }

    /**
     * R2バケットを作成します
     */
    async createR2Bucket(bucketName: string): Promise<{ success: boolean; message: string }> {
        try {
            const { stdout } = await execa(this.wranglerPath, [
                'r2',
                'bucket',
                'create',
                bucketName,
            ]);

            return {
                success: true,
                message: stdout,
            };
        } catch (error) {
            const execaError = error as ExecaError;
            const stderr = typeof execaError.stderr === 'string' ? execaError.stderr : '';
            return {
                success: false,
                message: stderr || execaError.message,
            };
        }
    }

    /**
     * R2バケットを削除します
     */
    async deleteR2Bucket(bucketName: string): Promise<{ success: boolean; message: string }> {
        try {
            const { stdout } = await execa(this.wranglerPath, [
                'r2',
                'bucket',
                'delete',
                bucketName,
            ]);

            return {
                success: true,
                message: stdout,
            };
        } catch (error) {
            const execaError = error as ExecaError;
            const stderr = typeof execaError.stderr === 'string' ? execaError.stderr : '';
            return {
                success: false,
                message: stderr || execaError.message,
            };
        }
    }

    /**
     * KVネームスペースを作成します
     */
    async createKVNamespace(
        title: string
    ): Promise<{ success: boolean; message: string; id?: string }> {
        try {
            const { stdout } = await execa(this.wranglerPath, ['kv:namespace', 'create', title]);

            // 出力からネームスペースIDを抽出
            const idMatch = stdout.match(/id\s*=\s*"([^"]+)"/);

            return {
                success: true,
                message: stdout,
                id: idMatch?.[1],
            };
        } catch (error) {
            const execaError = error as ExecaError;
            const stderr = typeof execaError.stderr === 'string' ? execaError.stderr : '';
            return {
                success: false,
                message: stderr || execaError.message,
            };
        }
    }

    /**
     * Workerログをテールします
     */
    async tailLogs(
        workerName?: string,
        options: {
            format?: 'json' | 'pretty';
            status?: 'ok' | 'error';
            method?: string;
            search?: string;
        } = {}
    ): Promise<AsyncGenerator<string, void, unknown>> {
        const args = ['tail'];

        if (workerName) {
            args.push(workerName);
        }

        if (options.format) {
            args.push('--format', options.format);
        }

        if (options.status) {
            args.push('--status', options.status);
        }

        if (options.method) {
            args.push('--method', options.method);
        }

        if (options.search) {
            args.push('--search', options.search);
        }

        // ストリーミングログ用の非同期ジェネレーターを作成
        const wranglerPath = this.wranglerPath;
        async function* logStream() {
            const subprocess = execa(wranglerPath, args);

            if (!subprocess.stdout) {
                return;
            }

            // stdoutをストリームとして処理
            subprocess.stdout.setEncoding('utf8');
            for await (const chunk of subprocess.stdout) {
                // setEncodingによりチャンクは既に文字列
                yield chunk as string;
            }
        }

        return logStream();
    }
}

/**
 * Wranglerダッシュボードインスタンスを作成します
 * @param wranglerPath Wrangler CLIのパス（オプション）
 * @returns WranglerDashboardインスタンス
 */
export function createWranglerDashboard(wranglerPath?: string): WranglerDashboard {
    return new WranglerDashboard(wranglerPath);
}

/**
 * ダッシュボードデータを表示用にフォーマットします
 * @param data フォーマットするダッシュボードデータ
 * @returns フォーマットされた文字列
 */
export function formatDashboardData(data: WranglerDashboardData): string {
    const sections: string[] = [];

    // Workerセクション
    if (data.workers.length > 0) {
        sections.push('📦 Workers:');
        for (const worker of data.workers) {
            sections.push(
                `  • ${worker.name}${worker.routes ? ` (${worker.routes.join(', ')})` : ''}`
            );
        }
    }

    // R2バケットセクション
    if (data.r2Buckets.length > 0) {
        sections.push('\n🪣 R2 Buckets:');
        for (const bucket of data.r2Buckets) {
            sections.push(`  • ${bucket.name}${bucket.location ? ` (${bucket.location})` : ''}`);
        }
    }

    // KVネームスペースセクション
    if (data.kvNamespaces.length > 0) {
        sections.push('\n🗄️ KV Namespaces:');
        for (const ns of data.kvNamespaces) {
            sections.push(`  • ${ns.title} (${ns.id})`);
        }
    }

    // アナリティクスセクション
    if (data.analytics) {
        sections.push('\n📊 Analytics:');
        sections.push(
            `  • Requests: ${data.analytics.requests.total} (${data.analytics.requests.success} success, ${data.analytics.requests.error} error)`
        );
        sections.push(`  • Bandwidth: ${data.analytics.bandwidth.bytes} bytes`);
        sections.push(
            `  • CPU Time (p50/p75/p99): ${data.analytics.cpu_time.percentiles.p50}ms / ${data.analytics.cpu_time.percentiles.p75}ms / ${data.analytics.cpu_time.percentiles.p99}ms`
        );
    }

    return sections.join('\n');
}
