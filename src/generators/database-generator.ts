import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../commands/create/types.js';
import { readTemplate, readTemplateWithReplacements } from '../utils/template-reader.js';

export async function setupDatabase(config: ProjectConfig) {
    if (config.database === 'none') {
        return;
    }

    switch (config.database) {
        case 'turso':
            await setupTurso(config);
            break;
        case 'supabase':
            await setupSupabase(config);
            break;
        default:
            throw new Error(`Unknown database: ${config.database}`);
    }

    switch (config.orm) {
        case 'prisma':
            await setupPrisma(config);
            break;
        case 'drizzle':
            await setupDrizzle(config);
            break;
        default:
            break;
    }

    await createSampleApiRoute(config);
    await createDatabaseDemoComponent(config);

    if (config.orm === 'prisma') {
        await addPostInstallScript(config);
    }
}

async function setupTurso(config: ProjectConfig) {
    const envContent = await readTemplate('database/env/turso-env.txt.template');
    await appendEnvLocal(config, envContent);

    const setupScriptContent = await readTemplateWithReplacements(
        'database/scripts/setup-turso.sh.template',
        {
            projectName: config.projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            packageManager: config.packageManager,
        }
    );

    const scriptsDir = path.join(config.projectPath, 'scripts');
    await fs.ensureDir(scriptsDir);
    await fs.writeFile(path.join(scriptsDir, 'setup-turso.sh'), setupScriptContent);
    await fs.chmod(path.join(scriptsDir, 'setup-turso.sh'), '755');

    const packageJsonPath = path.join(config.projectPath, 'package.json');
    const packageJson = await fs.readJSON(packageJsonPath);
    packageJson.scripts = {
        ...packageJson.scripts,
        'setup:db': 'bash scripts/setup-turso.sh',
        'setup:db:local': 'bash scripts/setup-turso.sh --local',
        'setup:db:cloud': 'bash scripts/setup-turso.sh --cloud',
    };
    await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
}

async function setupSupabase(config: ProjectConfig) {
    const envContent = await readTemplate('database/env/supabase-env.txt.template');
    await appendEnvLocal(config, envContent);

    const supabaseClientContent = await readTemplate('database/lib/supabase-client.ts.template');
    const libDir = path.join(config.projectPath, 'src/lib');
    await fs.ensureDir(libDir);
    await fs.writeFile(path.join(libDir, 'supabase.ts'), supabaseClientContent);

    const setupScriptContent = await readTemplateWithReplacements(
        'database/scripts/setup-supabase.sh.template',
        {
            projectName: config.projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            packageManager: config.packageManager,
        }
    );

    const scriptsDir = path.join(config.projectPath, 'scripts');
    await fs.ensureDir(scriptsDir);
    await fs.writeFile(path.join(scriptsDir, 'setup-supabase.sh'), setupScriptContent);
    await fs.chmod(path.join(scriptsDir, 'setup-supabase.sh'), '755');

    const packageJsonPath = path.join(config.projectPath, 'package.json');
    const packageJson = await fs.readJSON(packageJsonPath);
    packageJson.scripts = {
        ...packageJson.scripts,
        'setup:db': 'bash scripts/setup-supabase.sh',
        'setup:db:local': 'bash scripts/setup-supabase.sh --local',
        'setup:db:cloud': 'bash scripts/setup-supabase.sh --cloud',
        supabase: 'supabase',
    };
    await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
}

