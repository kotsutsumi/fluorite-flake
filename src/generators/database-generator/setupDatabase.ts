// @ts-nocheck
import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../commands/create/types.js';
import { readTemplate, readTemplateWithReplacements } from '../../utils/template-reader.js';
import { addPostInstallScript } from './addPostInstallScript.js';

// シンプルなロガーの代替実装
const _logger = {
    info: (message: string, meta?: unknown) => console.log(`[INFO] ${message}`, meta || ''),
    warn: (message: string, meta?: unknown) => console.warn(`[WARN] ${message}`, meta || ''),
    debug: (message: string, meta?: unknown) => console.debug(`[DEBUG] ${message}`, meta || ''),
    error: (message: string, meta?: unknown) => console.error(`[ERROR] ${message}`, meta || ''),
};

/**
 * データベース設定を行うメイン関数
 * 指定されたデータベースとORMに応じて設定ファイルやサンプルコードを生成
 * @param config プロジェクト設定
 */
export async function setupDatabase(config: ProjectConfig) {
    // データベースが指定されていない場合はスキップ
    if (config.database === 'none') {
        return;
    }

    // データベース種別に応じたセットアップ
    switch (config.database) {
        case 'turso':
            await setupTurso(config);
            break;
        case 'supabase':
            await setupSupabase(config);
            break;
        default:
            throw new Error(`未知のデータベース: ${config.database}`);
    }

    // ORMに応じたセットアップ
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

    // サンプルAPIルートとデモコンポーネントの作成
    await createSampleApiRoute(config);
    await createDatabaseDemoComponent(config);

    // Prismaを使用する場合はpostinstallスクリプトを追加
    if (config.orm === 'prisma') {
        await addPostInstallScript(config);
    }
}

/**
 * Tursoデータベースの設定を行う
 * 環境変数テンプレート、セットアップスクリプト、パッケージスクリプトを作成
 * @param config プロジェクト設定
 */
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

    const initScriptContent = `#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(pwd)"
FLAG_FILE="$PROJECT_ROOT/.fluorite-db-ready"
DATABASE_URL="\${DATABASE_URL:-file:./prisma/dev.db}"

if [ -f "$FLAG_FILE" ] && [ "\${FORCE_DB_INIT:-0}" != "1" ]; then
  if [ -f "$PROJECT_ROOT/prisma/dev.db" ]; then
    echo "⏭️  Database already initialized."
    exit 0
  fi
fi

rm -f "$FLAG_FILE"

echo "🚀 Initializing Turso database..."

if pnpm exec prisma generate; then
  echo "  ✅ Prisma client generated"
else
  echo "  ⚠️  Prisma client generation failed"
fi

if pnpm exec prisma db push --force-reset --skip-generate; then
  echo "  ✅ Schema pushed to database"
else
  echo "  ⚠️  Schema push failed"
fi

if pnpm exec prisma db seed >/dev/null 2>&1; then
  echo "  ✅ Database seeded"
else
  echo "  ℹ️  No seed script or seeding skipped"
fi

touch "$FLAG_FILE"
`;
    const initScriptPath = path.join(scriptsDir, 'init-turso.sh');
    await fs.writeFile(initScriptPath, initScriptContent);
    await fs.chmod(initScriptPath, '755');

    const devBootstrapContent = `#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

bash "$SCRIPT_DIR/init-turso.sh"

pnpm run dev "$@"
`;
    const devBootstrapPath = path.join(scriptsDir, 'dev-bootstrap.sh');
    await fs.writeFile(devBootstrapPath, devBootstrapContent);
    await fs.chmod(devBootstrapPath, '755');

    const packageJsonPath = path.join(config.projectPath, 'package.json');
    const packageJson = await fs.readJSON(packageJsonPath);
    packageJson.scripts = {
        ...packageJson.scripts,
        'setup:db': 'bash scripts/setup-turso.sh',
        'setup:db:local': 'bash scripts/setup-turso.sh --local',
        'setup:db:cloud': 'bash scripts/setup-turso.sh --cloud',
        'dev:bootstrap': 'bash scripts/dev-bootstrap.sh',
    };
    await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });

    // Turso CLIの可用性を確認してガイダンスを提供
    // TODO: CLIアダプターが修正されたら有効化
    // await checkTursoAvailability(config);
}

/**
 * Supabaseデータベースの設定を行う
 * 環境変数テンプレート、クライアントライブラリ、セットアップスクリプトを作成
 * @param config プロジェクト設定
 */
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

    // Supabase CLIの可用性を確認してガイダンスを提供
    // TODO: CLIアダプターが修正されたら有効化
    // await checkSupabaseAvailability(config);
}

/**
 * Prisma ORMの設定を行う
 * スキーマファイル、シードファイル、データベースクライアント、スクリプトを作成
 * @param config プロジェクト設定
 */
