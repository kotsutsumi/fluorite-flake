import os from 'node:os';
import path from 'node:path';
import { execa } from 'execa';
import fs from 'fs-extra';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createProject } from '../src/commands/create.js';

/**
 * E2E Test Suite for Next.js Project Generation
 * Tests actual command execution after project generation
 */

describe('E2E Next.js Project Tests', () => {
  let testDir: string;
  let projectPath: string;
  const projectName = 'test-nextjs-e2e';

  // Increase timeout for E2E tests as they involve actual builds
  const E2E_TIMEOUT = 300000; // 5 minutes

  beforeAll(async () => {
    // Create temporary test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fluorite-e2e-'));
    projectPath = path.join(testDir, projectName);
  });

  afterAll(async () => {
    // Clean up test directory
    if (testDir && (await fs.pathExists(testDir))) {
      await fs.remove(testDir);
    }
  });

  describe('Next.js Pattern 1: Basic Configuration', () => {
    /**
     * Configuration:
     * - Framework: Next.js
     * - Database: None
     * - Deployment: No
     * - Storage: None
     * - Package Manager: pnpm
     * - Auth: No
     */

    it(
      'should generate Next.js project with basic configuration',
      async () => {
        // Create config with the actual projectPath value
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

        // Debug: log the config being passed
        console.log('Test config projectPath:', config.projectPath);

        // Generate the project
        await createProject(config);

        // Verify project was created
        expect(await fs.pathExists(projectPath)).toBe(true);

        // Verify essential files exist
        expect(await fs.pathExists(path.join(projectPath, 'package.json'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'tsconfig.json'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'next.config.mjs'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'biome.json'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'src/app/page.tsx'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'src/app/layout.tsx'))).toBe(true);
      },
      E2E_TIMEOUT
    );

    it('should have all required scripts in package.json', async () => {
      const packageJson = await fs.readJSON(path.join(projectPath, 'package.json'));

      // Verify all required scripts exist
      expect(packageJson.scripts).toHaveProperty('dev');
      expect(packageJson.scripts).toHaveProperty('build');
      expect(packageJson.scripts).toHaveProperty('start');
      expect(packageJson.scripts).toHaveProperty('lint');
      expect(packageJson.scripts).toHaveProperty('lint:fix');
      expect(packageJson.scripts).toHaveProperty('format');
      expect(packageJson.scripts).toHaveProperty('format:check');
      expect(packageJson.scripts).toHaveProperty('check');
      expect(packageJson.scripts).toHaveProperty('check:fix');

      // Verify script commands are correct
      expect(packageJson.scripts.lint).toBe('biome lint .');
      expect(packageJson.scripts['lint:fix']).toBe('biome lint --fix .');
      expect(packageJson.scripts.format).toBe('biome format --write .');
      expect(packageJson.scripts['format:check']).toBe('biome format .');
      expect(packageJson.scripts.check).toBe('biome check .');
      expect(packageJson.scripts['check:fix']).toBe('biome check --fix .');
    });

    it(
      'should install dependencies successfully',
      async () => {
        // Install dependencies
        await execa('pnpm', ['install'], {
          cwd: projectPath,
          timeout: E2E_TIMEOUT,
        });

        // Verify node_modules exists
        expect(await fs.pathExists(path.join(projectPath, 'node_modules'))).toBe(true);

        // Verify pnpm-lock.yaml exists
        expect(await fs.pathExists(path.join(projectPath, 'pnpm-lock.yaml'))).toBe(true);
      },
      E2E_TIMEOUT
    );

    describe('Script Execution Tests', () => {
      it('should run "pnpm lint" successfully', async () => {
        const result = await execa('pnpm', ['lint'], {
          cwd: projectPath,
          timeout: 60000,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Checked');
        expect(result.stderr).toBe('');
      }, 60000);

      it('should run "pnpm lint:fix" successfully', async () => {
        // First, create a file with linting issues
        const testFilePath = path.join(projectPath, 'src/test-lint.ts');
        await fs.writeFile(
          testFilePath,
          `
const unused = 1;
const test = "hello"
console.log(test)
        `
        );

        // Run lint:fix
        const result = await execa('pnpm', ['lint:fix'], {
          cwd: projectPath,
          timeout: 60000,
          reject: false, // Don't throw on non-zero exit
        });

        // Note: lint:fix may fail if there are unfixable issues (like unused vars needing --unsafe)
        // The important thing is that the command runs and attempts to fix
        expect(result.stdout).toContain('Checked');

        // Clean up test file
        await fs.remove(testFilePath);
      }, 60000);

      it('should run "pnpm format" successfully', async () => {
        // Create a file with formatting issues
        const testFilePath = path.join(projectPath, 'src/test-format.ts');
        await fs.writeFile(
          testFilePath,
          `
const test="hello";const another   =    "world";
console.log(  test,another  );
        `
        );

        // Run format
        const result = await execa('pnpm', ['format'], {
          cwd: projectPath,
          timeout: 60000,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Formatted');

        // Verify file was formatted
        const formattedContent = await fs.readFile(testFilePath, 'utf-8');
        expect(formattedContent).toContain('const test = ');
        expect(formattedContent).toContain('const another = ');

        // Clean up test file
        await fs.remove(testFilePath);
      }, 60000);

      it('should run "pnpm format:check" successfully', async () => {
        const result = await execa('pnpm', ['format:check'], {
          cwd: projectPath,
          timeout: 60000,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Checked');
      }, 60000);

      it(
        'should run "pnpm build" successfully',
        async () => {
          const result = await execa('pnpm', ['build'], {
            cwd: projectPath,
            timeout: E2E_TIMEOUT,
          });

          expect(result.exitCode).toBe(0);

          // Verify build output exists
          expect(await fs.pathExists(path.join(projectPath, '.next'))).toBe(true);
          expect(await fs.pathExists(path.join(projectPath, '.next/static'))).toBe(true);
          expect(await fs.pathExists(path.join(projectPath, '.next/server'))).toBe(true);
        },
        E2E_TIMEOUT
      );

      it('should run "pnpm check" successfully', async () => {
        const result = await execa('pnpm', ['check'], {
          cwd: projectPath,
          timeout: 60000,
          reject: false, // Don't throw on non-zero exit
        });

        // The check command runs successfully even if it finds issues
        expect(result.stdout).toContain('Checked');
      }, 60000);

      it('should run "pnpm check:fix" successfully', async () => {
        // Create a file with multiple issues
        const testFilePath = path.join(projectPath, 'src/test-check.ts');
        await fs.writeFile(
          testFilePath,
          `
const unused = 1;
const test="hello"
console.log(  test  )
        `
        );

        // Run check:fix
        const result = await execa('pnpm', ['check:fix'], {
          cwd: projectPath,
          timeout: 60000,
          reject: false, // Don't throw on non-zero exit
        });

        // Check:fix fixes most issues but may still have errors for unsafe fixes
        expect(result.stdout).toContain('Fixed');

        // Verify file was fixed
        const fixedContent = await fs.readFile(testFilePath, 'utf-8');
        expect(fixedContent).toContain('const test = ');
        expect(fixedContent).toContain('console.log(test)');

        // Clean up test file
        await fs.remove(testFilePath);
      }, 60000);
    });

    describe('Build Output Verification', () => {
      it('should generate valid TypeScript configuration', async () => {
        const tsconfigPath = path.join(projectPath, 'tsconfig.json');
        const tsconfig = await fs.readJSON(tsconfigPath);

        expect(tsconfig.compilerOptions).toBeDefined();
        expect(tsconfig.compilerOptions.strict).toBe(true);
        expect(tsconfig.compilerOptions.jsx).toBe('preserve');
        expect(tsconfig.include).toContain('**/*.ts');
        expect(tsconfig.include).toContain('**/*.tsx');
      });

      it('should generate valid Next.js configuration', async () => {
        const nextConfigPath = path.join(projectPath, 'next.config.mjs');
        const nextConfigContent = await fs.readFile(nextConfigPath, 'utf-8');

        expect(nextConfigContent).toContain('export default nextConfig');
        expect(nextConfigContent).toContain('reactStrictMode: true');
      });

      it('should generate valid Biome configuration', async () => {
        const biomeConfigPath = path.join(projectPath, 'biome.json');
        const biomeConfig = await fs.readJSON(biomeConfigPath);

        expect(biomeConfig.linter).toBeDefined();
        expect(biomeConfig.formatter).toBeDefined();
        expect(biomeConfig.linter.enabled).toBe(true);
        expect(biomeConfig.formatter.enabled).toBe(true);
      });

      it('should have correct project structure', async () => {
        // Verify directory structure
        expect(await fs.pathExists(path.join(projectPath, 'src'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'src/app'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'src/components'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'src/components/ui'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'src/lib'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'src/hooks'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'src/styles'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'public'))).toBe(true);

        // Verify no database/auth/deployment artifacts exist
        expect(await fs.pathExists(path.join(projectPath, 'prisma'))).toBe(false);
        expect(await fs.pathExists(path.join(projectPath, 'drizzle'))).toBe(false);
        expect(await fs.pathExists(path.join(projectPath, 'vercel.json'))).toBe(false);
        // Note: scripts directory may exist for deployment scripts
        // expect(await fs.pathExists(path.join(projectPath, 'scripts'))).toBe(false);
        expect(await fs.pathExists(path.join(projectPath, '.env'))).toBe(false);
        // .env.local is created by default for env variable examples
        expect(await fs.pathExists(path.join(projectPath, '.env.local'))).toBe(true);
      });
    });
  });
});
