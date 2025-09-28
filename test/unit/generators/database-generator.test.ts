/**
 * `database-generator` が Next.js プロジェクト向けに生成するスキャフォールディングの完全性を検証するユニットテスト。
 * 選択されたデータベース種別と ORM の組み合わせに応じて、環境変数・スクリプト・テンプレートファイルが
 * 正しく配置されるかをテンポラリプロジェクト上で再現し、将来の仕様変更による破壊的な挙動を早期検知する。
 * 併せて補助ユーティリティが既存の package.json をどのように更新するかも確認する。
 */
import path from 'node:path';
import fs from 'fs-extra';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProjectConfig } from '../../../src/commands/create/types.js';
import {
    addPostInstallScript,
    createDevelopmentBootstrapScript,
    createInitScript,
    setupDatabase,
} from '../../../src/generators/database-generator.js';
import {
    createTempProject,
    cleanupAllTempDirs,
    readProjectJson,
    readProjectFile,
    projectFileExists,
} from '../../helpers/temp-dir.js';

type ConfigOverrides = Partial<ProjectConfig>;

// テストごとに孤立したテンポラリプロジェクトを生成し、必要な ProjectConfig を構築する
async function createProject(overrides: ConfigOverrides = {}) {
    const projectPath = await createTempProject('demo-app', {
        framework: overrides.framework || 'nextjs',
        packageManager: overrides.packageManager || 'pnpm',
    });

    const config: ProjectConfig = {
        projectName: 'demo-app',
        projectPath,
        framework: 'nextjs',
        database: 'turso',
        orm: 'prisma',
        deployment: true,
        storage: 'none',
        auth: false,
        packageManager: 'pnpm',
        mode: 'full',
        ...overrides,
    } as ProjectConfig;

    return { projectPath, config };
}

// 生成したテンポラリディレクトリを毎テスト後にクリーンアップする
afterEach(async () => {
    await cleanupAllTempDirs();
});

// setupDatabase がデータベース種別ごとに必要な資材を出力できるかを検証する
describe('setupDatabase', () => {
    // database: none の構成では Prisma ディレクトリなどを作成しないことを確認する
    it('skips work when database is none', async () => {
        const { config, projectPath } = await createProject({ database: 'none', orm: undefined });
        await setupDatabase(config);
        expect(await projectFileExists(projectPath, 'prisma')).toBe(false);
    });

    // Turso + Prisma を選択した際に環境変数・スクリプト・Prisma 関連ファイルが揃うことを検証する
    it('configures Turso with Prisma artifacts', async () => {
        const { config, projectPath } = await createProject({ database: 'turso', orm: 'prisma' });
        await setupDatabase(config);

        const envContent = await readProjectFile(projectPath, '.env.local');
        expect(envContent).toContain('TURSO_DATABASE_URL');

        expect(await projectFileExists(projectPath, 'scripts/setup-turso.sh')).toBe(true);
        expect(await projectFileExists(projectPath, 'prisma/schema.prisma')).toBe(true);
        expect(await projectFileExists(projectPath, 'prisma/seed.ts')).toBe(true);
        expect(await projectFileExists(projectPath, 'src/lib/db.ts')).toBe(true);
        expect(await projectFileExists(projectPath, 'src/app/api/posts/route.ts')).toBe(true);
        expect(await projectFileExists(projectPath, 'src/components/database-demo.tsx')).toBe(true);

        const pkg = await readProjectJson(projectPath, 'package.json');
        expect(pkg.scripts['setup:db']).toBe('bash scripts/setup-turso.sh');
        expect(pkg.scripts['db:push']).toBe('prisma db push');
        expect(pkg.scripts['db:push:force']).toBe('prisma db push --force-reset --skip-generate');
        expect(pkg.scripts.postinstall).toContain('prisma generate');
    });

    // Supabase + Drizzle の構成で必要な環境変数と Drizzle 用ファイル群が生成されることを確認する
    it('configures Supabase with Drizzle artifacts', async () => {
        const { config, projectPath } = await createProject({
            database: 'supabase',
            orm: 'drizzle',
        });
        await setupDatabase(config);

        const envContent = await readProjectFile(projectPath, '.env.local');
        expect(envContent).toContain('NEXT_PUBLIC_SUPABASE_URL');

        expect(await projectFileExists(projectPath, 'scripts/setup-supabase.sh')).toBe(true);
        expect(await projectFileExists(projectPath, 'src/lib/supabase.ts')).toBe(true);
        expect(await projectFileExists(projectPath, 'drizzle.config.ts')).toBe(true);
        expect(await projectFileExists(projectPath, 'src/db/schema.ts')).toBe(true);
        expect(await projectFileExists(projectPath, 'src/db/seed.ts')).toBe(true);

        const pkg = await readProjectJson(projectPath, 'package.json');
        expect(pkg.scripts.supabase).toBe('supabase');
        expect(pkg.scripts['db:generate']).toBe('drizzle-kit generate');
    });
});

// generator が提供する補助関数群が package.json やスクリプトを正しく更新するかを検証する
describe('database generator utilities', () => {
    // postinstall スクリプトが存在しない場合に Prisma generate を追加することを確認する
    it('adds a postinstall script when missing', async () => {
        const { config, projectPath } = await createProject();
        await addPostInstallScript(config);

        const pkg = await readProjectJson(projectPath, 'package.json');
        expect(pkg.scripts.postinstall).toBe('prisma generate');
    });

    // 既存の postinstall に Prisma generate を先頭追加し、元のコマンドを保持することを検証する
    it('prepends prisma generate when postinstall script exists', async () => {
        const { config, projectPath } = await createProject();
        await fs.writeJSON(path.join(projectPath, 'package.json'), {
            name: 'demo-app',
            scripts: { postinstall: 'echo "post"' },
            packageManager: 'pnpm@9.0.0',
        });

        await addPostInstallScript(config);
        const pkg = await readProjectJson(projectPath, 'package.json');
        expect(pkg.scripts.postinstall.startsWith('prisma generate')).toBe(true);
        expect(pkg.scripts.postinstall.includes('echo "post"')).toBe(true);
    });

    // Turso プロジェクト用の初期化スクリプトと対応する npm script が生成されることを確認する
    it('creates initialization script for Turso projects', async () => {
        const { config, projectPath } = await createProject({ database: 'turso' });
        await createInitScript(config);

        expect(await projectFileExists(projectPath, 'scripts/init-db.sh')).toBe(true);
        const pkg = await readProjectJson(projectPath, 'package.json');
        expect(pkg.scripts['init:db']).toBe('bash scripts/init-db.sh');
    });

    // データベース設定が有効な場合に開発用ブートストラップスクリプトを追加することを検証する
    it('creates development bootstrap helper when database configured', async () => {
        const { config, projectPath } = await createProject({ database: 'turso', orm: 'prisma' });
        await createDevelopmentBootstrapScript(config);

        expect(await projectFileExists(projectPath, 'dev-bootstrap.js')).toBe(true);
    });
});