async function setupPrisma(config: ProjectConfig) {
    const prismaDir = path.join(config.projectPath, 'prisma');
    await fs.ensureDir(prismaDir);

    const packageJsonPath = path.join(config.projectPath, 'package.json');
    const packageJson = await fs.readJSON(packageJsonPath);

    // 認証機能が有効な場合のメンバーシップフィールド
    const authMemberships = config.auth ? '\n  memberships   Member[]' : '';
    // 認証機能が有効な場合の追加モデル定義
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
  // 組織とメンバーシップを作成
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

  // メンバーシップを作成
  await prisma.member.createMany({
    data: [
      { userId: alice.id, organizationId: techCorp.id, role: 'owner' },
      { userId: bob.id, organizationId: techCorp.id, role: 'member' },
      { userId: bob.id, organizationId: startupInc.id, role: 'owner' },
      { userId: charlie.id, organizationId: startupInc.id, role: 'member' },
    ],
  });

  // 招待を作成
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

    // Note: Removed deprecated packageJson.prisma config. Seed command is now in scripts.db:seed

    await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });

    if (packageJson.packageManager?.startsWith('pnpm')) {
        const npmrcContent = await readTemplate('database/lib/npmrc.txt.template');
        await fs.writeFile(path.join(config.projectPath, '.npmrc'), npmrcContent);
    }
}

/**
 * Drizzle ORMの設定を行う
 * 設定ファイル、スキーマ、クライアント、シードファイル、スクリプトを作成
 * @param config プロジェクト設定
 */
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

    const drizzleLibDir = path.join(config.projectPath, 'src/lib');
    await fs.ensureDir(drizzleLibDir);
    const drizzleLibContent = `export { db } from '../db/index';
export * as schema from '../db/schema';
`;
    await fs.writeFile(path.join(drizzleLibDir, 'db.ts'), drizzleLibContent);

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

/**
 * サンプルAPIルートを作成する
 * 選択されたORMに応じてデータベース操作のAPIエンドポイントを生成
 * @param config プロジェクト設定
 */
async function createSampleApiRoute(config: ProjectConfig) {
    // ORMが指定されていない場合はスキップ
    if (!config.orm) {
        return;
    }

    const apiRouteContent = await readTemplateWithReplacements(
        'database/api/api-route.ts.template',
        {
            orm: config.orm,
        }
    );

    // Next.js 13+ app directory構造を使用（srcディレクトリ含む）
    const apiDir = path.join(config.projectPath, 'src/app/api/posts');
    await fs.ensureDir(apiDir);
    await fs.writeFile(path.join(apiDir, 'route.ts'), apiRouteContent);
}

/**
 * データベース操作のデモコンポーネントを作成する
 * フロントエンドでデータベースの動作を確認できるコンポーネントを生成
 * @param config プロジェクト設定
 */
async function createDatabaseDemoComponent(config: ProjectConfig) {
    // ORMが指定されていない場合はスキップ
    if (!config.orm) {
        return;
    }

    // モノレポの場合はdatabase-demoコンポーネントの生成をスキップ
    // (モノレポではbackendとfrontendが分離されているため)
    if ('isMonorepo' in config && config.isMonorepo) {
        return;
    }

    const databaseDescription = getDatabaseDescription(config);
    const demoComponentContent = await readTemplateWithReplacements(
        'database/components/demo-component.tsx.template',
        {
            databaseDescription,
        }
    );
    const componentsDir = path.join(config.projectPath, 'src/components');
    await fs.ensureDir(componentsDir);
    await fs.writeFile(path.join(componentsDir, 'database-demo.tsx'), demoComponentContent);
}

function getDatabaseDescription(config: ProjectConfig): string {
    // データベースと ORM の組み合わせに応じてダッシュボードの説明文を生成する
    if (config.database === 'turso') {
        if (config.orm === 'prisma') {
            return 'Turso と Prisma の組み合わせで、エッジ最適化された SQLite データベースに安全に接続しています。';
        }
        if (config.orm === 'drizzle') {
            return 'Turso (libSQL) と Drizzle ORM を利用し、軽量でスケーラブルなデータアクセス層を提供します。';
        }
        return 'Turso に接続されたデータベース構成が初期化されています。';
    }
    if (config.database === 'supabase') {
        if (config.orm === 'prisma') {
            return 'Supabase と Prisma を活用した PostgreSQL 互換のデータベース接続が有効になっています。';
        }
        if (config.orm === 'drizzle') {
            return 'Supabase と Drizzle ORM を用いて、PostgreSQL ベースの API を型安全に扱えるよう構成しています。';
        }
        return 'Supabase に接続されたデータベース構成が初期化されています。';
    }
    return 'データベース接続がセットアップされ、API ルートから利用可能な状態です。';
}

const ENV_TARGET_FILES = [
    '.env',
    '.env.local',
    '.env.development',
    '.env.staging',
    '.env.production',
    '.env.prod',
];

/**
 * 環境変数ファイルにコンテンツを追加する
 * Next.jsの場合は存在するすべての環境ファイルに追加、その他は.env.localに追加
 * @param config プロジェクト設定
 * @param content 追加するコンテンツ
 */
async function appendEnvLocal(config: ProjectConfig, content: string) {
    // Next.jsの場合、存在するすべての環境ファイルに追加
    if (config.framework === 'nextjs') {
        for (const file of ENV_TARGET_FILES) {
            const envPath = path.join(config.projectPath, file);
            // ファイルが存在する場合のみ追加
            if (await fs.pathExists(envPath)) {
                await fs.appendFile(envPath, `\n${content}`);
            }
        }
    } else {
        // その他のフレームワークは元の動作を維持 - 必要に応じて.env.localを作成
        const envPath = path.join(config.projectPath, '.env.local');
        await fs.appendFile(envPath, content);
    }
}
