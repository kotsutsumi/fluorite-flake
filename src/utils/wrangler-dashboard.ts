/**
 * Wrangler Dashboard Integration
 *
 * Minimal dashboard features for Cloudflare Workers and R2 storage
 * without external dependencies that cause compilation issues.
 */

import { execa } from 'execa';
import type { ExecaError } from 'execa';

/**
 * Wrangler dashboard data types
 */
export interface WranglerWorker {
    name: string;
    id?: string;
    created_on?: string;
    modified_on?: string;
    etag?: string;
    routes?: string[];
    usage_model?: 'bundled' | 'unbound';
}

export interface WranglerR2Bucket {
    name: string;
    created_on?: string;
    location?: string;
}

export interface WranglerKVNamespace {
    id: string;
    title: string;
    supports_url_encoding?: boolean;
}

export interface WranglerDurableObject {
    name: string;
    class_name: string;
    script_name?: string;
}

export interface WranglerDeployment {
    id: string;
    created_on: string;
    author: string;
    source: 'upload' | 'wrangler';
    strategy: 'percentage' | 'weight';
    versions: Array<{
        version_id: string;
        percentage: number;
    }>;
}

export interface WranglerAnalytics {
    requests: {
        success: number;
        error: number;
        total: number;
    };
    bandwidth: {
        bytes: number;
    };
    cpu_time: {
        percentiles: {
            p50: number;
            p75: number;
            p99: number;
        };
    };
}

export interface WranglerDashboardData {
    workers: WranglerWorker[];
    r2Buckets: WranglerR2Bucket[];
    kvNamespaces: WranglerKVNamespace[];
    durableObjects: WranglerDurableObject[];
    deployments: WranglerDeployment[];
    analytics?: WranglerAnalytics;
}

/**
 * Wrangler CLI wrapper for dashboard operations
 */
export class WranglerDashboard {
    private wranglerPath: string;

    constructor(wranglerPath = 'wrangler') {
        this.wranglerPath = wranglerPath;
    }

    /**
     * Check if Wrangler CLI is available
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
     * Get Wrangler version
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
     * Check authentication status
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
     * Get current user info
     */
    async whoami(): Promise<{ email?: string; accountId?: string } | null> {
        try {
            const { stdout } = await execa(this.wranglerPath, ['whoami']);
            // Parse email from output like "You are logged in as: user@example.com"
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
     * List all workers
     */
    async listWorkers(): Promise<WranglerWorker[]> {
        try {
            const { stdout } = await execa(this.wranglerPath, ['deploy', '--dry-run', '--json']);
            const data = JSON.parse(stdout);

            // Transform the output to our format
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
            // Fallback: try to parse from non-JSON output
            try {
                const { stdout } = await execa(this.wranglerPath, ['deploy', '--dry-run']);
                // Basic parsing of worker names from output
                const matches = stdout.matchAll(/Worker:\s*(.+)/g);
                return Array.from(matches).map((match) => ({ name: match[1] }));
            } catch {
                return [];
            }
        }
    }

    /**
     * List R2 buckets
     */
    async listR2Buckets(): Promise<WranglerR2Bucket[]> {
        try {
            const { stdout } = await execa(this.wranglerPath, ['r2', 'bucket', 'list']);

            // Parse bucket names from output
            const lines = stdout.split('\n').filter((line) => line.trim());
            const buckets: WranglerR2Bucket[] = [];

            for (const line of lines) {
                // Skip headers and empty lines
                if (line.includes('Name') || line.includes('---') || !line.trim()) {
                    continue;
                }

                // Extract bucket name (first column)
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
            // If R2 is not available or user has no buckets
            return [];
        }
    }

    /**
     * List KV namespaces
     */
    async listKVNamespaces(): Promise<WranglerKVNamespace[]> {
        try {
            const { stdout } = await execa(this.wranglerPath, ['kv:namespace', 'list']);

            // Try to parse JSON output first
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
                // Fallback to parsing text output
                const lines = stdout.split('\n').filter((line) => line.trim());
                const namespaces: WranglerKVNamespace[] = [];

                for (const line of lines) {
                    // Parse lines like "namespace_id: namespace_title"
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
     * Get worker analytics (requires paid plan)
     */
    async getAnalytics(workerName: string, date?: string): Promise<WranglerAnalytics | null> {
        try {
            const args = ['analytics', workerName];
            if (date) {
                args.push('--date', date);
            }

            const { stdout } = await execa(this.wranglerPath, args);

            // Parse analytics from output
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
     * Get comprehensive dashboard data
     */
    async getDashboardData(): Promise<WranglerDashboardData> {
        const [workers, r2Buckets, kvNamespaces] = await Promise.all([
            this.listWorkers(),
            this.listR2Buckets(),
            this.listKVNamespaces(),
        ]);

        return {
            workers,
            r2Buckets,
            kvNamespaces,
            durableObjects: [], // Would require parsing wrangler.toml
            deployments: [], // Would require additional API calls
        };
    }

    /**
     * Deploy a worker (dry run by default for safety)
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
     * Create an R2 bucket
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
     * Delete an R2 bucket
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
     * Create a KV namespace
     */
    async createKVNamespace(
        title: string
    ): Promise<{ success: boolean; message: string; id?: string }> {
        try {
            const { stdout } = await execa(this.wranglerPath, ['kv:namespace', 'create', title]);

            // Extract namespace ID from output
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
     * Tail worker logs
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

        // Create an async generator for streaming logs
        const wranglerPath = this.wranglerPath;
        async function* logStream() {
            const subprocess = execa(wranglerPath, args);

            if (!subprocess.stdout) {
                return;
            }

            // Process stdout as a stream
            subprocess.stdout.setEncoding('utf8');
            for await (const chunk of subprocess.stdout) {
                // Chunk is already a string due to setEncoding
                yield chunk as string;
            }
        }

        return logStream();
    }
}

/**
 * Create a Wrangler dashboard instance
 */
export function createWranglerDashboard(wranglerPath?: string): WranglerDashboard {
    return new WranglerDashboard(wranglerPath);
}

/**
 * Format dashboard data for display
 */
export function formatDashboardData(data: WranglerDashboardData): string {
    const sections: string[] = [];

    // Workers section
    if (data.workers.length > 0) {
        sections.push('📦 Workers:');
        for (const worker of data.workers) {
            sections.push(
                `  • ${worker.name}${worker.routes ? ` (${worker.routes.join(', ')})` : ''}`
            );
        }
    }

    // R2 Buckets section
    if (data.r2Buckets.length > 0) {
        sections.push('\n🪣 R2 Buckets:');
        for (const bucket of data.r2Buckets) {
            sections.push(`  • ${bucket.name}${bucket.location ? ` (${bucket.location})` : ''}`);
        }
    }

    // KV Namespaces section
    if (data.kvNamespaces.length > 0) {
        sections.push('\n🗄️ KV Namespaces:');
        for (const ns of data.kvNamespaces) {
            sections.push(`  • ${ns.title} (${ns.id})`);
        }
    }

    // Analytics section
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