async function setupPrisma(config: ProjectConfig) {
    const prismaDir = path.join(config.projectPath, 'prisma');
    await fs.ensureDir(prismaDir);

    const packageJsonPath = path.join(config.projectPath, 'package.json');
    const packageJson = await fs.readJSON(packageJsonPath);

    const authMemberships = config.auth ? '\n  memberships   Member[]' : '';
    const authModels = config.auth
        ? `model Organization {
  id         String       @id @default(cuid())
  name       String
  slug       String       @unique
  metadata   String?      // JSON stored as string for SQLite compatibility
  createdAt  DateTime     @default(now())
  members    Member[]
  invitations Invitation[]
}

model Member {
  id             String       @id @default(cuid())
  userId         String
  organizationId String
  role           String
  createdAt      DateTime     @default(now())
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([userId, organizationId])
  @@index([userId])
  @@index([organizationId])
}

model Invitation {
  id             String       @id @default(cuid())
  email          String
  role           String
  status         String       @default("pending")
  organizationId String
  invitedBy      String?
  expiresAt      DateTime
  createdAt      DateTime     @default(now())
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([email])
  @@index([organizationId])
}`
        : '';

    const schemaContent = await readTemplateWithReplacements(
        'database/prisma/schema.prisma.template',
        {
            provider: config.database === 'turso' ? 'sqlite' : 'postgresql',
            dialect: config.database === 'turso' ? 'sqlite' : 'postgresql',
            auth: config.auth ? 'true' : '',
            isTurso: config.database === 'turso' ? 'true' : '',
            datasourceProvider: config.database === 'turso' ? 'sqlite' : 'postgresql',
            datasourceUrl:
                config.database === 'turso' ? 'env("DATABASE_URL")' : 'env("DATABASE_URL")',
            authMemberships,
            authModels,
        }
    );

    await fs.writeFile(path.join(prismaDir, 'schema.prisma'), schemaContent);

    const seedContent = await readTemplateWithReplacements('database/prisma/seed.ts.template', {
        auth: config.auth ? 'true' : '',
        authImport: config.auth ? "\nimport bcrypt from 'bcryptjs';" : '',
        authCleanup: config.auth
            ? '    await prisma.invitation.deleteMany();\n    await prisma.member.deleteMany();\n    await prisma.organization.deleteMany();\n'
            : '',
        authPassword: config.auth
            ? "\n  const hashedPassword = await bcrypt.hash('Demo123!', 12);\n"
            : '',
        authAccountAlice: config.auth
            ? `\n      accounts: {
        create: {
          providerId: 'credential',
          accountId: 'alice@example.com',
          password: hashedPassword,
        },
      },`
            : '',
        authAccountBob: config.auth
            ? `\n      accounts: {
        create: {
          providerId: 'credential',
          accountId: 'bob@example.com',
          password: hashedPassword,
        },
      },`
            : '',
        authAccountCharlie: config.auth
            ? `\n      accounts: {
        create: {
          providerId: 'credential',
          accountId: 'charlie@example.com',
          password: hashedPassword,
        },
      },`
            : '',
        authOrganizations: config.auth
            ? `
  // Create organizations and memberships
  const techCorp = await prisma.organization.create({
    data: {
      name: 'Tech Corp',
      slug: 'tech-corp',
      metadata: JSON.stringify({ industry: 'Technology' }),
    },
  });

  const startupInc = await prisma.organization.create({
    data: {
      name: 'Startup Inc',
      slug: 'startup-inc',
      metadata: JSON.stringify({ industry: 'Software' }),
    },
  });

  // Create memberships
  await prisma.member.createMany({
    data: [
      { userId: alice.id, organizationId: techCorp.id, role: 'owner' },
      { userId: bob.id, organizationId: techCorp.id, role: 'member' },
      { userId: bob.id, organizationId: startupInc.id, role: 'owner' },
      { userId: charlie.id, organizationId: startupInc.id, role: 'member' },
    ],
  });

  // Create an invitation
  await prisma.invitation.create({
    data: {
      email: 'dave@example.com',
      role: 'member',
      organizationId: techCorp.id,
      invitedBy: alice.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    },
  });`
            : '',
        authLogs: config.auth
            ? `\n  console.log('   - 2 organizations');\n  console.log('   - 4 memberships');\n  console.log('   - 1 invitation');\n  console.log('');\n  console.log('🔐 Login credentials:');\n  console.log('   - alice@example.com / Demo123! (owner of Tech Corp)');\n  console.log('   - bob@example.com / Demo123! (member of Tech Corp, owner of Startup Inc)');\n  console.log('   - charlie@example.com / Demo123! (member of Startup Inc)');`
            : '',
    });
    await fs.writeFile(path.join(prismaDir, 'seed.ts'), seedContent);

    if (config.database === 'turso') {
        const tursoClientContent = await readTemplate('database/lib/turso-client.ts.template');
        const libDir = path.join(config.projectPath, 'src/lib');
        await fs.ensureDir(libDir);
        await fs.writeFile(path.join(libDir, 'db.ts'), tursoClientContent);
    } else {
        const dbClientContent = await readTemplate('database/lib/db-client.ts.template');
        const libDir = path.join(config.projectPath, 'src/lib');
        await fs.ensureDir(libDir);
        await fs.writeFile(path.join(libDir, 'db.ts'), dbClientContent);
    }

    packageJson.scripts = {
        ...packageJson.scripts,
        'db:push': 'prisma db push',
        'db:push:force': 'prisma db push --force-reset --skip-generate',
        'db:studio': 'prisma studio',
        'db:generate': 'prisma generate',
        'db:migrate': 'prisma migrate dev',
        'db:migrate:prod': 'prisma migrate deploy',
        'db:seed':
            config.packageManager === 'bun' ? 'bun run prisma/seed.ts' : 'tsx prisma/seed.ts',
        'db:reset':
            config.packageManager === 'bun'
                ? 'prisma db push --force-reset && bun run prisma/seed.ts'
                : 'prisma db push --force-reset && tsx prisma/seed.ts',
    };

    packageJson.prisma = {
        seed: config.packageManager === 'bun' ? 'bun run prisma/seed.ts' : 'tsx prisma/seed.ts',
    };

    await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });

    if (packageJson.packageManager?.startsWith('pnpm')) {
        const npmrcContent = await readTemplate('database/lib/npmrc.txt.template');
        await fs.writeFile(path.join(config.projectPath, '.npmrc'), npmrcContent);
    }
}

