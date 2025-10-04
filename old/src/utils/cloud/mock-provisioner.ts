import { randomUUID } from 'node:crypto';
import type { ProjectConfig } from '../../commands/create/types.js';
import { slugify } from '../slugify.js';
import type {
    AwsS3Record,
    CloudProvisioner,
    CloudProvisioningRecord,
    CloudflareR2Record,
    ProvisionedDatabaseEnv,
    SupabaseDatabaseRecord,
    SupabaseStorageRecord,
    TursoDatabaseRecord,
    VercelBlobRecord,
} from './types.js';

/** プロビジョニング対象の環境一覧 */
const ENVIRONMENTS: ProvisionedDatabaseEnv[] = ['dev', 'stg', 'prod'];

/**
 * Tursoデータベースのモックレコードを生成します
 * @param slug プロジェクトのスラッグ名
 * @returns 各環境のTursoデータベースレコード配列
 */
function createMockDatabaseRecords(slug: string): TursoDatabaseRecord[] {
    return ENVIRONMENTS.map((env) => {
        // Tursoの命名要件に合わせてアンダースコアではなくダッシュを使用
        const dbName = `${slug}-${env}`;
        const hostname = `${dbName}.mock.turso.dev`;
        return {
            env,
            name: dbName,
            hostname,
            databaseUrl: `libsql://${hostname}`,
            authToken: `mock-token-${randomUUID()}`,
        };
    });
}

/**
 * Supabaseデータベースのモックレコードを生成します
 * @param slug プロジェクトのスラッグ名
 * @returns 各環境のSupabaseデータベースレコード配列
 */
function createMockSupabaseRecords(slug: string): SupabaseDatabaseRecord[] {
    return ENVIRONMENTS.map((env) => {
        const projectRef = `mock-${slug}-${env}-${randomUUID().substring(0, 8)}`;
        return {
            env,
            projectRef,
            databaseUrl: `postgresql://postgres:mock-password@db.${projectRef}.supabase.co:5432/postgres`,
            dbPassword: 'mock-password',
            apiUrl: `https://${projectRef}.supabase.co`,
            anonKey: `mock-anon-key-${randomUUID()}`,
            serviceRoleKey: `mock-service-key-${randomUUID()}`,
        };
    });
}

/**
 * テスト環境向けのモッククラウドプロビジョナー
 * 実際のクラウドサービスを呼び出さず、モックデータを生成します
 */
export class MockProvisioner implements CloudProvisioner {
    readonly mode = 'mock' as const;

    /**
     * プロジェクト設定に基づいてモッククラウドリソースを生成します
     * @param config プロジェクトの設定
     * @returns モックプロビジョニングレコード
     */
    async provision(config: ProjectConfig): Promise<CloudProvisioningRecord> {
        const projectSlug = slugify(config.projectName);

        // 選択されたデータベースに基づいてモックレコードを作成
        const tursoDatabases =
            config.database === 'turso' ? createMockDatabaseRecords(projectSlug) : undefined;
        const supabaseDatabases =
            config.database === 'supabase' ? createMockSupabaseRecords(projectSlug) : undefined;

        // 選択されたストレージサービスに基づいてモックレコードを作成
        let vercelBlob: VercelBlobRecord | undefined;
        let cloudflareR2: CloudflareR2Record | undefined;
        let awsS3: AwsS3Record | undefined;
        let supabaseStorage: SupabaseStorageRecord | undefined;

        if (config.storage === 'vercel-blob') {
            vercelBlob = {
                storeId: `${projectSlug}-blob`,
                storeName: `${projectSlug}-blob`,
                readWriteToken: `mock-blob-token-${randomUUID()}`,
            };
        } else if (config.storage === 'cloudflare-r2') {
            cloudflareR2 = {
                bucketName: `${projectSlug}-r2`,
                accountId: 'mock-account-id',
                accessKeyId: `mock-access-key-${randomUUID()}`,
                secretAccessKey: `mock-secret-${randomUUID()}`,
                endpoint: 'https://mock-account.r2.cloudflarestorage.com',
            };
        } else if (config.storage === 'aws-s3') {
            awsS3 = {
                bucketName: `${projectSlug}-s3-bucket`,
                region: 'us-east-1',
                accessKeyId: `mock-access-key-${randomUUID()}`,
                secretAccessKey: `mock-secret-${randomUUID()}`,
                publicUrl: `https://${projectSlug}-s3-bucket.s3.us-east-1.amazonaws.com`,
            };
        } else if (config.storage === 'supabase-storage') {
            supabaseStorage = {
                bucketName: `${projectSlug}-storage`,
                bucketId: `${projectSlug}-storage`,
                isPublic: false,
                projectRef: 'mock-project-ref',
                serviceRoleKey: `mock-service-key-${randomUUID()}`,
                anonKey: `mock-anon-key-${randomUUID()}`,
                url: `https://${projectSlug}.supabase.co/storage/v1`,
            };
        }

        return {
            mode: this.mode,
            createdAt: new Date().toISOString(),
            projectName: config.projectName,
            turso: tursoDatabases
                ? {
                      organization: 'mock-org',
                      group: 'default',
                      databases: tursoDatabases,
                  }
                : undefined,
            supabase: supabaseDatabases
                ? {
                      projectName: config.projectName,
                      organization: 'mock-org',
                      databases: supabaseDatabases,
                  }
                : undefined,
            vercel: config.deployment
                ? {
                      projectId: randomUUID(),
                      projectName: config.projectName,
                      productionUrl: `https://${projectSlug}.mock.vercel.app`,
                  }
                : undefined,
            vercelBlob,
            cloudflareR2,
            awsS3,
            supabaseStorage,
        };
    }
}
