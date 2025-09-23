import os from 'node:os';
import path from 'node:path';
import { execa } from 'execa';
import fs from 'fs-extra';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

// Framework-specific test configurations
const nextjsConfigurations = [
  // Basic configurations without database
  {
    name: 'nextjs-basic',
    framework: 'nextjs',
    database: 'none',
    orm: null,
    deployment: false,
    storage: 'none',
    auth: false,
  },
  {
    name: 'nextjs-vercel',
    framework: 'nextjs',
    database: 'none',
    orm: null,
    deployment: true,
    storage: 'vercel-blob',
    auth: false,
  },
  // Turso configurations
  {
    name: 'nextjs-turso-prisma',
    framework: 'nextjs',
    database: 'turso',
    orm: 'prisma',
    deployment: false,
    storage: 'none',
    auth: false,
  },
  {
    name: 'nextjs-turso-prisma-auth',
    framework: 'nextjs',
    database: 'turso',
    orm: 'prisma',
    deployment: false,
    storage: 'none',
    auth: true,
  },
  {
    name: 'nextjs-turso-drizzle',
    framework: 'nextjs',
    database: 'turso',
    orm: 'drizzle',
    deployment: false,
    storage: 'none',
    auth: false,
  },
  // Supabase configurations
  {
    name: 'nextjs-supabase-prisma',
    framework: 'nextjs',
    database: 'supabase',
    orm: 'prisma',
    deployment: false,
    storage: 'none',
    auth: false,
  },
  {
    name: 'nextjs-supabase-prisma-auth',
    framework: 'nextjs',
    database: 'supabase',
    orm: 'prisma',
    deployment: false,
    storage: 'none',
    auth: true,
  },
  {
    name: 'nextjs-supabase-drizzle',
    framework: 'nextjs',
    database: 'supabase',
    orm: 'drizzle',
    deployment: false,
    storage: 'none',
    auth: false,
  },
];

const expoConfigurations = [
  {
    name: 'expo-basic',
    framework: 'expo',
    database: 'none',
    orm: null,
    deployment: false,
    storage: 'none',
    auth: false,
  },
  {
    name: 'expo-supabase',
    framework: 'expo',
    database: 'supabase',
    orm: null,
    deployment: false,
    storage: 'supabase-storage',
    auth: true,
  },
  {
    name: 'expo-turso-drizzle',
    framework: 'expo',
    database: 'turso',
    orm: 'drizzle',
    deployment: false,
    storage: 'none',
    auth: false,
  },
];

const tauriConfigurations = [
  {
    name: 'tauri-basic',
    framework: 'tauri',
    database: 'none',
    orm: null,
    deployment: false,
    storage: 'none',
    auth: false,
  },
  {
    name: 'tauri-with-deployment',
    framework: 'tauri',
    database: 'none',
    orm: null,
    deployment: true,
    storage: 'none',
    auth: false,
  },
];

const flutterConfigurations = [
  {
    name: 'flutter-basic',
    framework: 'flutter',
    database: 'none',
    orm: null,
    deployment: false,
    storage: 'none',
    auth: false,
  },
  {
    name: 'flutter-with-deployment',
    framework: 'flutter',
    database: 'none',
    orm: null,
    deployment: true,
    storage: 'none',
    auth: false,
  },
];

// Combine all configurations for comprehensive testing
const allConfigurations = [
  ...nextjsConfigurations, // Test all Next.js configurations
  ...expoConfigurations.slice(0, 2), // Test subset of Expo configs to keep runtime manageable
  ...tauriConfigurations, // Test all Tauri configs
  ...flutterConfigurations, // Test all Flutter configs
];