async function setupDrizzle(config: ProjectConfig) {
    const drizzleDir = path.join(config.projectPath, 'drizzle');
    await fs.ensureDir(drizzleDir);

    const drizzleConfigContent = await readTemplateWithReplacements(
        'database/drizzle/config.ts.template',
        {
            provider: config.database === 'turso' ? 'turso' : 'pg',
            dialect: config.database === 'turso' ? 'sqlite' : 'postgresql',
            isTurso: config.database === 'turso' ? 'true' : '',
        }
    );

    await fs.writeFile(path.join(config.projectPath, 'drizzle.config.ts'), drizzleConfigContent);

    const isTurso = config.database === 'turso';
    const dbDir = path.join(config.projectPath, 'src/db');
    await fs.ensureDir(dbDir);

    if (isTurso) {
        const schemaContent = await readTemplate('database/drizzle/schema-sqlite.ts.template');
        await fs.writeFile(path.join(dbDir, 'schema.ts'), schemaContent);

        const clientContent = await readTemplate('database/drizzle/client-turso.ts.template');
        await fs.writeFile(path.join(dbDir, 'index.ts'), clientContent);
    } else {
        const schemaContent = await readTemplate('database/drizzle/schema-postgresql.ts.template');
        await fs.writeFile(path.join(dbDir, 'schema.ts'), schemaContent);

        const clientContent = await readTemplate('database/drizzle/client-supabase.ts.template');
        await fs.writeFile(path.join(dbDir, 'index.ts'), clientContent);
    }

    const seedContent = await readTemplate('database/drizzle/seed.ts.template');
    await fs.writeFile(path.join(dbDir, 'seed.ts'), seedContent);

    const migrationScriptContent = await readTemplateWithReplacements(
        'database/scripts/migration-script.sh.template',
        {
            packageManager: config.packageManager,
        }
    );

    const scriptsDir = path.join(config.projectPath, 'scripts');
    await fs.ensureDir(scriptsDir);
    await fs.writeFile(path.join(scriptsDir, 'run-migrations.sh'), migrationScriptContent);
    await fs.chmod(path.join(scriptsDir, 'run-migrations.sh'), '755');

    const packageJsonPath = path.join(config.projectPath, 'package.json');
    const packageJson = await fs.readJSON(packageJsonPath);
    packageJson.scripts = {
        ...packageJson.scripts,
        'db:generate': 'drizzle-kit generate',
        'db:migrate': 'drizzle-kit migrate',
        'db:push': 'drizzle-kit push',
        'db:studio': 'drizzle-kit studio',
        'db:seed':
            config.packageManager === 'bun' ? 'bun run src/db/seed.ts' : 'tsx src/db/seed.ts',
    };
    await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
}

