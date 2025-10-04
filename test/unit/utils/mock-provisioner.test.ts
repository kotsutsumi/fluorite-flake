/**
 * モックプロビジョナー (`MockProvisioner`) がクラウドリソース生成結果を模擬的に返す挙動を検証するユニットテスト。
 * データベースやストレージの選択に応じてモックしたメタデータが構築されるかを確認し、
 * CLI のクラウド連携フローで利用するダミー応答の整合性を保証する。
 */
import { describe, expect, it } from 'vitest';

import type { ProjectConfig } from '../../../src/commands/create/types.js';
import { MockProvisioner } from '../../../src/utils/cloud/mock-provisioner.js';

const baseConfig: ProjectConfig = {
    projectName: 'Sample App',
    projectPath: '/tmp/sample',
    framework: 'nextjs',
    database: 'none',
    deployment: false,
    storage: 'none',
    auth: false,
    packageManager: 'pnpm',
};

// MockProvisioner が選択内容に応じたモックレコードを生成できるか確認するテスト群
describe('MockProvisioner', () => {
    // Turso を選択した際に 3 環境分のデータベース情報が生成されることを検証する
    it('provisions turso databases with three environments', async () => {
        const provisioner = new MockProvisioner();
        const record = await provisioner.provision({
            ...baseConfig,
            database: 'turso',
        });

        expect(record.mode).toBe('mock');
        expect(record.turso?.databases).toHaveLength(3);
        const envs = record.turso?.databases.map((db) => db.env);
        expect(envs).toEqual(expect.arrayContaining(['dev', 'stg', 'prod']));
    });

    // ストレージ種別に応じたモックメタデータ（S3 バケット名や Blob トークン）が生成されることを確認する
    it('provisions storage metadata based on selection', async () => {
        const provisioner = new MockProvisioner();
        const awsRecord = await provisioner.provision({
            ...baseConfig,
            storage: 'aws-s3',
        });
        expect(awsRecord.awsS3?.bucketName).toMatch(/sample-app-s3-bucket/);

        const blobRecord = await provisioner.provision({
            ...baseConfig,
            storage: 'vercel-blob',
        });
        expect(blobRecord.vercelBlob?.readWriteToken).toMatch(/^mock-blob-token-/);
    });
});
