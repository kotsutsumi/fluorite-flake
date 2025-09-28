import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
    runCli,
    runCliInteractive,
    expectSuccess,
    expectFailure,
    expectOutput,
} from '../../helpers/cli-runner.js';
import { createTempDir, cleanupAllTempDirs, projectFileExists } from '../../helpers/temp-dir.js';

describe('CLI create command', () => {
    let tempDir: string;

    beforeEach(async () => {
        tempDir = await createTempDir('ff-cli-test-');
    });

    afterEach(async () => {
        await cleanupAllTempDirs();
    });

    describe('help and usage', () => {
        it('should display help for create command', async () => {
            const result = await runCli(['create', '--help']);

            expectSuccess(result);
            expectOutput(result, 'Create a new project');
        });

        it('should display help for new command (alias)', async () => {
            const result = await runCli(['new', '--help']);

            expectSuccess(result);
            expectOutput(result, 'Create a new project');
        });
    });

    describe('command line arguments', () => {
        it('should create project with all required flags', async () => {
            const projectPath = `${tempDir}/test-project`;
            const result = await runCli([
                'create',
                '--name',
                'test-project',
                '--path',
                projectPath,
                '--framework',
                'nextjs',
                '--database',
                'none',
                '--storage',
                'none',
                '--no-deployment',
                '--no-auth',
                '--package-manager',
                'pnpm',
                '--mode',
                'test', // Use test mode to skip actual installation
            ]);

            expectSuccess(result);
            expectOutput(result, /test-project/);

            // Verify project was created
            expect(await projectFileExists(projectPath, 'package.json')).toBe(true);
        });

        it('should validate required arguments', async () => {
            const result = await runCli([
                'create',
                '--name',
                'test-project',
                // Missing required arguments
                '--framework',
                'nextjs',
            ]);

            expectFailure(result);
        });

        it('should reject invalid framework', async () => {
            const result = await runCli([
                'create',
                '--name',
                'test-project',
                '--framework',
                'invalid-framework',
                '--path',
                `${tempDir}/test`,
                '--database',
                'none',
                '--storage',
                'none',
                '--no-deployment',
                '--no-auth',
                '--package-manager',
                'pnpm',
            ]);

            expectFailure(result);
        });

        it('should reject invalid database option', async () => {
            const result = await runCli([
                'create',
                '--name',
                'test-project',
                '--framework',
                'nextjs',
                '--database',
                'invalid-db',
                '--path',
                `${tempDir}/test`,
                '--storage',
                'none',
                '--no-deployment',
                '--no-auth',
                '--package-manager',
                'pnpm',
            ]);

            expectFailure(result);
        });
    });

    describe('framework-specific constraints', () => {
        it('should not allow database for flutter framework', async () => {
            const result = await runCli([
                'create',
                '--name',
                'test-flutter',
                '--framework',
                'flutter',
                '--database',
                'turso', // Should fail - Flutter doesn't support database
                '--path',
                `${tempDir}/test`,
                '--storage',
                'none',
                '--no-deployment',
                '--no-auth',
                '--package-manager',
                'pnpm',
            ]);

            expectFailure(result);
        });

        it('should not allow storage for tauri framework', async () => {
            const result = await runCli([
                'create',
                '--name',
                'test-tauri',
                '--framework',
                'tauri',
                '--database',
                'none',
                '--storage',
                'vercel-blob', // Should fail - Tauri doesn't support storage
                '--path',
                `${tempDir}/test`,
                '--no-deployment',
                '--no-auth',
                '--package-manager',
                'pnpm',
            ]);

            expectFailure(result);
        });

        it('should require orm when database is selected', async () => {
            const result = await runCli([
                'create',
                '--name',
                'test-project',
                '--framework',
                'nextjs',
                '--database',
                'turso',
                // Missing --orm flag
                '--path',
                `${tempDir}/test`,
                '--storage',
                'none',
                '--no-deployment',
                '--no-auth',
                '--package-manager',
                'pnpm',
            ]);

            expectFailure(result);
        });

        it('should accept orm when database is selected', async () => {
            const projectPath = `${tempDir}/test-project`;
            const result = await runCli([
                'create',
                '--name',
                'test-project',
                '--framework',
                'nextjs',
                '--database',
                'turso',
                '--orm',
                'prisma', // Now includes ORM
                '--path',
                projectPath,
                '--storage',
                'none',
                '--no-deployment',
                '--no-auth',
                '--package-manager',
                'pnpm',
                '--mode',
                'test',
            ]);

            expectSuccess(result);
        });
    });
});