async function createSampleApiRoute(config: ProjectConfig) {
    if (!config.orm) {
        return;
    }

    const apiRouteContent = await readTemplateWithReplacements(
        'database/api/api-route.ts.template',
        {
            orm: config.orm,
        }
    );

    const apiDir = path.join(config.projectPath, 'src/app/api/posts');
    await fs.ensureDir(apiDir);
    await fs.writeFile(path.join(apiDir, 'route.ts'), apiRouteContent);
}

async function createDatabaseDemoComponent(config: ProjectConfig) {
    if (!config.orm) {
        return;
    }

    const demoComponentContent = await readTemplate(
        'database/components/demo-component.tsx.template'
    );
    const componentsDir = path.join(config.projectPath, 'src/components');
    await fs.ensureDir(componentsDir);
    await fs.writeFile(path.join(componentsDir, 'database-demo.tsx'), demoComponentContent);
}

async function appendEnvLocal(config: ProjectConfig, content: string) {
    const envPath = path.join(config.projectPath, '.env.local');
    await fs.appendFile(envPath, content);
}

export async function addPostInstallScript(config: ProjectConfig) {
    if (config.orm !== 'prisma') {
        return;
    }

    const packageJsonPath = path.join(config.projectPath, 'package.json');
    const packageJson = await fs.readJSON(packageJsonPath);

    const postinstallScript = 'prisma generate';
    if (!packageJson.scripts.postinstall) {
        packageJson.scripts.postinstall = postinstallScript;
    } else if (!packageJson.scripts.postinstall.includes('prisma generate')) {
        packageJson.scripts.postinstall = `${postinstallScript} && ${packageJson.scripts.postinstall}`;
    }

    await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
}

export async function createInitScript(config: ProjectConfig) {
    if (config.database !== 'turso') {
        return;
    }

    const initScriptContent = await readTemplateWithReplacements(
        'database/scripts/init-script.sh.template',
        {
            projectName: config.projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            packageManager: config.packageManager,
            orm: config.orm || 'none',
        }
    );

    const scriptsDir = path.join(config.projectPath, 'scripts');
    await fs.ensureDir(scriptsDir);
    await fs.writeFile(path.join(scriptsDir, 'init-db.sh'), initScriptContent);
    await fs.chmod(path.join(scriptsDir, 'init-db.sh'), '755');

    const packageJsonPath = path.join(config.projectPath, 'package.json');
    const packageJson = await fs.readJSON(packageJsonPath);
    packageJson.scripts = {
        ...packageJson.scripts,
        'init:db': 'bash scripts/init-db.sh',
        'init:db:local': 'bash scripts/init-db.sh --local',
        'init:db:cloud': 'bash scripts/init-db.sh --cloud',
    };
    await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
}

export async function createDevelopmentBootstrapScript(config: ProjectConfig) {
    if (config.database === 'none' || !config.orm) {
        return;
    }

    const devBootstrapContent = await readTemplateWithReplacements(
        'database/scripts/dev-bootstrap.sh.template',
        {
            packageManager: config.packageManager,
            orm: config.orm,
            database: config.database,
        }
    );

    const devBootstrapPath = path.join(config.projectPath, 'dev-bootstrap.js');
    await fs.writeFile(devBootstrapPath, devBootstrapContent);
}
