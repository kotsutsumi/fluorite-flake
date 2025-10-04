/**
 * `auth-generator` が Next.js プロジェクト向けに Better Auth のスキャフォールディングを適用する際の挙動を検証するユニットテスト。
 * フレームワーク / ORM の組み合わせによる分岐や、package.json・ソースファイル・依存関係の更新が
 * 期待どおり行われるかをテンポラリプロジェクトで再現し、設定条件の逸脱を早期に検知する。
 */
import os from 'node:os';
import path from 'node:path';

import fs from 'fs-extra';
import { afterEach, describe, expect, it } from 'vitest';

import type { ProjectConfig } from '../../../src/commands/create/types.js';
import { setupAuth } from '../../../src/generators/auth-generator/index.js';

type ConfigOverrides = Partial<ProjectConfig>;

const cleanupPaths: string[] = [];

// テスト専用に一時ディレクトリを作成し、必要なデフォルト値で ProjectConfig を構築する
async function createProject(overrides: ConfigOverrides = {}) {
    const projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ff-auth-'));
    cleanupPaths.push(projectPath);

    await fs.writeJSON(path.join(projectPath, 'package.json'), {
        name: 'demo-app',
        version: '0.0.0',
        dependencies: {},
        devDependencies: {},
    });

    const config: ProjectConfig = {
        projectName: 'demo-app',
        projectPath,
        framework: 'nextjs',
        database: 'turso',
        orm: 'prisma',
        deployment: false,
        storage: 'none',
        auth: true,
        packageManager: 'pnpm',
        mode: 'full',
        ...overrides,
    } as ProjectConfig;

    return { config, projectPath };
}

// 各テスト後に生成したディレクトリを削除し、状態が汚染されないようにする
afterEach(async () => {
    await Promise.all(cleanupPaths.map((dir) => fs.remove(dir)));
    cleanupPaths.length = 0;
});

// setupAuth が選択条件に応じた分岐と副作用を実行できるかを検証する
describe('setupAuth', () => {
    // Next.js 以外のフレームワークでは何も変更しないことを確認する
    it('returns early for non-Next.js frameworks', async () => {
        const { config, projectPath } = await createProject({ framework: 'expo' });
        await setupAuth(config);
        const pkg = await fs.readJSON(path.join(projectPath, 'package.json'));
        expect(pkg.dependencies['better-auth']).toBeUndefined();
    });

    // Prisma 以外の ORM が選択された場合に明示的な例外を投げることを検証する
    it('throws when Prisma is not selected as ORM', async () => {
        const { config } = await createProject({ orm: 'drizzle' });
        await expect(setupAuth(config)).rejects.toThrow(
            'Better Auth advanced scaffolding currently requires Prisma'
        );
    });

    // Next.js + Prisma の構成で依存関係・テンプレートファイルがすべて配置されることを確認する
    it('adds auth scaffolding and dependencies for Next.js projects', async () => {
        const { config, projectPath } = await createProject();
        await setupAuth(config);

        const pkg = await fs.readJSON(path.join(projectPath, 'package.json'));
        expect(pkg.dependencies['better-auth']).toBe('^1.2.3');
        expect(pkg.dependencies.zod).toBe('^3.23.8');
        expect(pkg.devDependencies['@types/bcryptjs']).toBe('^2.4.6');

        expect(await fs.pathExists(path.join(projectPath, 'src', 'lib', 'auth.ts'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'src', 'lib', 'roles.ts'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'src', 'lib', 'auth-client.ts'))).toBe(
            true
        );
        expect(await fs.pathExists(path.join(projectPath, 'src', 'lib', 'auth-server.ts'))).toBe(
            true
        );
        expect(
            await fs.pathExists(
                path.join(projectPath, 'src', 'app', 'api', 'auth', '[...all]', 'route.ts')
            )
        ).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'prisma', 'seed.ts'))).toBe(true);
    });
});
