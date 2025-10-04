/**
 * クラウドプロビジョニング関連の型 (`cloud/types`) が想定どおりの構造で利用できるかを検証するユニットテスト。
 * オプショナルなサービス情報を含むレコードを生成し、型定義が SDK 利用時のデータ構造と一致することを確認する。
 */
import { describe, expect, it } from 'vitest';

import type {
    CloudProvisioningRecord,
    TursoDatabaseRecord,
} from '../../../src/utils/cloud/types.js';

// 型エイリアスの組み合わせが破綻なく利用できるかを検証するテスト
describe('cloud/types definitions', () => {
    // CloudProvisioningRecord に Turso 情報を含めたケースが型・実行時ともに許容されることを確認する
    it('allows constructing a CloudProvisioningRecord with optional services', () => {
        const tursoRecord: TursoDatabaseRecord = {
            env: 'dev',
            name: 'app-dev',
            hostname: 'app-dev.turso.io',
            databaseUrl: 'libsql://app-dev.turso.io',
            authToken: 'token',
        };

        const record: CloudProvisioningRecord = {
            mode: 'mock',
            createdAt: new Date().toISOString(),
            projectName: 'Demo',
            turso: {
                organization: 'org',
                group: 'default',
                databases: [tursoRecord],
            },
        };

        expect(record.mode).toBe('mock');
        expect(record.turso?.databases[0].name).toBe('app-dev');
    });
});
