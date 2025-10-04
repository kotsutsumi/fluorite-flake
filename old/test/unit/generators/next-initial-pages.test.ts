/**
 * monorepo 配下の Next.js 子プロジェクトで DatabaseDemo コンポーネントを読み込まないことを検証するテスト。
 */
import path from 'node:path';
import fs from 'fs-extra';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProjectConfig } from '../../../src/commands/create/types.js';
import { createInitialPages } from '../../../src/generators/next-generator/helpers/createInitialPages.js';
import {
    cleanupAllTempDirs,
    createTempProject,
    projectFileExists,
    readProjectFile,
} from '../../helpers/temp-dir.js';

describe('createInitialPages', () => {
    afterEach(async () => {
        await cleanupAllTempDirs();
    });

    it('monorepo 子プロジェクトでは DatabaseDemo を SSR へ含めない', async () => {
        const projectPath = await createTempProject('monorepo-child', { framework: 'nextjs' });
        await fs.ensureDir(path.join(projectPath, 'src/app'));

        const config: ProjectConfig = {
            projectName: 'monorepo-child',
            projectPath,
            framework: 'nextjs',
            database: 'turso',
            orm: 'prisma',
            deployment: false,
            storage: 'none',
            auth: false,
            packageManager: 'pnpm',
            mode: 'full',
            isMonorepoChild: true,
        };

        await createInitialPages(config);

        const pageContent = await readProjectFile(projectPath, 'src/app/page.tsx');
        expect(pageContent).not.toContain('import DatabaseDemo');
        expect(pageContent).not.toContain('<DatabaseDemo />');

        expect(await projectFileExists(projectPath, 'src/app/layout.tsx')).toBe(true);
    });
});