describe('Fluorite-Flake Multi-Framework Generator Tests', () => {
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

  describe('Multi-Framework Project Generation Tests', () => {
    for (const config of allConfigurations) {
      describe(`Configuration: ${config.name}`, () => {
        let projectPath!: string;

        beforeEach(async () => {
          projectPath = path.join(tempDir, config.name);
          // Clean up project directory if it exists
          await fs.remove(projectPath);
        });

        afterEach(async () => {
          // Clean up after each test
          await fs.remove(projectPath);
        });

        it(`should generate ${config.framework} project with ${config.name} configuration`, async () => {
          // Generate project using the generator
          await generateProject(projectPath, config);

          // Verify project structure exists
          expect(await fs.pathExists(projectPath)).toBe(true);

          // Framework-specific verifications
          switch (config.framework) {
            case 'nextjs': {
              expect(await fs.pathExists(path.join(projectPath, 'package.json'))).toBe(true);
              expect(await fs.pathExists(path.join(projectPath, 'tsconfig.json'))).toBe(true);
              expect(await fs.pathExists(path.join(projectPath, 'next.config.mjs'))).toBe(true);
              const rootPagePath = path.join(projectPath, 'src/app/page.tsx');
              if (config.auth) {
                expect(await fs.pathExists(rootPagePath)).toBe(false);
                expect(await fs.pathExists(path.join(projectPath, 'src/app/(app)/page.tsx'))).toBe(
                  true
                );
              } else {
                expect(await fs.pathExists(rootPagePath)).toBe(true);
              }
              expect(await fs.pathExists(path.join(projectPath, 'src/app/layout.tsx'))).toBe(true);
              break;
            }

            case 'expo':
              expect(await fs.pathExists(path.join(projectPath, 'package.json'))).toBe(true);
              expect(await fs.pathExists(path.join(projectPath, 'tsconfig.json'))).toBe(true);
              expect(await fs.pathExists(path.join(projectPath, 'app.json'))).toBe(true);
              expect(await fs.pathExists(path.join(projectPath, 'app/_layout.tsx'))).toBe(true);
              expect(await fs.pathExists(path.join(projectPath, 'app/(tabs)/index.tsx'))).toBe(
                true
              );
              break;

            case 'tauri':
              expect(await fs.pathExists(path.join(projectPath, 'package.json'))).toBe(true);
              expect(await fs.pathExists(path.join(projectPath, 'tsconfig.json'))).toBe(true);
              expect(await fs.pathExists(path.join(projectPath, 'vite.config.ts'))).toBe(true);
              expect(await fs.pathExists(path.join(projectPath, 'src/App.tsx'))).toBe(true);
              expect(await fs.pathExists(path.join(projectPath, 'src-tauri/Cargo.toml'))).toBe(
                true
              );
              expect(await fs.pathExists(path.join(projectPath, 'src-tauri/tauri.conf.json'))).toBe(
                true
              );
              break;

            case 'flutter':
              expect(await fs.pathExists(path.join(projectPath, 'pubspec.yaml'))).toBe(true);
              expect(await fs.pathExists(path.join(projectPath, 'lib/main.dart'))).toBe(true);
              expect(
                await fs.pathExists(path.join(projectPath, 'lib/screens/home_screen.dart'))
              ).toBe(true);
              expect(await fs.pathExists(path.join(projectPath, 'test/widget_test.dart'))).toBe(
                true
              );
              break;
          }
        });

        // Framework-specific dependency tests
        if (config.framework === 'nextjs') {
          it(`should have correct Next.js dependencies for ${config.name}`, async () => {
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
            }

            // Check storage dependencies
            if (config.storage === 'vercel-blob') {
              expect(packageJson.dependencies).toHaveProperty('@vercel/blob');
            } else if (config.storage === 'supabase-storage') {
              expect(packageJson.dependencies).toHaveProperty('@supabase/supabase-js');
            }
          });

          it(`should have correct Next.js scripts for ${config.name}`, async () => {
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
          });
        }

        if (config.framework === 'expo') {
          it(`should have correct Expo dependencies for ${config.name}`, async () => {
            await generateProject(projectPath, config);
            const packageJson = await fs.readJSON(path.join(projectPath, 'package.json'));

            // Check base dependencies
            expect(packageJson.dependencies).toHaveProperty('expo');
            expect(packageJson.dependencies).toHaveProperty('react');
            expect(packageJson.dependencies).toHaveProperty('react-native');
            expect(packageJson.dependencies).toHaveProperty('expo-router');
            expect(packageJson.dependencies).toHaveProperty('jotai');

            // Check database dependencies
            if (config.database === 'supabase') {
              expect(packageJson.dependencies).toHaveProperty('@supabase/supabase-js');
            } else if (config.database === 'turso' && config.orm === 'drizzle') {
              expect(packageJson.dependencies).toHaveProperty('drizzle-orm');
              expect(packageJson.dependencies).toHaveProperty('@libsql/client');
            }

            // Check auth dependencies
            if (config.auth) {
              expect(packageJson.dependencies).toHaveProperty('expo-auth-session');
              expect(packageJson.dependencies).toHaveProperty('expo-crypto');
            }
          });

          it(`should have correct Expo configuration for ${config.name}`, async () => {
            await generateProject(projectPath, config);
            const appConfig = await fs.readJSON(path.join(projectPath, 'app.json'));

            expect(appConfig.expo).toBeDefined();
            expect(appConfig.expo.name).toBe(path.basename(projectPath));
            expect(appConfig.expo.slug).toBeDefined();
            expect(appConfig.expo.version).toBeDefined();
            expect(appConfig.expo.orientation).toBe('portrait');
            expect(appConfig.expo.plugins).toContain('expo-router');
          });
        }

        if (config.framework === 'tauri') {
          it(`should have correct Tauri dependencies for ${config.name}`, async () => {
            await generateProject(projectPath, config);
            const packageJson = await fs.readJSON(path.join(projectPath, 'package.json'));

            // Check base dependencies
            expect(packageJson.dependencies).toHaveProperty('@tauri-apps/api');
            expect(packageJson.devDependencies).toHaveProperty('@tauri-apps/cli');
            expect(packageJson.devDependencies).toHaveProperty('vite');
            expect(packageJson.devDependencies).toHaveProperty('react');
            expect(packageJson.devDependencies).toHaveProperty('react-dom');
            expect(packageJson.devDependencies).toHaveProperty('typescript');
          });

          it(`should have correct Tauri configuration for ${config.name}`, async () => {
            await generateProject(projectPath, config);
            const tauriConfig = await fs.readJSON(
              path.join(projectPath, 'src-tauri/tauri.conf.json')
            );

            expect(tauriConfig.productName).toBe(path.basename(projectPath));
            expect(tauriConfig.build).toBeDefined();
            expect(tauriConfig.build.devUrl).toBe('http://localhost:1420');
            expect(tauriConfig.bundle).toBeDefined();
            expect(tauriConfig.app).toBeDefined();
            expect(tauriConfig.app.windows).toBeDefined();
          });

          it(`should have correct Rust configuration for ${config.name}`, async () => {
            await generateProject(projectPath, config);
            const cargoToml = await fs.readFile(
              path.join(projectPath, 'src-tauri/Cargo.toml'),
              'utf-8'
            );

            expect(cargoToml).toContain(`name = "${path.basename(projectPath)}"`);
            expect(cargoToml).toContain('tauri = ');
            expect(cargoToml).toContain('serde = ');
            expect(cargoToml).toContain('tauri-build = ');
          });
        }

        if (config.framework === 'flutter') {
          it(`should have correct Flutter configuration for ${config.name}`, async () => {
            await generateProject(projectPath, config);
            const pubspec = await fs.readFile(path.join(projectPath, 'pubspec.yaml'), 'utf-8');

            expect(pubspec).toContain(
              `name: ${path.basename(projectPath).toLowerCase().replace(/-/g, '_')}`
            );
            expect(pubspec).toContain('flutter:');
            expect(pubspec).toContain('sdk: flutter');
            expect(pubspec).toContain('provider:');
            expect(pubspec).toContain('go_router:');
            expect(pubspec).toContain('shared_preferences:');
          });

          it(`should have correct Flutter project structure for ${config.name}`, async () => {
            await generateProject(projectPath, config);

            // Check lib structure
            expect(await fs.pathExists(path.join(projectPath, 'lib/main.dart'))).toBe(true);
            expect(
              await fs.pathExists(path.join(projectPath, 'lib/screens/home_screen.dart'))
            ).toBe(true);
            expect(
              await fs.pathExists(path.join(projectPath, 'lib/screens/settings_screen.dart'))
            ).toBe(true);
            expect(
              await fs.pathExists(path.join(projectPath, 'lib/services/theme_service.dart'))
            ).toBe(true);
            expect(
              await fs.pathExists(path.join(projectPath, 'lib/widgets/feature_card.dart'))
            ).toBe(true);

            // Check test structure
            expect(await fs.pathExists(path.join(projectPath, 'test/widget_test.dart'))).toBe(true);

            // Check platform directories
            expect(await fs.pathExists(path.join(projectPath, 'android'))).toBe(true);
            expect(await fs.pathExists(path.join(projectPath, 'ios'))).toBe(true);
            expect(await fs.pathExists(path.join(projectPath, 'web'))).toBe(true);
          });
        }

        // Test database configuration if applicable
        if (config.database !== 'none' && config.orm && config.framework === 'nextjs') {
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
              expect(schema).toContain('model Organization');
              expect(schema).toContain('model Member');
            } else if (config.orm === 'drizzle') {
              expect(await fs.pathExists(path.join(projectPath, 'src/db/schema.ts'))).toBe(true);
              expect(await fs.pathExists(path.join(projectPath, 'src/db/seed.ts'))).toBe(true);
              expect(await fs.pathExists(path.join(projectPath, 'drizzle.config.ts'))).toBe(true);
            }
          });
        }

        // Test authentication setup if applicable
        if (config.auth && config.framework === 'nextjs') {
          it(`should have authentication setup for ${config.name}`, async () => {
            await generateProject(projectPath, config);

            expect(await fs.pathExists(path.join(projectPath, 'src/lib/auth.ts'))).toBe(true);
            expect(await fs.pathExists(path.join(projectPath, 'src/lib/auth-client.ts'))).toBe(
              true
            );
            expect(await fs.pathExists(path.join(projectPath, 'src/lib/auth-server.ts'))).toBe(
              true
            );
            expect(await fs.pathExists(path.join(projectPath, 'src/lib/roles.ts'))).toBe(true);
            expect(
              await fs.pathExists(path.join(projectPath, 'src/app/api/auth/[...all]/route.ts'))
            ).toBe(true);
            expect(await fs.pathExists(path.join(projectPath, 'middleware.ts'))).toBe(true);
          });

          it(`should have complete dashboard structure for ${config.name}`, async () => {
            await generateProject(projectPath, config);

            // Dashboard structure
            expect(await fs.pathExists(path.join(projectPath, 'src/app/(app)/layout.tsx'))).toBe(
              true
            );
            expect(await fs.pathExists(path.join(projectPath, 'src/app/(app)/page.tsx'))).toBe(
              true
            );
            expect(
              await fs.pathExists(path.join(projectPath, 'src/app/(app)/organizations/page.tsx'))
            ).toBe(true);
            expect(
              await fs.pathExists(path.join(projectPath, 'src/app/(app)/users/page.tsx'))
            ).toBe(true);
            expect(
              await fs.pathExists(path.join(projectPath, 'src/app/(app)/profile/page.tsx'))
            ).toBe(true);
            expect(await fs.pathExists(path.join(projectPath, 'src/app/login/page.tsx'))).toBe(
              true
            );

            // Dashboard components
            expect(
              await fs.pathExists(path.join(projectPath, 'src/components/dashboard/sidebar.tsx'))
            ).toBe(true);
            expect(
              await fs.pathExists(
                path.join(projectPath, 'src/components/dashboard/dashboard-header.tsx')
              )
            ).toBe(true);
            expect(
              await fs.pathExists(
                path.join(projectPath, 'src/components/dashboard/organizations-client.tsx')
              )
            ).toBe(true);
            expect(
              await fs.pathExists(
                path.join(projectPath, 'src/components/dashboard/users-client.tsx')
              )
            ).toBe(true);
            expect(
              await fs.pathExists(
                path.join(projectPath, 'src/components/dashboard/profile-form.tsx')
              )
            ).toBe(true);
          });

          it(`should have API routes for ${config.name}`, async () => {
            await generateProject(projectPath, config);

            // API routes
            expect(
              await fs.pathExists(path.join(projectPath, 'src/app/api/organizations/route.ts'))
            ).toBe(true);
            expect(
              await fs.pathExists(path.join(projectPath, 'src/app/api/organizations/[id]/route.ts'))
            ).toBe(true);
            expect(await fs.pathExists(path.join(projectPath, 'src/app/api/users/route.ts'))).toBe(
              true
            );
            expect(
              await fs.pathExists(path.join(projectPath, 'src/app/api/users/[id]/route.ts'))
            ).toBe(true);
            expect(
              await fs.pathExists(path.join(projectPath, 'src/app/api/profile/route.ts'))
            ).toBe(true);
          });

          it(`should have role-based access control for ${config.name}`, async () => {
            await generateProject(projectPath, config);

            const rolesFile = await fs.readFile(
              path.join(projectPath, 'src/lib/roles.ts'),
              'utf-8'
            );
            expect(rolesFile).toContain('ADMIN');
            expect(rolesFile).toContain('ORG_ADMIN');
            expect(rolesFile).toContain('USER');
            expect(rolesFile).toContain('管理ユーザー');
            expect(rolesFile).toContain('組織管理ユーザー');
            expect(rolesFile).toContain('一般ユーザー');

            const authServerFile = await fs.readFile(
              path.join(projectPath, 'src/lib/auth-server.ts'),
              'utf-8'
            );
            expect(authServerFile).toContain('requireSession');
            expect(authServerFile).toContain('hasRole');
            expect(authServerFile).toContain('assertRole');
            expect(authServerFile).toContain('getAccessibleOrganizationIds');
          });

          it(`should have database schema with Better Auth organization plugin for ${config.name}`, async () => {
            await generateProject(projectPath, config);

            if (config.orm === 'prisma') {
              const schema = await fs.readFile(
                path.join(projectPath, 'prisma/schema.prisma'),
                'utf-8'
              );
              expect(schema).toContain('model User');
              expect(schema).toContain('model Account');
              expect(schema).toContain('model Session');
              expect(schema).toContain('model Organization');
              expect(schema).toContain('model Member');
              expect(schema).toContain('model Invitation');
              expect(schema).toContain('role          String   @default("user")');

              const seedFile = await fs.readFile(path.join(projectPath, 'prisma/seed.ts'), 'utf-8');
              expect(seedFile).toContain('admin@example.com');
              expect(seedFile).toContain('orgadmin@example.com');
              expect(seedFile).toContain('user@example.com');
              expect(seedFile).toContain('Admin123!');
              expect(seedFile).toContain('OrgAdmin123!');
              expect(seedFile).toContain('User123!');
            }
          });

          it(`should have login page with test account auto-fill for ${config.name}`, async () => {
            await generateProject(projectPath, config);

            const loginPage = await fs.readFile(
              path.join(projectPath, 'src/app/login/page.tsx'),
              'utf-8'
            );
            expect(loginPage).toContain('TEST_ACCOUNTS');
            expect(loginPage).toContain('admin@example.com');
            expect(loginPage).toContain('orgadmin@example.com');
            expect(loginPage).toContain('user@example.com');
            expect(loginPage).toContain('Admin123!');
            expect(loginPage).toContain('OrgAdmin123!');
            expect(loginPage).toContain('User123!');
            expect(loginPage).toContain('管理ユーザー');
            expect(loginPage).toContain('組織管理ユーザー');
            expect(loginPage).toContain('一般ユーザー');
            expect(loginPage).toContain('handlePrefill');
          });

          it(`should have profile image upload integration for ${config.name}`, async () => {
            await generateProject(projectPath, config);

            expect(await fs.pathExists(path.join(projectPath, 'src/lib/profile-upload.ts'))).toBe(
              true
            );

            const profileForm = await fs.readFile(
              path.join(projectPath, 'src/components/dashboard/profile-form.tsx'),
              'utf-8'
            );
            expect(profileForm).toContain('type="file"');
            expect(profileForm).toContain('accept="image/*"');
            expect(profileForm).toContain('Avatar');
            expect(profileForm).toContain('setAvatarPreview');

            const profileApi = await fs.readFile(
              path.join(projectPath, 'src/app/api/profile/route.ts'),
              'utf-8'
            );
            expect(profileApi).toContain('saveProfileImage');
            expect(profileApi).toContain('request.formData');
            expect(profileApi).toContain('avatar');
          });
        }
      });
    }
  });

  describe('CLI Command Tests', () => {
    it('should show help when no arguments provided', async () => {
      const { stdout, stderr } = await execa('node', ['dist/cli.js'], {
        cwd: process.cwd(),
        reject: false,
      });

      const output = `${stdout}${stderr}`;

      expect(output).toContain('fluorite-flake');
      expect(output).toContain('create');
      expect(output).toMatch(/Create a new project with interactive options/i);
    });

    it('should show version', async () => {
      const { stdout } = await execa('node', ['dist/cli.js', '--version'], {
        cwd: process.cwd(),
        reject: false,
      });

      const packageJson = await fs.readJSON(path.join(process.cwd(), 'package.json'));
      expect(stdout).toContain(packageJson.version);
    });

    it('should show help for create command', async () => {
      const { stdout } = await execa('node', ['dist/cli.js', 'create', '--help'], {
        cwd: process.cwd(),
        reject: false,
      });

      expect(stdout).toContain('create');
      expect(stdout).toContain('new');
    });
  });
});

