import os from 'node:os';
import path from 'node:path';

import fs from 'fs-extra';
import { afterEach, describe, expect, it } from 'vitest';

import type { ProjectConfig } from '../../src/commands/create/types.js';
import {
    addPostInstallScript,
    createDevelopmentBootstrapScript,
    createInitScript,
    setupDatabase,
} from '../../src/generators/database-generator.js';

type ConfigOverrides = Partial<ProjectConfig>;

const cleanupPaths: string[] = [];

async function createProject(overrides: ConfigOverrides = {}) {
    const projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ff-db-'));
    cleanupPaths.push(projectPath);

    await fs.writeJSON(path.join(projectPath, 'package.json'), {
        name: 'demo-app',
        version: '0.0.0',
        scripts: {},
        packageManager: 'pnpm@9.0.0',
    });
    await fs.writeFile(path.join(projectPath, '.env.local'), '');

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

async function readJson(projectPath: string, file: string) {
    return fs.readJSON(path.join(projectPath, file));
}

afterEach(async () => {
    await Promise.all(cleanupPaths.map((dir) => fs.remove(dir)));
    cleanupPaths.length = 0;
});

describe('setupDatabase', () => {
    it('skips work when database is none', async () => {
        const { config, projectPath } = await createProject({ database: 'none', orm: undefined });
        await setupDatabase(config);
        expect(await fs.pathExists(path.join(projectPath, 'prisma'))).toBe(false);
    });

    it('configures Turso with Prisma artifacts', async () => {
        const { config, projectPath } = await createProject({ database: 'turso', orm: 'prisma' });
        await setupDatabase(config);

        const envContent = await fs.readFile(path.join(projectPath, '.env.local'), 'utf-8');
        expect(envContent).toContain('TURSO_DATABASE_URL');

        expect(await fs.pathExists(path.join(projectPath, 'scripts', 'setup-turso.sh'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'prisma', 'schema.prisma'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'prisma', 'seed.ts'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'src', 'lib', 'db.ts'))).toBe(true);
        expect(
            await fs.pathExists(path.join(projectPath, 'src', 'app', 'api', 'posts', 'route.ts'))
        ).toBe(true);
        expect(
            await fs.pathExists(path.join(projectPath, 'src', 'components', 'database-demo.tsx'))
        ).toBe(true);

        const pkg = await readJson(projectPath, 'package.json');
        expect(pkg.scripts['setup:db']).toBe('bash scripts/setup-turso.sh');
        expect(pkg.scripts['db:push']).toBe('prisma db push');
    });

    it('configures Supabase with Drizzle artifacts', async () => {
        const { config, projectPath } = await createProject({
            database: 'supabase',
            orm: 'drizzle',
        });
        await setupDatabase(config);

        const envContent = await fs.readFile(path.join(projectPath, '.env.local'), 'utf-8');
        expect(envContent).toContain('NEXT_PUBLIC_SUPABASE_URL');

        expect(await fs.pathExists(path.join(projectPath, 'scripts', 'setup-supabase.sh'))).toBe(
            true
        );
        expect(await fs.pathExists(path.join(projectPath, 'src', 'lib', 'supabase.ts'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'drizzle.config.ts'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'src', 'db', 'schema.ts'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'src', 'db', 'seed.ts'))).toBe(true);

        const pkg = await readJson(projectPath, 'package.json');
        expect(pkg.scripts.supabase).toBe('supabase');
        expect(pkg.scripts['db:generate']).toBe('drizzle-kit generate');
    });
});

describe('database generator utilities', () => {
    it('adds a postinstall script when missing', async () => {
        const { config, projectPath } = await createProject();
        await addPostInstallScript(config);

        const pkg = await readJson(projectPath, 'package.json');
        expect(pkg.scripts.postinstall).toBe('prisma generate');
    });

    it('prepends prisma generate when postinstall script exists', async () => {
        const { config, projectPath } = await createProject();
        await fs.writeJSON(path.join(projectPath, 'package.json'), {
            name: 'demo-app',
            scripts: { postinstall: 'echo "post"' },
            packageManager: 'pnpm@9.0.0',
        });

        await addPostInstallScript(config);
        const pkg = await readJson(projectPath, 'package.json');
        expect(pkg.scripts.postinstall.startsWith('prisma generate')).toBe(true);
        expect(pkg.scripts.postinstall.includes('echo "post"')).toBe(true);
    });

    it('creates initialization script for Turso projects', async () => {
        const { config, projectPath } = await createProject({ database: 'turso' });
        await createInitScript(config);

        expect(await fs.pathExists(path.join(projectPath, 'scripts', 'init-db.sh'))).toBe(true);
        const pkg = await readJson(projectPath, 'package.json');
        expect(pkg.scripts['init:db']).toBe('bash scripts/init-db.sh');
    });

    it('creates development bootstrap helper when database configured', async () => {
        const { config, projectPath } = await createProject({ database: 'turso', orm: 'prisma' });
        await createDevelopmentBootstrapScript(config);

        expect(await fs.pathExists(path.join(projectPath, 'dev-bootstrap.js'))).toBe(true);
    });
});
