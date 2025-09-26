import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { describe, expect, it } from 'vitest';

import type { ProjectConfig } from '../../src/commands/create/types.js';
import { generatePackageJson } from '../../src/utils/package-json.js';

const baseConfig: ProjectConfig = {
    projectName: 'feature-app',
    projectPath: '',
    framework: 'nextjs',
    database: 'turso',
    orm: 'prisma',
    deployment: true,
    storage: 'vercel-blob',
    auth: true,
    packageManager: 'pnpm',
};

describe('generatePackageJson', () => {
    it('writes package.json with selected features', async () => {
        const dir = await mkdtemp(path.join(os.tmpdir(), 'pkgjson-'));
        const config = { ...baseConfig, projectPath: dir };

        await generatePackageJson(config);

        const pkg = await fs.readJSON(path.join(dir, 'package.json'));
        expect(pkg.name).toBe('feature-app');
        expect(pkg.dependencies.next).toBeDefined();
        expect(pkg.dependencies['@vercel/blob']).toBeDefined();
        expect(pkg.dependencies['@vercel/analytics']).toBeDefined();
        expect(pkg.dependencies['better-auth']).toBeDefined();
        expect(pkg.devDependencies.prisma).toBeDefined();
    });
});