// Helper function to generate a project programmatically
async function generateProject(
  projectPath: string,
  config: {
    name: string;
    framework: string;
    database: string;
    orm: string | null;
    deployment: boolean;
    storage: 'none' | 'vercel-blob' | 'cloudflare-r2' | 'aws-s3' | 'supabase-storage';
    auth: boolean;
  }
) {
  const projectConfig = {
    projectName: path.basename(projectPath),
    projectPath,
    framework: config.framework,
    database: config.database,
    orm: config.orm,
    deployment: config.deployment,
    storage: config.storage,
    auth: config.auth,
    packageManager: 'pnpm' as const,
    mode: 'minimal' as const,
  };

  // Import the appropriate generator based on framework
  switch (config.framework) {
    case 'nextjs': {
      const { generateNextProject } = await import('../src/generators/next-generator.js');
      await generateNextProject(projectConfig);

      if (config.database !== 'none') {
        const { setupDatabase } = await import('../src/generators/database-generator.js');
        await setupDatabase(projectConfig);
      }

      if (config.storage !== 'none') {
        const { setupStorage } = await import('../src/generators/storage-generator.js');
        await setupStorage(projectConfig);
      }

      if (config.deployment) {
        const { setupDeployment } = await import('../src/generators/deployment-generator.js');
        await setupDeployment(projectConfig);
      }

      if (config.auth) {
        const { setupAuth } = await import('../src/generators/auth-generator.js');
        await setupAuth(projectConfig);
      }
      break;
    }

    case 'expo': {
      const { generateExpoProject } = await import('../src/generators/expo-generator.js');
      await generateExpoProject(projectConfig);

      // Expo supports some database configurations
      if (config.database !== 'none' && config.orm === 'drizzle') {
        // Note: Database setup for Expo might need specific handling
        // For now, we'll just create the project without additional database setup
        // setupDatabase would be called here if we implement Expo database support
      }

      if (config.storage !== 'none') {
        // Storage setup for Expo might need specific handling
      }
      break;
    }

    case 'tauri': {
      const { generateTauriProject } = await import('../src/generators/tauri-generator.js');
      await generateTauriProject(projectConfig);
      break;
    }

    case 'flutter': {
      const { generateFlutterProject } = await import('../src/generators/flutter-generator.js');
      await generateFlutterProject(projectConfig);
      break;
    }

    default:
      throw new Error(`Unsupported framework: ${config.framework}`);
  }
}
