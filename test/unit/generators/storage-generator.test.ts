/**
 * `storage-generator` が選択されたストレージオプションに応じて Next.js プロジェクトへ必要な資材を配置する挙動を検証するユニットテスト。
 * 環境変数ファイルの追記やセットアップスクリプトの生成、UI コンポーネントの追加までをテンポラリ環境で確認し、
 * ストレージ種別ごとの前提条件が崩れていないかを継続的に監視する目的で実施している。
 */
import os from 'node:os';
import path from 'node:path';

import fs from 'fs-extra';
import { afterEach, describe, expect, it } from 'vitest';

import type { ProjectConfig } from '../../../src/commands/create/types.js';
import { setupStorage } from '../../../src/generators/storage-generator/index.js';

type ConfigOverrides = Partial<ProjectConfig>;

const cleanupPaths: string[] = [];

// テストごとに隔離された一時プロジェクトを作成し、標準的な ProjectConfig を用意する
async function createProject(overrides: ConfigOverrides = {}) {
    const projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ff-storage-'));
    cleanupPaths.push(projectPath);

    await fs.writeJSON(path.join(projectPath, 'package.json'), {
        name: 'demo-app',
        version: '0.0.0',
        scripts: {},
    });
    await fs.writeFile(path.join(projectPath, '.env.local'), '');
    await fs.writeFile(path.join(projectPath, '.env.development'), '');

    const config: ProjectConfig = {
        projectName: 'demo-app',
        projectPath,
        framework: 'nextjs',
        database: 'none',
        deployment: false,
        storage: 'vercel-blob',
        auth: false,
        packageManager: 'pnpm',
        mode: 'full',
        ...overrides,
    } as ProjectConfig;

    return { config, projectPath };
}

// 生成したテンポラリディレクトリを毎テスト後に削除し、状態が残らないようにする
afterEach(async () => {
    await Promise.all(cleanupPaths.map((dir) => fs.remove(dir)));
    cleanupPaths.length = 0;
});

// setupStorage の分岐ごとにファイル生成と環境変数の書き込みが行われるかを検証する
describe('setupStorage', () => {
    // storage: none の場合は追加ファイルを生成しないことを確認し、余計な副作用を防ぐ
    it('skips work when storage is none', async () => {
        const { config, projectPath } = await createProject({ storage: 'none' });
        await setupStorage(config);

        expect(await fs.pathExists(path.join(projectPath, 'src', 'lib', 'storage.ts'))).toBe(false);
    });

    // Vercel Blob を選択した際にセットアップスクリプトと環境変数の雛形が揃うことを検査する
    it('configures Vercel Blob storage scaffolding', async () => {
        const { config, projectPath } = await createProject({ storage: 'vercel-blob' });
        await setupStorage(config);

        const envLocal = await fs.readFile(path.join(projectPath, '.env.local'), 'utf-8');
        const envDev = await fs.readFile(path.join(projectPath, '.env.development'), 'utf-8');

        expect(envLocal).toContain('BLOB_READ_WRITE_TOKEN');
        expect(envDev).toContain('BLOB_READ_WRITE_TOKEN');

        const pkg = await fs.readJSON(path.join(projectPath, 'package.json'));
        expect(pkg.scripts['setup:blob']).toBe('bash scripts/setup-vercel-blob.sh');

        expect(await fs.pathExists(path.join(projectPath, 'scripts', 'setup-vercel-blob.sh'))).toBe(
            true
        );
        expect(await fs.pathExists(path.join(projectPath, 'scripts', 'check-blob-config.ts'))).toBe(
            true
        );
        expect(await fs.pathExists(path.join(projectPath, 'src', 'lib', 'storage.ts'))).toBe(true);
        expect(
            await fs.pathExists(path.join(projectPath, 'src', 'app', 'api', 'upload', 'route.ts'))
        ).toBe(true);
        expect(
            await fs.pathExists(path.join(projectPath, 'src', 'components', 'file-upload.tsx'))
        ).toBe(true);
    });

    // Cloudflare R2 を選択した場合に必要な環境変数とストレージ helper が作成されることを確認する
    it('adds Cloudflare R2 helper files and env entries', async () => {
        const { config, projectPath } = await createProject({ storage: 'cloudflare-r2' });
        await setupStorage(config);

        const envLocal = await fs.readFile(path.join(projectPath, '.env.local'), 'utf-8');
        expect(envLocal).toContain('R2_BUCKET_NAME');
        expect(await fs.pathExists(path.join(projectPath, 'src', 'lib', 'storage.ts'))).toBe(true);
    });

    // Supabase Storage を選んだときに Supabase クライアントと環境変数が揃うかを検証する
    it('creates Supabase storage client when missing', async () => {
        const { config, projectPath } = await createProject({ storage: 'supabase-storage' });
        await setupStorage(config);

        const envLocal = await fs.readFile(path.join(projectPath, '.env.local'), 'utf-8');
        expect(envLocal).toContain('SUPABASE_STORAGE_BUCKET');
        expect(await fs.pathExists(path.join(projectPath, 'src', 'lib', 'supabase.ts'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'src', 'lib', 'storage.ts'))).toBe(true);
    });
});
