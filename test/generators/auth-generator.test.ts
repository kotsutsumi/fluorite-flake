import os from 'node:os';
import path from 'node:path';

import fs from 'fs-extra';
import { afterEach, describe, expect, it } from 'vitest';

import { setupAuth } from '../../src/generators/auth-generator.js';
import type { ProjectConfig } from '../../src/commands/create/types.js';

type ConfigOverrides = Partial<ProjectConfig>;

const cleanupPaths: string[] = [];

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

afterEach(async () => {
    await Promise.all(cleanupPaths.map((dir) => fs.remove(dir)));
    cleanupPaths.length = 0;
});

describe('setupAuth', () => {
    it('returns early for non-Next.js frameworks', async () => {
        const { config, projectPath } = await createProject({ framework: 'expo' });
        await setupAuth(config);
        const pkg = await fs.readJSON(path.join(projectPath, 'package.json'));
        expect(pkg.dependencies['better-auth']).toBeUndefined();
    });

    it('throws when Prisma is not selected as ORM', async () => {
        const { config } = await createProject({ orm: 'drizzle' });
        await expect(setupAuth(config)).rejects.toThrow(
            'Better Auth advanced scaffolding currently requires Prisma'
        );
    });

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
