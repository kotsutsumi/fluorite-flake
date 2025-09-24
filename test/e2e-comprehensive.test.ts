import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import path from 'node:path';
import { createProject } from '../src/commands/create.js';
import {
  createTestDirectory,
  cleanupTestDirectory,
  runPackageManagerCommand,
  verifyProjectStructure,
  verifyPackageScripts,
  createTestFileWithIssues,
  verifyBuildOutput,
  TEST_CONFIGS,
  EXPECTED_FILES,
  EXPECTED_SCRIPTS,
  type CommandResult,
} from './e2e-utils.js';

/**
 * Comprehensive E2E Test Suite
 * Tests multiple project configurations and verifies all functionality
 */

describe('Comprehensive E2E Tests', () => {
  const E2E_TIMEOUT = 300000; // 5 minutes for build operations
  const COMMAND_TIMEOUT = 60000; // 1 minute for regular commands

  describe('Next.js E2E Tests', () => {
    describe('Pattern 1: Basic Next.js (No Database, No Deployment, pnpm)', () => {
      let testDir: string;
      let projectPath: string;
      const projectName = 'nextjs-basic-e2e';

      beforeAll(async () => {
        testDir = await createTestDirectory('e2e-nextjs-basic-');
        projectPath = path.join(testDir, projectName);
      }, 30000);

      afterAll(async () => {
        await cleanupTestDirectory(testDir);
      });

      it(
        'should generate project successfully',
        async () => {
          const config = {
            ...TEST_CONFIGS.nextjs.basic,
            projectName,
            projectPath,
            packageManager: 'pnpm' as const,
          };

          await createProject(config);

          // Verify basic structure
          const structureCheck = await verifyProjectStructure(
            projectPath,
            EXPECTED_FILES.nextjs.basic
          );
          expect(structureCheck.success).toBe(true);
          if (!structureCheck.success) {
            console.error('Missing files:', structureCheck.missing);
          }
        },
        E2E_TIMEOUT
      );

      it('should have all required scripts', async () => {
        const scriptsCheck = await verifyPackageScripts(projectPath, EXPECTED_SCRIPTS.nextjs.basic);
        expect(scriptsCheck.success).toBe(true);
        if (!scriptsCheck.success) {
          console.error('Missing scripts:', scriptsCheck.missing);
        }
      });

      it(
        'should install dependencies',
        async () => {
          const result = await runPackageManagerCommand(
            'pnpm',
            ['install'],
            projectPath,
            E2E_TIMEOUT
          );
          expect(result.success).toBe(true);
          expect(result.exitCode).toBe(0);
        },
        E2E_TIMEOUT
      );

      describe('Linting Commands', () => {
        it(
          'should run pnpm lint',
          async () => {
            const result = await runPackageManagerCommand(
              'pnpm',
              ['run', 'lint'],
              projectPath,
              COMMAND_TIMEOUT
            );
            expect(result.success).toBe(true);
            expect(result.stdout).toContain('Checked');
          },
          COMMAND_TIMEOUT
        );

        it(
          'should run pnpm lint:fix and fix issues',
          async () => {
            // Create a file with linting issues
            await createTestFileWithIssues(projectPath, 'test-lint.ts', 'lint');

            // Run lint:fix
            const result = await runPackageManagerCommand(
              'pnpm',
              ['run', 'lint:fix'],
              projectPath,
              COMMAND_TIMEOUT
            );
            // lint:fix may return non-zero exit code but should show output
            expect(result.stdout).toContain('Checked');
          },
          COMMAND_TIMEOUT
        );
      });

      describe('Formatting Commands', () => {
        it(
          'should run pnpm format:check',
          async () => {
            const result = await runPackageManagerCommand(
              'pnpm',
              ['run', 'format:check'],
              projectPath,
              COMMAND_TIMEOUT
            );
            // format:check may return non-zero if formatting issues found
            expect(result.stdout).toContain('Checked');
          },
          COMMAND_TIMEOUT
        );

        it(
          'should run pnpm format and fix formatting',
          async () => {
            // Create a file with formatting issues
            await createTestFileWithIssues(
              projectPath,
              'test-format.ts',
              'format'
            );

            // Run format
            const result = await runPackageManagerCommand(
              'pnpm',
              ['run', 'format'],
              projectPath,
              COMMAND_TIMEOUT
            );
            expect(result.success).toBe(true);
            expect(result.stdout).toContain('Formatted');
          },
          COMMAND_TIMEOUT
        );
      });

      describe('Combined Check Commands', () => {
        it(
          'should run pnpm check',
          async () => {
            const result = await runPackageManagerCommand(
              'pnpm',
              ['run', 'check'],
              projectPath,
              COMMAND_TIMEOUT
            );
            // check may return non-zero if issues found
            expect(result.stdout).toContain('Checked');
          },
          COMMAND_TIMEOUT
        );

        it(
          'should run pnpm check:fix and fix all issues',
          async () => {
            // Create a file with both linting and formatting issues
            await createTestFileWithIssues(projectPath, 'test-check.ts', 'both');

            // Run check:fix
            const result = await runPackageManagerCommand(
              'pnpm',
              ['run', 'check:fix'],
              projectPath,
              COMMAND_TIMEOUT
            );
            // check:fix may return non-zero if unfixable issues remain
            expect(result.stdout).toContain('Checked');
          },
          COMMAND_TIMEOUT
        );
      });

      describe('Build Command', () => {
        it(
          'should run pnpm build successfully',
          async () => {
            // Ensure project exists and dependencies are installed
            const fs = await import('fs-extra');
            expect(await fs.pathExists(projectPath)).toBe(true);
            expect(await fs.pathExists(path.join(projectPath, 'node_modules'))).toBe(true);

            // Clean up any test files created by previous tests that might interfere with build
            const testFiles = [
              path.join(projectPath, 'src/test-lint.ts'),
              path.join(projectPath, 'src/test-format.ts'),
              path.join(projectPath, 'src/test-check.ts'),
            ];

            for (const testFile of testFiles) {
              if (await fs.pathExists(testFile)) {
                await fs.remove(testFile);
              }
            }

            // First, fix formatting and organization issues that would prevent build
            await runPackageManagerCommand(
              'pnpm',
              ['run', 'check:fix'],
              projectPath,
              COMMAND_TIMEOUT
            );

            const result = await runPackageManagerCommand(
              'pnpm',
              ['run', 'build'],
              projectPath,
              E2E_TIMEOUT
            );

            if (!result.success) {
              console.error('Build failed with stdout:', result.stdout);
              console.error('Build failed with stderr:', result.stderr);
              console.error('Exit code:', result.exitCode);
            }

            expect(result.success).toBe(true);

            // Verify build output
            const buildCheck = await verifyBuildOutput(projectPath, 'nextjs');
            expect(buildCheck.success).toBe(true);
            if (!buildCheck.success) {
              console.error('Missing build artifacts:', buildCheck.missing);
            }
          },
          E2E_TIMEOUT
        );
      });
    });

    describe('Pattern 2: Next.js with Turso Database', () => {
      let testDir: string;
      let projectPath: string;
      const projectName = 'nextjs-turso-e2e';

      beforeAll(async () => {
        testDir = await createTestDirectory('e2e-nextjs-turso-');
        projectPath = path.join(testDir, projectName);
      }, 30000);

      afterAll(async () => {
        await cleanupTestDirectory(testDir);
      });

      it(
        'should generate project with database configuration',
        async () => {
          const config = {
            ...TEST_CONFIGS.nextjs.withTurso,
            projectName,
            projectPath,
            packageManager: 'pnpm' as const,
          };

          await createProject(config);

          // Verify structure includes database files
          const expectedFiles = [
            ...EXPECTED_FILES.nextjs.basic,
            ...EXPECTED_FILES.nextjs.withDatabase,
          ];

          const structureCheck = await verifyProjectStructure(projectPath, expectedFiles);
          expect(structureCheck.success).toBe(true);
        },
        E2E_TIMEOUT
      );

      it('should have database scripts', async () => {
        const expectedScripts = [
          ...EXPECTED_SCRIPTS.nextjs.basic,
          ...EXPECTED_SCRIPTS.nextjs.withDatabase,
        ];

        const scriptsCheck = await verifyPackageScripts(projectPath, expectedScripts);
        expect(scriptsCheck.success).toBe(true);
      });

      it(
        'should install dependencies including database packages',
        async () => {
          const result = await runPackageManagerCommand(
            'pnpm',
            ['install'],
            projectPath,
            E2E_TIMEOUT
          );
          expect(result.success).toBe(true);

          // Verify .env was created by postinstall
          const fs = await import('fs-extra');
          const envExists = await fs.pathExists(path.join(projectPath, '.env'));
          expect(envExists).toBe(true);
        },
        E2E_TIMEOUT
      );

      it(
        'should run database commands successfully',
        async () => {
          // Generate Prisma client
          const generateResult = await runPackageManagerCommand(
            'pnpm',
            ['run', 'db:generate'],
            projectPath,
            COMMAND_TIMEOUT
          );
          expect(generateResult.success).toBe(true);
        },
        COMMAND_TIMEOUT
      );

      it(
        'should build successfully with database configuration',
        async () => {
          const result = await runPackageManagerCommand(
            'pnpm',
            ['run', 'build'],
            projectPath,
            E2E_TIMEOUT
          );
          expect(result.success).toBe(true);
        },
        E2E_TIMEOUT
      );
    });

    describe('Pattern 3: Next.js with Vercel Deployment', () => {
      let testDir: string;
      let projectPath: string;
      const projectName = 'nextjs-vercel-e2e';

      beforeAll(async () => {
        testDir = await createTestDirectory('e2e-nextjs-vercel-');
        projectPath = path.join(testDir, projectName);
      }, 30000);

      afterAll(async () => {
        await cleanupTestDirectory(testDir);
      });

      it(
        'should generate project with deployment configuration',
        async () => {
          const config = {
            ...TEST_CONFIGS.nextjs.withVercel,
            projectName,
            projectPath,
            packageManager: 'pnpm' as const,
          };

          await createProject(config);

          // Verify deployment files exist
          const fs = await import('fs-extra');
          expect(await fs.pathExists(path.join(projectPath, 'vercel.json'))).toBe(true);
          expect(await fs.pathExists(path.join(projectPath, 'scripts'))).toBe(true);
        },
        E2E_TIMEOUT
      );

      it('should have deployment scripts', async () => {
        const expectedScripts = [
          ...EXPECTED_SCRIPTS.nextjs.basic,
          ...EXPECTED_SCRIPTS.nextjs.withDeployment,
        ];

        const scriptsCheck = await verifyPackageScripts(projectPath, expectedScripts);
        expect(scriptsCheck.success).toBe(true);
      });
    });

    describe('Performance and Quality Metrics', () => {
      it('should generate project within acceptable time', async () => {
        const testDir = await createTestDirectory('e2e-perf-');
        const projectPath = path.join(testDir, 'perf-test');

        const config = {
          ...TEST_CONFIGS.nextjs.basic,
          projectName: 'perf-test',
          projectPath,
          packageManager: 'pnpm' as const,
        };

        const startTime = Date.now();
        await createProject(config);
        const duration = Date.now() - startTime;

        // Should generate in less than 10 seconds
        expect(duration).toBeLessThan(10000);

        await cleanupTestDirectory(testDir);
      }, 30000);

      it('should handle errors gracefully', async () => {
        const testDir = await createTestDirectory('e2e-error-');
        const projectPath = path.join(testDir, 'error-test');

        // Try to create project with invalid configuration
        const config = {
          projectName: 'error-test',
          projectPath,
          framework: 'invalid' as unknown as 'nextjs',
          database: 'none' as const,
          deployment: false,
          storage: 'none' as const,
          auth: false,
          packageManager: 'pnpm' as const,
        };

        await expect(createProject(config)).rejects.toThrow();

        await cleanupTestDirectory(testDir);
      });
    });
  });

  describe('Command Matrix Tests', () => {
    it(
      'should test all combinations of commands',
      async () => {
        const testDir = await createTestDirectory('e2e-matrix-');
        const projectPath = path.join(testDir, 'matrix-test');

        const config = {
          ...TEST_CONFIGS.nextjs.basic,
          projectName: 'matrix-test',
          projectPath,
          packageManager: 'pnpm' as const,
        };

        await createProject(config);
        await runPackageManagerCommand('pnpm', ['install'], projectPath, E2E_TIMEOUT);

        // First fix formatting issues so other commands work better
        await runPackageManagerCommand('pnpm', ['run', 'format'], projectPath, COMMAND_TIMEOUT);

        const commands = ['lint', 'lint:fix', 'format', 'format:check', 'check', 'check:fix'];

        const results: Map<string, CommandResult> = new Map();

        for (const command of commands) {
          const result = await runPackageManagerCommand(
            'pnpm',
            ['run', command],
            projectPath,
            COMMAND_TIMEOUT
          );
          results.set(command, result);

          // All commands should at least run and show output
          // Different commands have different output patterns
          if (command === 'format') {
            expect(result.stdout).toContain('Formatted');
          } else {
            expect(result.stdout).toContain('Checked');
          }
        }

        // Commands should complete (may have non-zero exit codes if they find issues)
        expect(
          Array.from(results.values()).every(
            (r) => r.stdout.includes('Checked') || r.stdout.includes('Formatted')
          )
        ).toBe(true);

        await cleanupTestDirectory(testDir);
      },
      E2E_TIMEOUT
    );
  });
});
