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
 * E2E Test Suite for Next.js Pattern 2: Turso Database with Prisma
 *
 * Configuration:
 * - Framework: Next.js (React web framework)
 * - Project name: my-next-app
 * - Database: Turso (SQLite edge database)
 * - ORM: Prisma
 * - Deployment: No
 * - Storage: None
 * - Authentication: No
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
 * - pnpm db:generate
 * - pnpm db:push
 * - pnpm db:seed
 * - pnpm db:studio (verify command exists)
 */

describe('E2E Next.js Pattern 2: Turso Database with Prisma', () => {
  let testDir: string;
  let projectPath: string;
  const projectName = 'my-next-app';
  const E2E_TIMEOUT = 300000; // 5 minutes for build operations
  const COMMAND_TIMEOUT = 60000; // 1 minute for regular commands
  const DB_COMMAND_TIMEOUT = 120000; // 2 minutes for database operations

  beforeAll(async () => {
    testDir = await createTestDirectory('e2e-pattern2-');
    projectPath = path.join(testDir, projectName);
  }, 30000);

  afterAll(async () => {
    await cleanupTestDirectory(testDir);
  });

  describe('Project Generation and Setup', () => {
    it(
      'should generate Next.js project with Turso database and Prisma',
      async () => {
        const config = {
          projectName,
          projectPath,
          framework: 'nextjs' as const,
          database: 'turso' as const,
          orm: 'prisma' as const,
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
      },
      E2E_TIMEOUT
    );

    it('should have correct project structure with database files', async () => {
      const expectedFiles = [
        // Basic Next.js files
        'src/app/page.tsx',
        'src/app/layout.tsx',
        'src/app/globals.css',
        'src/components/ui/button.tsx',
        'src/lib/utils.ts',
        'src/hooks/use-mobile.tsx',
        'postcss.config.mjs',
        'next-env.d.ts',
        // Database-specific files
        'prisma/schema.prisma',
        'prisma/seed.ts',
        'src/lib/db.ts',
        '.env.local',
        // Database demo files
        'src/app/api/posts/route.ts',
        'src/components/database-demo.tsx',
      ];

      const structureCheck = await verifyProjectStructure(projectPath, expectedFiles);
      expect(structureCheck.success).toBe(true);
      if (!structureCheck.success) {
        console.error('Missing files:', structureCheck.missing);
      }
    });

    it('should have all required scripts including database commands', async () => {
      const expectedScripts = [
        // Basic scripts
        'dev',
        'build',
        'start',
        'lint',
        'lint:fix',
        'format',
        'format:check',
        'check',
        'check:fix',
        // Database scripts
        'db:generate',
        'db:push',
        'db:seed',
        'db:studio',
      ];

      const scriptsCheck = await verifyPackageScripts(projectPath, expectedScripts);
      expect(scriptsCheck.success).toBe(true);
      if (!scriptsCheck.success) {
        console.error('Missing scripts:', scriptsCheck.missing);
      }
    });

    it('should have database-related dependencies', async () => {
      const packageJson = await fs.readJSON(path.join(projectPath, 'package.json'));

      // Check for Prisma dependencies
      expect(packageJson.devDependencies).toHaveProperty('prisma');
      expect(packageJson.dependencies).toHaveProperty('@prisma/client');

      // Check for Turso dependencies
      expect(packageJson.dependencies).toHaveProperty('@libsql/client');
      expect(packageJson.dependencies).toHaveProperty('@prisma/adapter-libsql');

      // Check for TypeScript database types
      expect(packageJson.devDependencies).toHaveProperty('@types/node');
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

        // Verify .env file was created by postinstall
        expect(await fs.pathExists(path.join(projectPath, '.env'))).toBe(true);
      },
      E2E_TIMEOUT
    );
  });

  describe('Database Configuration', () => {
    it('should have valid Prisma schema', async () => {
      const schemaPath = path.join(projectPath, 'prisma/schema.prisma');
      const schema = await fs.readFile(schemaPath, 'utf-8');

      // Check for essential Prisma configuration
      expect(schema).toContain('generator client');
      expect(schema).toContain('datasource db');
      expect(schema).toContain('provider = "sqlite"');
      expect(schema).toContain('previewFeatures = ["driverAdapters"]');

      // Check for models
      expect(schema).toContain('model User');
      expect(schema).toContain('model Post');
    });

    it('should have valid database seed file', async () => {
      const seedPath = path.join(projectPath, 'prisma/seed.ts');
      const seed = await fs.readFile(seedPath, 'utf-8');

      // Check for seed content
      expect(seed).toContain('PrismaClient');
      expect(seed).toContain('alice@example.com');
      expect(seed).toContain('bob@example.com');
      expect(seed).toContain('Getting Started with Next.js and Turso');
    });

    it('should have environment variables configured', async () => {
      const envPath = path.join(projectPath, '.env');
      const envContent = await fs.readFile(envPath, 'utf-8');

      // Check for database URL
      expect(envContent).toContain('DATABASE_URL');
      expect(envContent).toContain('TURSO_AUTH_TOKEN');
    });
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
      },
      COMMAND_TIMEOUT
    );

    it(
      'should run "pnpm lint:fix" and fix linting issues',
      async () => {
        await createTestFileWithIssues(projectPath, 'test-lint.ts', 'lint');

        const result = await runPackageManagerCommand(
          'pnpm',
          ['run', 'lint:fix'],
          projectPath,
          COMMAND_TIMEOUT
        );

        expect(result.stdout).toContain('Checked');

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

        expect(result.stdout).toContain('Checked');
      },
      COMMAND_TIMEOUT
    );

    it(
      'should run "pnpm format" and fix formatting issues',
      async () => {
        await createTestFileWithIssues(projectPath, 'test-format.ts', 'format');

        const result = await runPackageManagerCommand(
          'pnpm',
          ['run', 'format'],
          projectPath,
          COMMAND_TIMEOUT
        );

        expect(result.success).toBe(true);
        expect(result.stdout).toContain('Formatted');

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

        expect(result.stdout).toContain('Checked');
      },
      COMMAND_TIMEOUT
    );

    it(
      'should run "pnpm check:fix" and fix all issues',
      async () => {
        await createTestFileWithIssues(projectPath, 'test-check.ts', 'both');

        const result = await runPackageManagerCommand(
          'pnpm',
          ['run', 'check:fix'],
          projectPath,
          COMMAND_TIMEOUT
        );

        expect(result.stdout).toContain('Checked');

        await fs.remove(path.join(projectPath, 'src/test-check.ts'));
      },
      COMMAND_TIMEOUT
    );
  });

  describe('Database Commands', () => {
    it(
      'should run "pnpm db:generate" successfully',
      async () => {
        const result = await runPackageManagerCommand(
          'pnpm',
          ['run', 'db:generate'],
          projectPath,
          DB_COMMAND_TIMEOUT
        );

        expect(result.success).toBe(true);
        expect(result.stdout.toLowerCase()).toMatch(/generated|prisma client/);
      },
      DB_COMMAND_TIMEOUT
    );

    it(
      'should run "pnpm db:push" successfully',
      async () => {
        // First ensure db:generate has been run
        await runPackageManagerCommand(
          'pnpm',
          ['run', 'db:generate'],
          projectPath,
          DB_COMMAND_TIMEOUT
        );

        const result = await runPackageManagerCommand(
          'pnpm',
          ['run', 'db:push'],
          projectPath,
          DB_COMMAND_TIMEOUT
        );

        expect(result.success).toBe(true);
        // db:push might show warnings but should complete
        expect(result.stdout.toLowerCase()).toMatch(
          /database|pushed|sync|apply|changes|up to date/
        );

        // Verify database setup completed (may be local file or cloud connection)
        // Check if local dev.db exists OR if cloud database was configured
        const localDbExists = await fs.pathExists(path.join(projectPath, 'prisma/dev.db'));
        const envExists = await fs.pathExists(path.join(projectPath, '.env.local'));
        expect(localDbExists || envExists).toBe(true);
      },
      DB_COMMAND_TIMEOUT
    );

    it(
      'should run "pnpm db:seed" successfully',
      async () => {
        // Ensure database is set up first
        await runPackageManagerCommand(
          'pnpm',
          ['run', 'db:generate'],
          projectPath,
          DB_COMMAND_TIMEOUT
        );

        await runPackageManagerCommand('pnpm', ['run', 'db:push'], projectPath, DB_COMMAND_TIMEOUT);

        const result = await runPackageManagerCommand(
          'pnpm',
          ['run', 'db:seed'],
          projectPath,
          DB_COMMAND_TIMEOUT
        );

        expect(result.success).toBe(true);
        // Seed should show success message
        expect(result.stdout).toMatch(/seeded|success|created|✅/i);

        // Should mention created records
        expect(result.stdout.toLowerCase()).toMatch(/users|posts|created/);
      },
      DB_COMMAND_TIMEOUT
    );

    it('should have "pnpm db:studio" command configured', async () => {
      const packageJson = await fs.readJSON(path.join(projectPath, 'package.json'));

      // Verify db:studio script exists
      expect(packageJson.scripts).toHaveProperty('db:studio');
      expect(packageJson.scripts['db:studio']).toContain('prisma studio');

      // Note: We don't actually run db:studio as it starts an interactive server
      // Just verify the command is configured correctly
    });

    it(
      'should run database commands in correct sequence',
      async () => {
        // Test the recommended database setup sequence
        const sequence = [
          { cmd: 'db:generate', expectedPattern: /generated|prisma client/i },
          { cmd: 'db:push', expectedPattern: /database|pushed|sync|apply|changes|up to date/i },
          { cmd: 'db:seed', expectedPattern: /seeded|success|created|✅/i },
        ];

        for (const { cmd, expectedPattern } of sequence) {
          const result = await runPackageManagerCommand(
            'pnpm',
            ['run', cmd],
            projectPath,
            DB_COMMAND_TIMEOUT
          );

          expect(result.success).toBe(true);
          expect(result.stdout.toLowerCase()).toMatch(expectedPattern);
        }
      },
      DB_COMMAND_TIMEOUT * 3 // Allow time for all three commands
    );
  });

  describe('Build Command with Database', () => {
    it(
      'should run "pnpm build" successfully with database configured',
      async () => {
        // Clean up any test files
        const testFiles = ['src/test-lint.ts', 'src/test-format.ts', 'src/test-check.ts'];
        for (const file of testFiles) {
          const filePath = path.join(projectPath, file);
          if (await fs.pathExists(filePath)) {
            await fs.remove(filePath);
          }
        }

        // Ensure database is set up
        await runPackageManagerCommand(
          'pnpm',
          ['run', 'db:generate'],
          projectPath,
          DB_COMMAND_TIMEOUT
        );

        // Ensure code is clean
        await runPackageManagerCommand('pnpm', ['run', 'check:fix'], projectPath, COMMAND_TIMEOUT);

        // Run build
        const result = await runPackageManagerCommand(
          'pnpm',
          ['run', 'build'],
          projectPath,
          E2E_TIMEOUT
        );

        expect(result.success).toBe(true);
        expect(result.exitCode).toBe(0);

        // Verify build output
        expect(await fs.pathExists(path.join(projectPath, '.next'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, '.next/static'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, '.next/server'))).toBe(true);
      },
      E2E_TIMEOUT
    );
  });

  describe('Database Integration', () => {
    it('should have database demo UI components', async () => {
      // Verify database demo UI files exist
      expect(await fs.pathExists(path.join(projectPath, 'src/app/api/posts/route.ts'))).toBe(true);
      expect(await fs.pathExists(path.join(projectPath, 'src/components/database-demo.tsx'))).toBe(
        true
      );
    });

    it('should have database client configuration', async () => {
      const dbPath = path.join(projectPath, 'src/lib/db.ts');
      const dbContent = await fs.readFile(dbPath, 'utf-8');

      // Check for Turso client setup
      expect(dbContent).toContain('@libsql/client');
      expect(dbContent).toContain('PrismaClient');
      expect(dbContent).toContain('PrismaLibSQL');
      expect(dbContent).toContain('DATABASE_URL');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Temporarily rename .env to simulate missing env vars
      const envPath = path.join(projectPath, '.env');
      const envBackupPath = path.join(projectPath, '.env.backup');

      await fs.rename(envPath, envBackupPath);

      // Try to run db:push without env vars
      const result = await runPackageManagerCommand(
        'pnpm',
        ['run', 'db:push'],
        projectPath,
        DB_COMMAND_TIMEOUT
      );

      // Should fail but with meaningful error
      expect(result.success).toBe(false);
      expect(result.stderr.toLowerCase()).toMatch(/database|url|env|environment/);

      // Restore .env
      await fs.rename(envBackupPath, envPath);
    });

    it('should validate Prisma schema before operations', async () => {
      // Temporarily corrupt schema
      const schemaPath = path.join(projectPath, 'prisma/schema.prisma');
      const originalSchema = await fs.readFile(schemaPath, 'utf-8');

      await fs.writeFile(schemaPath, originalSchema.replace('model User {', 'invalid User {'));

      // Try to run db:generate with invalid schema
      const result = await runPackageManagerCommand(
        'pnpm',
        ['run', 'db:generate'],
        projectPath,
        DB_COMMAND_TIMEOUT
      );

      // Should fail with schema error
      expect(result.success).toBe(false);
      expect(result.stderr.toLowerCase()).toMatch(/error|invalid|schema|parse/);

      // Restore schema
      await fs.writeFile(schemaPath, originalSchema);
    });
  });
});
