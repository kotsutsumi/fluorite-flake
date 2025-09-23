import os from 'node:os';
import path from 'node:path';
import { execa } from 'execa';
import fs from 'fs-extra';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

// Test configurations - all possible combinations
const testConfigurations = [
  // Basic configurations without database
  { name: 'basic', database: 'none', orm: null, deployment: false, auth: false },
  { name: 'basic-vercel', database: 'none', orm: null, deployment: true, auth: false },

  // Turso configurations
  { name: 'turso-prisma', database: 'turso', orm: 'prisma', deployment: false, auth: false },
  { name: 'turso-prisma-auth', database: 'turso', orm: 'prisma', deployment: false, auth: true },
  { name: 'turso-prisma-full', database: 'turso', orm: 'prisma', deployment: true, auth: true },
  { name: 'turso-drizzle', database: 'turso', orm: 'drizzle', deployment: false, auth: false },
  { name: 'turso-drizzle-auth', database: 'turso', orm: 'drizzle', deployment: false, auth: true },
  { name: 'turso-drizzle-full', database: 'turso', orm: 'drizzle', deployment: true, auth: true },

  // Supabase configurations
  { name: 'supabase-prisma', database: 'supabase', orm: 'prisma', deployment: false, auth: false },
  {
    name: 'supabase-prisma-auth',
    database: 'supabase',
    orm: 'prisma',
    deployment: false,
    auth: true,
  },
  {
    name: 'supabase-prisma-full',
    database: 'supabase',
    orm: 'prisma',
    deployment: true,
    auth: true,
  },
  {
    name: 'supabase-drizzle',
    database: 'supabase',
    orm: 'drizzle',
    deployment: false,
    auth: false,
  },
  {
    name: 'supabase-drizzle-auth',
    database: 'supabase',
    orm: 'drizzle',
    deployment: false,
    auth: true,
  },
  {
    name: 'supabase-drizzle-full',
    database: 'supabase',
    orm: 'drizzle',
    deployment: true,
    auth: true,
  },
];

