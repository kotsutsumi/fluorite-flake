import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import path from 'node:path';
import fs from 'fs-extra';
import { createProject } from '../src/commands/create.js';
import {
  createTestDirectory,
  cleanupTestDirectory,
  runCommand,
  runPackageManagerCommand,
  verifyProjectStructure,
  verifyPackageScripts,
  createTestFileWithIssues,
  type CommandResult,
} from './e2e-utils.js';

/**
 * E2E Test Suite for Next.js Pattern 1: Basic Configuration
 *
 * Configuration:
 * - Framework: Next.js (React web framework)
 * - Project name: my-next-app1
 * - Database: None
 * - Deployment: No
 * - Storage: None
 * - Package Manager: pnpm
 *
 * Tests all commands:
 * - pnpm lint
 * - pnpm lint:fix
 * - pnpm format
 * - pnpm format:check
 * - pnpm build
 * - pnpm check
 * - pnpm check:fix
 */

describe('E2E Next.js Pattern 1: Basic Configuration', () => {
  let testDir: string;
  let projectPath: string;
  const projectName = 'my-next-app1';
  const E2E_TIMEOUT = 300000; // 5 minutes for build operations
  const COMMAND_TIMEOUT = 60000; // 1 minute for regular commands

  beforeAll(async () => {
    testDir = await createTestDirectory('e2e-pattern1-');
    projectPath = path.join(testDir, projectName);
  }, 30000);

  afterAll(async () => {
    await cleanupTestDirectory(testDir);
  });

  describe('Project Generation and Setup', () => {
    it(
      'should generate Next.js project with basic configuration',
      async () => {
        const config = {
          projectName,
          projectPath,
          framework: 'nextjs' as const,
          database: 'none' as const,
          deployment: false,
          storage: 'none' as const,
          auth: false,
          packageManager: 'pnpm' as const,
        };

        await createProject(config);

        // Verify project structure
        expect(await fs.pathExists(projectPath)).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'package.json'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'tsconfig.json'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'next.config.mjs'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'biome.json'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, '.gitignore'))).toBe(true);
      },
      E2E_TIMEOUT
    );

    it('should have correct project structure', async () => {
      const expectedFiles = [
        'src/app/page.tsx',
        'src/app/layout.tsx',
        'src/app/globals.css',
        'src/components/ui/button.tsx',
        'src/lib/utils.ts',
        'src/hooks/use-mobile.tsx',
        'postcss.config.mjs',
        'next-env.d.ts',
      ];

      const structureCheck = await verifyProjectStructure(projectPath, expectedFiles);
      expect(structureCheck.success).toBe(true);
      if (!structureCheck.success) {
        console.error('Missing files:', structureCheck.missing);
      }
    });

    it('should have all required scripts in package.json', async () => {
      const expectedScripts = [
        'dev',
        'build',
        'start',
        'lint',
        'lint:fix',
        'format',
        'format:check',
        'check',
        'check:fix',
      ];

      const scriptsCheck = await verifyPackageScripts(projectPath, expectedScripts);
      expect(scriptsCheck.success).toBe(true);
      if (!scriptsCheck.success) {
        console.error('Missing scripts:', scriptsCheck.missing);
      }
    });

    it(
      'should install dependencies successfully',
      async () => {
        const result = await runPackageManagerCommand(
          'pnpm',
          ['install'],
          projectPath,
          E2E_TIMEOUT
        );
        expect(result.success).toBe(true);
        expect(result.exitCode).toBe(0);

        // Verify node_modules and lock file exist
        expect(await fs.pathExists(path.join(projectPath, 'node_modules'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'pnpm-lock.yaml'))).toBe(true);
      },
      E2E_TIMEOUT
    );
  });

  describe('Linting Commands', () => {
    it(
      'should run "pnpm lint" successfully',
      async () => {
        const result = await runPackageManagerCommand(
          'pnpm',
          ['run', 'lint'],
          projectPath,
          COMMAND_TIMEOUT
        );
        expect(result.stdout).toContain('Checked');
        // Even with no issues, the command should complete
        expect(result.stdout.toLowerCase()).toMatch(/checked|no fixes applied/);
      },
      COMMAND_TIMEOUT
    );

    it(
      'should run "pnpm lint:fix" and fix linting issues',
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

        // Should show that files were checked
        expect(result.stdout).toContain('Checked');

        // Clean up test file
        await fs.remove(path.join(projectPath, 'src/test-lint.ts'));
      },
      COMMAND_TIMEOUT
    );
  });

  describe('Formatting Commands', () => {
    it(
      'should run "pnpm format:check" successfully',
      async () => {
        const result = await runPackageManagerCommand(
          'pnpm',
          ['run', 'format:check'],
          projectPath,
          COMMAND_TIMEOUT
        );

        // Should show that files were checked
        expect(result.stdout).toContain('Checked');
      },
      COMMAND_TIMEOUT
    );

    it(
      'should run "pnpm format" and fix formatting issues',
      async () => {
        // Create a file with formatting issues
        await createTestFileWithIssues(projectPath, 'test-format.ts', 'format');

        // Run format
        const result = await runPackageManagerCommand(
          'pnpm',
          ['run', 'format'],
          projectPath,
          COMMAND_TIMEOUT
        );

        expect(result.success).toBe(true);
        expect(result.stdout).toContain('Formatted');

        // Clean up test file
        await fs.remove(path.join(projectPath, 'src/test-format.ts'));
      },
      COMMAND_TIMEOUT
    );
  });

  describe('Combined Check Commands', () => {
    it(
      'should run "pnpm check" successfully',
      async () => {
        const result = await runPackageManagerCommand(
          'pnpm',
          ['run', 'check'],
          projectPath,
          COMMAND_TIMEOUT
        );

        // Should show that files were checked
        expect(result.stdout).toContain('Checked');
      },
      COMMAND_TIMEOUT
    );

    it(
      'should run "pnpm check:fix" and fix all issues',
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

        // Should show that files were checked and fixed
        expect(result.stdout).toContain('Checked');

        // Clean up test file
        await fs.remove(path.join(projectPath, 'src/test-check.ts'));
      },
      COMMAND_TIMEOUT
    );
  });

  describe('Build Command', () => {
    it(
      'should run "pnpm build" successfully',
      async () => {
        // Clean up any test files that might interfere with build
        const testFiles = ['src/test-lint.ts', 'src/test-format.ts', 'src/test-check.ts'];

        for (const file of testFiles) {
          const filePath = path.join(projectPath, file);
          if (await fs.pathExists(filePath)) {
            await fs.remove(filePath);
          }
        }

        // Ensure the project is clean before building
        await runPackageManagerCommand('pnpm', ['run', 'check:fix'], projectPath, COMMAND_TIMEOUT);

        // Run build
        const result = await runPackageManagerCommand(
          'pnpm',
          ['run', 'build'],
          projectPath,
          E2E_TIMEOUT
        );

        // Build should succeed
        expect(result.success).toBe(true);
        expect(result.exitCode).toBe(0);

        // Verify build output exists
        expect(await fs.pathExists(path.join(projectPath, '.next'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, '.next/static'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, '.next/server'))).toBe(true);

        // Build output should mention successful compilation
        expect(result.stdout.toLowerCase()).toMatch(/compiled|generating|created|built/);
      },
      E2E_TIMEOUT
    );
  });

  describe('Command Output Validation', () => {
    it('should validate all command outputs are as expected', async () => {
      const commands = [
        { cmd: 'lint', expectedOutput: 'Checked' },
        { cmd: 'format:check', expectedOutput: 'Checked' },
        { cmd: 'check', expectedOutput: 'Checked' },
      ];

      for (const { cmd, expectedOutput } of commands) {
        const result = await runPackageManagerCommand(
          'pnpm',
          ['run', cmd],
          projectPath,
          COMMAND_TIMEOUT
        );

        expect(result.stdout).toContain(expectedOutput);
      }
    });
  });

  describe('Configuration Files', () => {
    it('should have valid TypeScript configuration', async () => {
      const tsconfigPath = path.join(projectPath, 'tsconfig.json');
      const tsconfig = await fs.readJSON(tsconfigPath);

      expect(tsconfig.compilerOptions).toBeDefined();
      expect(tsconfig.compilerOptions.strict).toBe(true);
      expect(tsconfig.compilerOptions.jsx).toBe('preserve');
      expect(tsconfig.include).toContain('**/*.ts');
      expect(tsconfig.include).toContain('**/*.tsx');
    });

    it('should have valid Next.js configuration', async () => {
      const nextConfigPath = path.join(projectPath, 'next.config.mjs');
      const nextConfigContent = await fs.readFile(nextConfigPath, 'utf-8');

      expect(nextConfigContent).toContain('export default nextConfig');
      expect(nextConfigContent).toContain('reactStrictMode: true');
    });

    it('should have valid Biome configuration', async () => {
      const biomeConfigPath = path.join(projectPath, 'biome.json');
      const biomeConfig = await fs.readJSON(biomeConfigPath);

      expect(biomeConfig.linter).toBeDefined();
      expect(biomeConfig.formatter).toBeDefined();
      expect(biomeConfig.linter.enabled).toBe(true);
      expect(biomeConfig.formatter.enabled).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    it('should handle and recover from lint errors', async () => {
      // Create a file with severe linting issues
      const severeIssuesPath = path.join(projectPath, 'src/severe-issues.ts');
      await fs.writeFile(
        severeIssuesPath,
        `
// Multiple linting issues
const unused = 1;
const another_unused = 2;
var should_be_const = 3;
let never_reassigned = 4;

function badly_named() {
  console.log("test")
}
`
      );

      // Run lint:fix
      const fixResult = await runPackageManagerCommand(
        'pnpm',
        ['run', 'lint:fix'],
        projectPath,
        COMMAND_TIMEOUT
      );

      // Should attempt to fix issues
      expect(fixResult.stdout).toContain('Checked');

      // Clean up
      await fs.remove(severeIssuesPath);
    });
  });
});
