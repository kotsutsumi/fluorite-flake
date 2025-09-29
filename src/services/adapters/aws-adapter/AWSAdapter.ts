/**
 * AWSサービスアダプター
 *
 * AWS CLIと統合してダッシュボードデータと管理機能を提供します。
 * 全ての操作に公式AWS CLIを使用します。
 */

import { exec, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import {
    type ActionResult,
    type AuthConfig,
    BaseServiceAdapter,
    type DashboardDataOptions,
    type HealthStatus,
    type LogEntry,
    type LogLevel,
    type LogOptions,
    type MetricsOptions,
    type Resource,
    type ResourceStatus,
    type ServiceAction,
    type ServiceCapabilities,
    type ServiceConfig,
    type ServiceDashboardData,
    type ServiceMetrics,
} from '../../base-service-adapter/index.js';

// AWS API response interfaces
interface AWSLambdaFunction {
    FunctionName: string;
    Runtime: string;
    MemorySize: number;
    Timeout: number;
    FunctionArn?: string;
    LastModified?: string;
}

interface AWSS3Bucket {
    Name: string;
    CreationDate: string;
}

interface AWSRDSInstance {
    DBInstanceIdentifier: string;
    Engine: string;
    EngineVersion: string;
    DBInstanceStatus: string;
    AllocatedStorage: number;
}

interface AWSLambdaListResponse {
    Functions: AWSLambdaFunction[];
}

interface AWSS3ListResponse {
    Buckets: AWSS3Bucket[];
}

interface AWSRDSListResponse {
    DBInstances: AWSRDSInstance[];
}

const execAsync = promisify(exec);

export class AWSAdapter extends BaseServiceAdapter {
    readonly name = 'aws';
    readonly displayName = 'AWS';
    readonly version = '1.0.0';
    readonly capabilities: ServiceCapabilities = {
        realTimeUpdates: false,
        logStreaming: true,
        metricsHistory: true,
        resourceManagement: true,
        multiProject: true,
        deployments: true,
        analytics: true,
        fileOperations: true,
        database: true,
        userManagement: true,
    };

    private region: string;
    private profile?: string;

    constructor(config?: ServiceConfig) {
        super(config);
        this.region = (config?.region as string) || 'us-east-1';
        this.profile = config?.profile as string;
    }

    async initialize(config?: ServiceConfig): Promise<void> {
        this.config = { ...this.config, ...config };
        if (config?.region) {
            this.region = config.region as string;
        }
        if (config?.profile) {
            this.profile = config.profile as string;
        }

        // AWS CLIがインストールされているかどうかをチェック
        try {
            await execAsync('aws --version');
            this.updateStatus({ connected: true });
        } catch (_error) {
            throw new Error(
                'AWS CLIがインストールされていません。最初にインストールしてください: https://aws.amazon.com/cli/'
            );
        }
    }

    async authenticate(authConfig: AuthConfig): Promise<boolean> {
        try {
            // AWS CLIは設定された認証情報またはIAMロールを使用
            // 呼び出し元IDを取得して認証をテスト
            const profileArg = this.profile ? `--profile ${this.profile}` : '';
            await execAsync(`aws sts get-caller-identity ${profileArg} --region ${this.region}`);

            this.authConfig = authConfig;
            this.updateStatus({ authenticated: true });
            return true;
        } catch (error) {
            this.updateStatus({ authenticated: false, error: (error as Error).message });
            return false;
        }
    }

    async isAuthenticated(): Promise<boolean> {
        try {
            const profileArg = this.profile ? `--profile ${this.profile}` : '';
            await execAsync(`aws sts get-caller-identity ${profileArg} --region ${this.region}`);
            return true;
        } catch {
            return false;
        }
    }

    async connect(): Promise<void> {
        if (!(await this.isAuthenticated())) {
            throw new Error('認証されていません。AWS認証情報を設定してください。');
        }

        this.updateStatus({ connected: true });
        this.emitDashboardUpdate(await this.getDashboardData());
    }

    async disconnect(): Promise<void> {
        this.updateStatus({ connected: false });
    }

    async healthCheck(): Promise<HealthStatus> {
        const startTime = Date.now();
        const checks = [];

        // CLIの利用可能性をチェック
        try {
            await execAsync('aws --version');
            checks.push({
                name: 'CLIの利用可能性',
                status: 'pass' as const,
                message: 'AWS CLIが利用可能です',
                duration: Date.now() - startTime,
            });
        } catch {
            checks.push({
                name: 'CLIの利用可能性',
                status: 'fail' as const,
                message: 'AWS CLIが利用できません',
                duration: Date.now() - startTime,
            });
        }

        // 認証をチェック
        const isAuth = await this.isAuthenticated();
        checks.push({
            name: '認証',
            status: isAuth ? ('pass' as const) : ('fail' as const),
            message: isAuth ? '認証済み' : '未認証',
            duration: Date.now() - startTime,
        });

        // サービスアクセスをチェック
        if (isAuth) {
            try {
                const profileArg = this.profile ? `--profile ${this.profile}` : '';
                await execAsync(
                    `aws ec2 describe-instances --max-results 1 ${profileArg} --region ${this.region}`
                );
                checks.push({
                    name: 'サービスアクセス',
                    status: 'pass' as const,
                    message: 'AWSサービスにアクセスできます',
                    duration: Date.now() - startTime,
                });
            } catch {
                checks.push({
                    name: 'サービスアクセス',
                    status: 'warn' as const,
                    message: '限定的なサービスアクセス',
                    duration: Date.now() - startTime,
                });
            }
        }

        const allPassed = checks.every((c) => c.status === 'pass');

        return {
            status: allPassed
                ? 'healthy'
                : checks.some((c) => c.status === 'pass')
                  ? 'degraded'
                  : 'unhealthy',
            timestamp: Date.now(),
            responseTime: Date.now() - startTime,
            checks,
        };
    }

    async getDashboardData(_options?: DashboardDataOptions): Promise<ServiceDashboardData> {
        const data: ServiceDashboardData = {
            timestamp: Date.now(),
        };

        const profileArg = this.profile ? `--profile ${this.profile}` : '';

        try {
            // EC2インスタンスを取得
            try {
                const { stdout } = await execAsync(
                    `aws ec2 describe-instances --output json ${profileArg} --region ${this.region}`
                );
                const result = JSON.parse(stdout);
                const instances = [];

                for (const reservation of result.Reservations) {
                    for (const instance of reservation.Instances) {
                        const nameTag = instance.Tags?.find(
                            (t: { Key: string; Value: string }) => t.Key === 'Name'
                        );
                        instances.push({
                            instanceId: instance.InstanceId,
                            name: nameTag?.Value || instance.InstanceId,
                            instanceType: instance.InstanceType,
                            state: instance.State.Name,
                            publicIp: instance.PublicIpAddress || 'N/A',
                            privateIp: instance.PrivateIpAddress,
                        });
                    }
                }

                data.ec2Instances = instances;
            } catch {
                data.ec2Instances = [];
            }

            // Lambda関数を取得
            try {
                const { stdout } = await execAsync(
                    `aws lambda list-functions --output json ${profileArg} --region ${this.region}`
                );
                const result = JSON.parse(stdout);

                const lambdaResult = result as AWSLambdaListResponse;
                data.lambdaFunctions = lambdaResult.Functions.map((fn) => ({
                    functionName: fn.FunctionName,
                    runtime: fn.Runtime,
                    memorySize: fn.MemorySize,
                    timeout: fn.Timeout,
                    invocations: Math.floor(Math.random() * 10000), // 呼び出し回数のモック
                }));
            } catch {
                data.lambdaFunctions = [];
            }

            // S3バケットを取得
            try {
                const { stdout } = await execAsync(
                    `aws s3api list-buckets --output json ${profileArg}`
                );
                const result = JSON.parse(stdout);

                const s3Result = result as AWSS3ListResponse;
                data.s3Buckets = s3Result.Buckets.map((bucket) => ({
                    name: bucket.Name,
                    createdAt: bucket.CreationDate,
                    objectCount: Math.floor(Math.random() * 1000), // オブジェクト数のモック
                    size: Math.floor(Math.random() * 10000000000), // サイズのモック
                }));
            } catch {
                data.s3Buckets = [];
            }

            // RDSデータベースを取得
            try {
                const { stdout } = await execAsync(
                    `aws rds describe-db-instances --output json ${profileArg} --region ${this.region}`
                );
                const result = JSON.parse(stdout);

                const rdsResult = result as AWSRDSListResponse;
                data.rdsDatabases = rdsResult.DBInstances.map((db) => ({
                    dbInstanceIdentifier: db.DBInstanceIdentifier,
                    engine: db.Engine,
                    engineVersion: db.EngineVersion,
                    status: db.DBInstanceStatus,
                    allocatedStorage: db.AllocatedStorage,
                }));
            } catch {
                data.rdsDatabases = [];
            }

            // CloudWatchメトリクスのモック
            const hours = 24;
            data.cloudwatchMetrics = {
                cpuUsage: Array(hours)
                    .fill(0)
                    .map(() => Math.random() * 100),
                networkIn: Array(hours)
                    .fill(0)
                    .map(() => Math.random() * 1000000),
                networkOut: Array(hours)
                    .fill(0)
                    .map(() => Math.random() * 1000000),
            };

            // コストデータのモック
            data.costs = {
                total: 1000,
                ec2: 400,
                s3: 100,
                rds: 200,
                lambda: 50,
                other: 250,
            };
        } catch (error) {
            this.emitError((error as Error).message);
        }

        return data;
    }

    async getMetrics(_options?: MetricsOptions): Promise<ServiceMetrics> {
        // メトリクスのモック - 実際の実装ではCloudWatchから取得
        return {
            timestamp: Date.now(),
            performance: {
                avgResponseTime: Math.random() * 100,
                throughput: Math.random() * 10000,
                errorRate: Math.random() * 5,
                activeConnections: Math.floor(Math.random() * 1000),
            },
            usage: {
                requests: Math.floor(Math.random() * 1000000),
                dataTransfer: Math.floor(Math.random() * 10000000000),
                resourceUtilization: Math.random() * 100,
                cost: Math.random() * 1000,
            },
            errors: {
                totalErrors: Math.floor(Math.random() * 100),
                errorsByType: {
                    '4xx': Math.floor(Math.random() * 50),
                    '5xx': Math.floor(Math.random() * 30),
                    throttle: Math.floor(Math.random() * 20),
                },
                recentErrors: [],
            },
        };
    }

    async *getLogs(options?: LogOptions): AsyncIterable<LogEntry> {
        const profileArg = this.profile ? `--profile ${this.profile}` : '';

        // 特定のロググループからCloudWatchログをストリーム
        const logGroup = options?.source || '/aws/lambda/my-function';

        const logProcess = spawn('aws', [
            'logs',
            'tail',
            logGroup,
            '--follow',
            '--format',
            'short',
            ...profileArg.split(' ').filter(Boolean),
            '--region',
            this.region,
        ]);

        for await (const chunk of logProcess.stdout) {
            const lines = chunk.toString().split('\n').filter(Boolean);
            for (const line of lines) {
                yield {
                    id: Date.now().toString(),
                    timestamp: Date.now(),
                    level: 'info' as LogLevel,
                    message: line,
                    source: 'cloudwatch',
                    metadata: { logGroup, region: this.region },
                };
            }
        }
    }

    async listResources(type?: string): Promise<Resource[]> {
        const resources: Resource[] = [];
        const profileArg = this.profile ? `--profile ${this.profile}` : '';

        if (!type || type === 'ec2') {
            try {
                const { stdout } = await execAsync(
                    `aws ec2 describe-instances --output json ${profileArg} --region ${this.region}`
                );
                const result = JSON.parse(stdout);

                for (const reservation of result.Reservations) {
                    for (const instance of reservation.Instances) {
                        const nameTag = instance.Tags?.find(
                            (t: { Key: string; Value: string }) => t.Key === 'Name'
                        );
                        resources.push({
                            id: instance.InstanceId,
                            type: 'ec2',
                            name: nameTag?.Value || instance.InstanceId,
                            status:
                                instance.State.Name === 'running'
                                    ? 'active'
                                    : ('inactive' as ResourceStatus),
                            createdAt: new Date(instance.LaunchTime).getTime(),
                            updatedAt: Date.now(),
                            metadata: instance,
                            availableActions: ['start', 'stop', 'terminate', 'reboot'],
                        });
                    }
                }
            } catch (error) {
                this.emitError((error as Error).message);
            }
        }

        if (!type || type === 'lambda') {
            try {
                const { stdout } = await execAsync(
                    `aws lambda list-functions --output json ${profileArg} --region ${this.region}`
                );
                const result = JSON.parse(stdout);

                for (const fn of result.Functions) {
                    resources.push({
                        id: fn.FunctionArn,
                        type: 'lambda',
                        name: fn.FunctionName,
                        status: 'active' as ResourceStatus,
                        createdAt: new Date(fn.LastModified).getTime(),
                        updatedAt: new Date(fn.LastModified).getTime(),
                        metadata: fn,
                        availableActions: ['invoke', 'update', 'delete', 'logs'],
                    });
                }
            } catch (error) {
                this.emitError((error as Error).message);
            }
        }

        if (!type || type === 's3') {
            try {
                const { stdout } = await execAsync(
                    `aws s3api list-buckets --output json ${profileArg}`
                );
                const result = JSON.parse(stdout);

                for (const bucket of result.Buckets) {
                    resources.push({
                        id: bucket.Name,
                        type: 's3',
                        name: bucket.Name,
                        status: 'active' as ResourceStatus,
                        createdAt: new Date(bucket.CreationDate).getTime(),
                        updatedAt: Date.now(),
                        metadata: bucket,
                        availableActions: ['browse', 'upload', 'delete', 'policy'],
                    });
                }
            } catch (error) {
                this.emitError((error as Error).message);
            }
        }

        return resources;
    }

    async getResource(id: string, type: string): Promise<Resource | null> {
        const resources = await this.listResources(type);
        return resources.find((r) => r.id === id) || null;
    }

    async executeAction(action: ServiceAction): Promise<ActionResult> {
        const profileArg = this.profile ? `--profile ${this.profile}` : '';

        try {
            switch (action.type) {
                case 'start-instance': {
                    const { instanceId } = action.params as { instanceId: string };
                    await execAsync(
                        `aws ec2 start-instances --instance-ids ${instanceId} ${profileArg} --region ${this.region}`
                    );
                    return {
                        success: true,
                        message: `インスタンス ${instanceId} を正常に開始しました`,
                    };
                }

                case 'stop-instance': {
                    const { instanceId } = action.params as { instanceId: string };
                    await execAsync(
                        `aws ec2 stop-instances --instance-ids ${instanceId} ${profileArg} --region ${this.region}`
                    );
                    return {
                        success: true,
                        message: `インスタンス ${instanceId} を正常に停止しました`,
                    };
                }

                case 'invoke-function': {
                    const { functionName, payload } = action.params as {
                        functionName: string;
                        payload?: Record<string, unknown>;
                    };
                    const payloadArg = payload ? `--payload '${JSON.stringify(payload)}'` : '';
                    const { stdout } = await execAsync(
                        `aws lambda invoke --function-name ${functionName} ${payloadArg} response.json ${profileArg} --region ${this.region}`
                    );
                    return {
                        success: true,
                        message: `関数 ${functionName} を正常に実行しました`,
                        data: JSON.parse(stdout),
                    };
                }

                case 'create-bucket': {
                    const { bucketName } = action.params as { bucketName: string };
                    const locationConstraint =
                        this.region !== 'us-east-1'
                            ? `--create-bucket-configuration LocationConstraint=${this.region}`
                            : '';
                    await execAsync(
                        `aws s3api create-bucket --bucket ${bucketName} ${locationConstraint} ${profileArg} --region ${this.region}`
                    );
                    return {
                        success: true,
                        message: `バケット ${bucketName} を正常に作成しました`,
                    };
                }

                case 'delete-bucket': {
                    const { bucketName } = action.params as { bucketName: string };
                    // まずバケットを空にする
                    await execAsync(`aws s3 rm s3://${bucketName} --recursive ${profileArg}`);
                    // その後削除する
                    await execAsync(
                        `aws s3api delete-bucket --bucket ${bucketName} ${profileArg} --region ${this.region}`
                    );
                    return {
                        success: true,
                        message: `バケット ${bucketName} を正常に削除しました`,
                    };
                }

                case 'create-stack': {
                    const { stackName, templateUrl, parameters } = action.params as {
                        stackName: string;
                        templateUrl: string;
                        parameters?: Record<string, string>;
                    };

                    let paramString = '';
                    if (parameters) {
                        paramString = Object.entries(parameters)
                            .map(([key, value]) => `ParameterKey=${key},ParameterValue=${value}`)
                            .join(' ');
                    }

                    await execAsync(
                        `aws cloudformation create-stack --stack-name ${stackName} --template-url ${templateUrl} ${paramString ? `--parameters ${paramString}` : ''} ${profileArg} --region ${this.region}`
                    );
                    return {
                        success: true,
                        message: `スタック ${stackName} の作成を開始しました`,
                    };
                }

                default:
                    return {
                        success: false,
                        message: `未知のアクションタイプ: ${action.type}`,
                        error: {
                            code: 'UNKNOWN_ACTION',
                            details: `アクション ${action.type} はサポートされていません`,
                        },
                    };
            }
        } catch (error) {
            return {
                success: false,
                message: `アクションが失敗しました: ${(error as Error).message}`,
                error: {
                    code: 'ACTION_FAILED',
                    details: (error as Error).message,
                },
            };
        }
    }
}

export default AWSAdapter;
