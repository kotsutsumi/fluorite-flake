/**
 * 実プロビジョナー (`RealProvisioner`) が CLI・環境変数に依存する前提条件を適切に検証するかをチェックするユニットテスト。
 * 必須環境変数の欠落検知や Vercel CLI の存在確認、エラー時のラップ処理をモックした `execa` を通じて再現する。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('execa', () => ({ execa: vi.fn() }));

import { execa } from 'execa';
const execaMock = vi.mocked(execa);

import { ProvisioningError } from '../../../src/utils/cloud/errors.js';
import { RealProvisioner } from '../../../src/utils/cloud/real-provisioner.js';

const originalEnv = { ...process.env };

function setRequiredEnv() {
    process.env.TURSO_API_TOKEN = 'token';
    process.env.TURSO_ORG_SLUG = 'org';
    process.env.VERCEL_TOKEN = 'vercel';
}

// RealProvisioner の前提条件や CLI 呼び出しを検証するテストスイート
describe('RealProvisioner', () => {
    beforeEach(() => {
        process.env = { ...originalEnv };
        execaMock.mockReset();
    });

    // 必須環境変数が欠けている場合に初期化時点で例外が発生することを確認する
    it('throws when required environment variables are missing', () => {
        process.env.TURSO_API_TOKEN = '';
        process.env.TURSO_ORG_SLUG = '';
        process.env.VERCEL_TOKEN = '';

        expect(() => new RealProvisioner()).toThrow(ProvisioningError);
    });

    // Vercel CLI のバージョン確認が成功するケースを再現し、正しいコマンドが呼ばれるか検証する
    it('verifies Vercel CLI before provisioning', async () => {
        setRequiredEnv();
        execaMock.mockResolvedValue({ stdout: 'vercel/99.0.0' });
        const provisioner = new RealProvisioner();
        const ensureCli = (provisioner as unknown as Record<string, unknown>)
            .ensureVercelCli as () => Promise<void>;

        await expect(ensureCli()).resolves.toBeUndefined();
        expect(execaMock).toHaveBeenCalledWith('vercel', ['--version']);
    });

    // Vercel CLI の呼び出し失敗時に ProvisioningError へラップされることを検証する
    it('wraps Vercel CLI errors in ProvisioningError', async () => {
        setRequiredEnv();
        execaMock.mockRejectedValue(new Error('not found'));
        const provisioner = new RealProvisioner();
        const ensureCli = (provisioner as unknown as Record<string, unknown>)
            .ensureVercelCli as () => Promise<void>;

        await expect(ensureCli()).rejects.toBeInstanceOf(ProvisioningError);
    });
});