describe('Fluorite-Flake Generator Tests', () => {
  let tempDir: string;

  beforeAll(async () => {
    // Create a temp directory for all tests
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fluorite-test-'));

    // Build the CLI
    await execa('pnpm', ['run', 'build'], {
      cwd: process.cwd(),
    });
  });

  afterAll(async () => {
    // Clean up temp directory
    await fs.remove(tempDir);
  });

  describe('Project Generation Tests', () => {
    for (const config of testConfigurations) {
      describe(`Configuration: ${config.name}`, () => {
        const projectPath = path.join(tempDir, config.name);

        beforeEach(async () => {
          // Clean up project directory if it exists
          await fs.remove(projectPath);
        });

        afterEach(async () => {
          // Clean up after each test
          await fs.remove(projectPath);
        });

        it(`should generate project with ${config.name} configuration`, async () => {
          // Generate project using the mock generator
          await generateProject(projectPath, config);

          // Verify project structure
          expect(await fs.pathExists(projectPath)).toBe(true);
          expect(await fs.pathExists(path.join(projectPath, 'package.json'))).toBe(true);
          expect(await fs.pathExists(path.join(projectPath, 'tsconfig.json'))).toBe(true);
          expect(await fs.pathExists(path.join(projectPath, 'next.config.mjs'))).toBe(true);
          expect(await fs.pathExists(path.join(projectPath, 'src/app/page.tsx'))).toBe(true);
          expect(await fs.pathExists(path.join(projectPath, 'src/app/layout.tsx'))).toBe(true);
        });

        it(`should have correct dependencies for ${config.name}`, async () => {
          await generateProject(projectPath, config);
          const packageJson = await fs.readJSON(path.join(projectPath, 'package.json'));

          // Check base dependencies
          expect(packageJson.dependencies).toHaveProperty('next');
          expect(packageJson.dependencies).toHaveProperty('react');
          expect(packageJson.dependencies).toHaveProperty('react-dom');
          expect(packageJson.dependencies).toHaveProperty('jotai');
          expect(packageJson.dependencies).toHaveProperty('next-themes');

          // Check database dependencies
          if (config.database === 'turso') {
            expect(packageJson.dependencies).toHaveProperty('@libsql/client');
            if (config.orm === 'prisma') {
              expect(packageJson.dependencies).toHaveProperty('@prisma/client');
              expect(packageJson.devDependencies).toHaveProperty('prisma');
            } else if (config.orm === 'drizzle') {
              expect(packageJson.dependencies).toHaveProperty('drizzle-orm');
              expect(packageJson.devDependencies).toHaveProperty('drizzle-kit');
            }
          } else if (config.database === 'supabase') {
            expect(packageJson.dependencies).toHaveProperty('@supabase/supabase-js');
            if (config.orm === 'prisma') {
              expect(packageJson.dependencies).toHaveProperty('@prisma/client');
              expect(packageJson.devDependencies).toHaveProperty('prisma');
            } else if (config.orm === 'drizzle') {
              expect(packageJson.dependencies).toHaveProperty('drizzle-orm');
              expect(packageJson.devDependencies).toHaveProperty('drizzle-kit');
            }
          }

          // Check deployment dependencies
          if (config.deployment) {
            expect(packageJson.dependencies).toHaveProperty('@vercel/blob');
          }
        });

        it(`should have correct scripts for ${config.name}`, async () => {
          await generateProject(projectPath, config);
          const packageJson = await fs.readJSON(path.join(projectPath, 'package.json'));

          // Check base scripts
          expect(packageJson.scripts).toHaveProperty('dev');
          expect(packageJson.scripts).toHaveProperty('build');
          expect(packageJson.scripts).toHaveProperty('start');
          expect(packageJson.scripts).toHaveProperty('lint');
          expect(packageJson.scripts).toHaveProperty('format');

          // Check database scripts
          if (config.orm === 'prisma') {
            expect(packageJson.scripts).toHaveProperty('db:generate');
            expect(packageJson.scripts).toHaveProperty('db:migrate');
            expect(packageJson.scripts).toHaveProperty('db:seed');
            expect(packageJson.scripts).toHaveProperty('db:studio');
          } else if (config.orm === 'drizzle') {
            expect(packageJson.scripts).toHaveProperty('db:generate');
            expect(packageJson.scripts).toHaveProperty('db:push');
            expect(packageJson.scripts).toHaveProperty('db:studio');
          }

          // Check deployment scripts
          if (config.deployment) {
            expect(packageJson.scripts).toHaveProperty('deploy');
            expect(packageJson.scripts).toHaveProperty('deploy:prod');
          }
        });

        if (config.database !== 'none') {
          it(`should have database configuration for ${config.name}`, async () => {
            await generateProject(projectPath, config);

            if (config.orm === 'prisma') {
              expect(await fs.pathExists(path.join(projectPath, 'prisma/schema.prisma'))).toBe(
                true
              );
              const schema = await fs.readFile(
                path.join(projectPath, 'prisma/schema.prisma'),
                'utf-8'
              );
              expect(schema).toContain('model User');
              expect(schema).toContain('model Post');
            } else if (config.orm === 'drizzle') {
              expect(await fs.pathExists(path.join(projectPath, 'src/db/schema.ts'))).toBe(true);
              expect(await fs.pathExists(path.join(projectPath, 'drizzle.config.ts'))).toBe(true);
            }
          });
        }

        if (config.auth) {
          it(`should have authentication setup for ${config.name}`, async () => {
            await generateProject(projectPath, config);

            expect(await fs.pathExists(path.join(projectPath, 'src/lib/auth.ts'))).toBe(true);
            expect(await fs.pathExists(path.join(projectPath, 'src/lib/auth-client.ts'))).toBe(
              true
            );
            expect(
              await fs.pathExists(path.join(projectPath, 'src/components/auth/sign-in-form.tsx'))
            ).toBe(true);
            expect(
              await fs.pathExists(path.join(projectPath, 'src/components/auth/sign-up-form.tsx'))
            ).toBe(true);
            expect(
              await fs.pathExists(path.join(projectPath, 'src/app/api/auth/[...all]/route.ts'))
            ).toBe(true);
          });
        }

        if (config.deployment) {
          it(`should have deployment configuration for ${config.name}`, async () => {
            await generateProject(projectPath, config);

            expect(await fs.pathExists(path.join(projectPath, 'vercel.json'))).toBe(true);
            expect(await fs.pathExists(path.join(projectPath, 'scripts/deploy.sh'))).toBe(true);
            expect(
              await fs.pathExists(path.join(projectPath, 'scripts/destroy-deployment.sh'))
            ).toBe(true);
          });
        }

        it(`should run format check successfully for ${config.name}`, async () => {
          await generateProject(projectPath, config);

          // Install dependencies first (using minimal install for speed)
          await execa('pnpm', ['install', '--ignore-scripts'], {
            cwd: projectPath,
          });

          // Run format check
          const { exitCode } = await execa('pnpm', ['run', 'format:check'], {
            cwd: projectPath,
            reject: false,
          });

          expect(exitCode).toBe(0);
        });

        it(`should run lint successfully for ${config.name}`, async () => {
          await generateProject(projectPath, config);

          // Install dependencies first
          await execa('pnpm', ['install', '--ignore-scripts'], {
            cwd: projectPath,
          });

          // Run lint
          const { exitCode } = await execa('pnpm', ['run', 'lint'], {
            cwd: projectPath,
            reject: false,
          });

          expect(exitCode).toBe(0);
        });

        it(`should build successfully for ${config.name}`, async () => {
          await generateProject(projectPath, config);

          // Install dependencies first
          await execa('pnpm', ['install', '--ignore-scripts'], {
            cwd: projectPath,
          });

          // Run build
          const { exitCode } = await execa('pnpm', ['run', 'build'], {
            cwd: projectPath,
            reject: false,
          });

          expect(exitCode).toBe(0);
        }, 180000); // 3 minutes timeout for build
      });
    }
  });

  describe('CLI Command Tests', () => {
    it('should show help when no arguments provided', async () => {
      const { stdout } = await execa('node', ['dist/cli.js'], {
        cwd: process.cwd(),
      });

      expect(stdout).toContain('fluorite-flake');
      expect(stdout).toContain('create');
      expect(stdout).toContain('greet');
      expect(stdout).toContain('rainbow');
      expect(stdout).toContain('status');
    });

    it('should show version', async () => {
      const { stdout } = await execa('node', ['dist/cli.js', '--version'], {
        cwd: process.cwd(),
      });

      const packageJson = await fs.readJSON(path.join(process.cwd(), 'package.json'));
      expect(stdout).toContain(packageJson.version);
    });

    it('should execute greet command', async () => {
      const { stdout } = await execa('node', ['dist/cli.js', 'greet', 'Test'], {
        cwd: process.cwd(),
      });

      expect(stdout).toContain('Hello, Test!');
    });

    it('should execute rainbow command', async () => {
      const { stdout } = await execa('node', ['dist/cli.js', 'rainbow', 'Test'], {
        cwd: process.cwd(),
      });

      expect(stdout).toContain('Rainbow Text');
    });

    it('should execute status command', async () => {
      const { stdout } = await execa('node', ['dist/cli.js', 'status'], {
        cwd: process.cwd(),
      });

      expect(stdout).toContain('System Status');
      expect(stdout).toContain('System');
      expect(stdout).toContain('Database');
    });
  });
});

// Helper function to generate a project programmatically
async function generateProject(
  projectPath: string,
  config: {
    name: string;
    database: string;
    orm: string | null;
    deployment: boolean;
    auth: boolean;
  }
) {
  // Import the generators
  const { generateNextProject } = await import('../src/generators/next-generator.js');
  const { setupDatabase } = await import('../src/generators/database-generator.js');
  const { setupDeployment } = await import('../src/generators/deployment-generator.js');
  const { setupAuth } = await import('../src/generators/auth-generator.js');

  const projectConfig = {
    projectName: path.basename(projectPath),
    projectPath,
    database: config.database,
    orm: config.orm,
    deployment: config.deployment,
    auth: config.auth,
    packageManager: 'pnpm' as const,
  };

  // Generate the project
  await generateNextProject(projectConfig);

  if (config.database !== 'none') {
    await setupDatabase(projectConfig);
  }

  if (config.deployment) {
    await setupDeployment(projectConfig);
  }

  if (config.auth) {
    await setupAuth(projectConfig);
  }
}
