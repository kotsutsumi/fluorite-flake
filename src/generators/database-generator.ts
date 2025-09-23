import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../commands/create.js';

export async function setupDatabase(config: ProjectConfig) {
  if (config.database === 'turso') {
    await setupTurso(config);
  } else if (config.database === 'supabase') {
    await setupSupabase(config);
  }

  // Setup ORM
  if (config.orm === 'prisma') {
    await setupPrisma(config);
  } else if (config.orm === 'drizzle') {
    await setupDrizzle(config);
  }

  // Add database scripts to package.json
  await addDatabaseScripts(config);
}

async function setupTurso(config: ProjectConfig) {
  // Create database directory
  await fs.ensureDir(path.join(config.projectPath, 'prisma'));

  // Turso environment variables
  const envContent = `
# Turso Database
TURSO_DATABASE_URL="libsql://[database-name]-[organization].turso.io"
TURSO_AUTH_TOKEN="[your-auth-token]"
DATABASE_URL="libsql://[database-name]-[organization].turso.io?authToken=[your-auth-token]"
`;

  const envPath = path.join(config.projectPath, '.env.local');
  const existingEnv = await fs.readFile(envPath, 'utf-8').catch(() => '');
  await fs.writeFile(envPath, existingEnv + envContent);

  // Turso setup script
  const setupScriptContent = `#!/usr/bin/env bash
set -e

echo "🚀 Setting up Turso database..."

# Check if turso CLI is installed
if ! command -v turso &> /dev/null; then
    echo "❌ Turso CLI not found. Please install it first:"
    echo "   curl -sSfL https://get.tur.so/install.sh | bash"
    exit 1
fi

# Login to Turso
echo "📝 Logging in to Turso..."
turso auth login

# Create database
echo "🗄️ Creating database..."
DB_NAME="${config.projectName.replace(/-/g, '_')}_db"
turso db create $DB_NAME

# Get database URL
DB_URL=$(turso db show $DB_NAME --url)
AUTH_TOKEN=$(turso db tokens create $DB_NAME)

echo "✅ Database created successfully!"
echo ""
echo "Add these to your .env.local file:"
echo "TURSO_DATABASE_URL=\\"$DB_URL\\""
echo "TURSO_AUTH_TOKEN=\\"$AUTH_TOKEN\\""
echo "DATABASE_URL=\\"$DB_URL?authToken=$AUTH_TOKEN\\""
`;

  const scriptPath = path.join(config.projectPath, 'scripts', 'setup-turso.sh');
  await fs.ensureDir(path.dirname(scriptPath));
  await fs.writeFile(scriptPath, setupScriptContent);
  await fs.chmod(scriptPath, '755');
}

async function setupSupabase(config: ProjectConfig) {
  // Create supabase directory
  await fs.ensureDir(path.join(config.projectPath, 'supabase'));

  // Supabase environment variables
  const envContent = `
# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://[project-id].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[anon-key]"
SUPABASE_SERVICE_ROLE_KEY="[service-role-key]"
DATABASE_URL="postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres"
`;

  const envPath = path.join(config.projectPath, '.env.local');
  const existingEnv = await fs.readFile(envPath, 'utf-8').catch(() => '');
  await fs.writeFile(envPath, existingEnv + envContent);

  // Supabase client
  const supabaseClientContent = `import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
`;

  await fs.writeFile(path.join(config.projectPath, 'src/lib/supabase.ts'), supabaseClientContent);

  // Supabase setup script
  const setupScriptContent = `#!/usr/bin/env bash
set -e

echo "🚀 Setting up Supabase project..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   brew install supabase/tap/supabase"
    exit 1
fi

# Login to Supabase
echo "📝 Logging in to Supabase..."
supabase login

# Initialize Supabase project
echo "🗄️ Initializing Supabase project..."
supabase init

# Start local Supabase
echo "🚀 Starting local Supabase..."
supabase start

echo "✅ Supabase setup complete!"
echo ""
echo "To create a remote project:"
echo "   supabase projects create ${config.projectName}"
echo "   supabase link --project-ref [project-id]"
`;

  const scriptPath = path.join(config.projectPath, 'scripts', 'setup-supabase.sh');
  await fs.ensureDir(path.dirname(scriptPath));
  await fs.writeFile(scriptPath, setupScriptContent);
  await fs.chmod(scriptPath, '755');
}

async function setupPrisma(config: ProjectConfig) {
  await fs.ensureDir(path.join(config.projectPath, 'prisma'));

  // Prisma schema
  let datasourceProvider = 'sqlite';
  let datasourceUrl = 'file:./dev.db';

  if (config.database === 'turso') {
    datasourceProvider = 'sqlite';
    datasourceUrl = 'env("DATABASE_URL")';
  } else if (config.database === 'supabase') {
    datasourceProvider = 'postgresql';
    datasourceUrl = 'env("DATABASE_URL")';
  }

  const schemaContent = `// This Prisma schema is tailored for Better Auth with organization support.
// Learn more: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"${config.database === 'turso' ? '\n  previewFeatures = ["driverAdapters"]' : ''}
}

generator dbml {
  provider = "prisma-dbml-generator"
  output   = "../dbml"
}

datasource db {
  provider = "${datasourceProvider}"
  url      = "${datasourceUrl}"
}

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  emailVerified Boolean  @default(false)
  name          String?
  image         String?
  role          String   @default("user")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  accounts      Account[]
  sessions      Session[]
  memberships   Member[]
}

model Account {
  id                     String   @id @default(cuid())
  userId                 String
  accountId              String
  providerId             String
  accessToken            String?
  refreshToken           String?
  idToken                String?
  accessTokenExpiresAt   DateTime?
  refreshTokenExpiresAt  DateTime?
  scope                  String?
  password               String?
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
  user                   User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([providerId, accountId])
  @@index([userId])
}

model Session {
  id           String   @id @default(cuid())
  expiresAt    DateTime
  token        String   @unique
  ipAddress    String?
  userAgent    String?
  userId       String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model Verification {
  id          String   @id @default(cuid())
  identifier  String
  value       String
  expiresAt   DateTime
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([identifier])
}

model Organization {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  logo        String?
  metadata    Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  members     Member[]
  invitations Invitation[]

  @@index([name])
}

model Member {
  id             String   @id @default(cuid())
  organizationId String
  userId         String
  role           String   @default("user")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([organizationId, userId])
  @@index([organizationId, role])
}

model Invitation {
  id             String   @id @default(cuid())
  organizationId String
  email          String
  role           String?
  status         String   @default("pending")
  expiresAt      DateTime
  inviterId      String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId, status])
}
`;

  await fs.writeFile(path.join(config.projectPath, 'prisma/schema.prisma'), schemaContent);

  // Seed file
  const seedContent = `import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  await prisma.invitation.deleteMany();
  await prisma.member.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  const [adminPassword, orgAdminPassword, userPassword, betaPassword] = await Promise.all([
    bcrypt.hash('Admin123!', 12),
    bcrypt.hash('OrgAdmin123!', 12),
    bcrypt.hash('User123!', 12),
    bcrypt.hash('BetaUser123!', 12),
  ]);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
      accounts: {
        create: {
          providerId: 'email-password',
          accountId: 'admin@example.com',
          password: adminPassword,
        },
      },
    },
  });

  const orgAdmin = await prisma.user.create({
    data: {
      email: 'orgadmin@example.com',
      name: 'Organization Admin',
      role: 'org_admin',
      accounts: {
        create: {
          providerId: 'email-password',
          accountId: 'orgadmin@example.com',
          password: orgAdminPassword,
        },
      },
    },
  });

  const standardUser = await prisma.user.create({
    data: {
      email: 'user@example.com',
      name: 'General User',
      role: 'user',
      accounts: {
        create: {
          providerId: 'email-password',
          accountId: 'user@example.com',
          password: userPassword,
        },
      },
    },
  });

  const betaUser = await prisma.user.create({
    data: {
      email: 'beta.user@example.com',
      name: 'Beta Team Member',
      role: 'user',
      accounts: {
        create: {
          providerId: 'email-password',
          accountId: 'beta.user@example.com',
          password: betaPassword,
        },
      },
    },
  });

  const acme = await prisma.organization.create({
    data: {
      name: 'Acme Incorporated',
      slug: 'acme-inc',
      metadata: { industry: 'SaaS', plan: 'enterprise' },
      members: {
        create: [
          { role: 'admin', user: { connect: { id: admin.id } } },
          { role: 'org_admin', user: { connect: { id: orgAdmin.id } } },
          { role: 'user', user: { connect: { id: standardUser.id } } },
        ],
      },
    },
  });

  const beta = await prisma.organization.create({
    data: {
      name: 'Beta Labs',
      slug: 'beta-labs',
      metadata: { industry: 'Biotech', plan: 'growth' },
      members: {
        create: [
          { role: 'org_admin', user: { connect: { id: admin.id } } },
          { role: 'user', user: { connect: { id: betaUser.id } } },
        ],
      },
    },
  });

  await prisma.invitation.create({
    data: {
      email: 'invitee@example.com',
      organizationId: acme.id,
      role: 'user',
      status: 'pending',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
      inviterId: admin.id,
    },
  });

  console.log('✅ Seed data created for Better Auth scenarios:');
  console.log('  • admin@example.com / Admin123!');
  console.log('  • orgadmin@example.com / OrgAdmin123!');
  console.log('  • user@example.com / User123!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('❌ Failed to seed database', error);
    await prisma.$disconnect();
    process.exit(1);
  });
`;

  await fs.writeFile(path.join(config.projectPath, 'prisma/seed.ts'), seedContent);

  // Database client for Turso
  if (config.database === 'turso') {
    const tursoClientContent = `import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

const libsql = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const adapter = new PrismaLibSQL(libsql);
const prisma = new PrismaClient({ adapter });

export default prisma;
`;

    await fs.writeFile(path.join(config.projectPath, 'src/lib/db.ts'), tursoClientContent);
  } else {
    const dbClientContent = `import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
`;

    await fs.writeFile(path.join(config.projectPath, 'src/lib/db.ts'), dbClientContent);
  }
}

async function setupDrizzle(config: ProjectConfig) {
  // Drizzle config
  const drizzleConfigContent = `import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: '${config.database === 'supabase' ? 'postgresql' : 'sqlite'}',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    ${config.database === 'supabase' || config.database === 'turso' ? 'url: process.env.DATABASE_URL!' : 'url: "./sqlite.db"'}
  },
});
`;

  await fs.writeFile(path.join(config.projectPath, 'drizzle.config.ts'), drizzleConfigContent);

  // Drizzle schema
  const schemaContent = `import { ${config.database === 'supabase' ? 'pgTable, serial, text, timestamp, boolean, integer' : 'sqliteTable, text, integer'}${config.database === 'turso' ? '' : ', primaryKey'} } from 'drizzle-orm/${config.database === 'supabase' ? 'pg-core' : 'sqlite-core'}';
import { relations } from 'drizzle-orm';

export const users = ${config.database === 'supabase' ? 'pgTable' : 'sqliteTable'}('users', {
  id: ${config.database === 'supabase' ? 'serial' : 'integer'}('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: ${config.database === 'supabase' ? 'timestamp' : 'integer'}('created_at', ${config.database === 'supabase' ? '' : '{ mode: "timestamp" }'}).notNull().defaultNow(),
  updatedAt: ${config.database === 'supabase' ? 'timestamp' : 'integer'}('updated_at', ${config.database === 'supabase' ? '' : '{ mode: "timestamp" }'}).notNull().defaultNow(),
});

export const posts = ${config.database === 'supabase' ? 'pgTable' : 'sqliteTable'}('posts', {
  id: ${config.database === 'supabase' ? 'serial' : 'integer'}('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content'),
  published: ${config.database === 'supabase' ? 'boolean' : 'integer'}('published', ${config.database === 'supabase' ? '' : '{ mode: "boolean" }'}).notNull().default(false),
  authorId: ${config.database === 'supabase' ? 'integer' : 'integer'}('author_id').references(() => users.id),
  createdAt: ${config.database === 'supabase' ? 'timestamp' : 'integer'}('created_at', ${config.database === 'supabase' ? '' : '{ mode: "timestamp" }'}).notNull().defaultNow(),
  updatedAt: ${config.database === 'supabase' ? 'timestamp' : 'integer'}('updated_at', ${config.database === 'supabase' ? '' : '{ mode: "timestamp" }'}).notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}));
`;

  await fs.ensureDir(path.join(config.projectPath, 'src/db'));
  await fs.writeFile(path.join(config.projectPath, 'src/db/schema.ts'), schemaContent);

  // Seed script
  const drizzleSeedContent = `import { db } from './index';
import { users, posts } from './schema';

async function seed() {
  await db.delete(posts);
  await db.delete(users);

  await db.insert(users).values([
    {
      id: 1,
      email: 'alice@example.com',
      name: 'Alice',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      email: 'bob@example.com',
      name: 'Bob',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  await db.insert(posts).values([
    {
      id: 1,
      title: 'Hello World',
      content: 'This is my first post',
      published: true,
      authorId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      title: 'Second Post',
      content: 'This is my second post',
      published: false,
      authorId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 3,
      title: 'My Journey',
      content: 'Started learning Next.js today',
      published: true,
      authorId: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
}

seed()
  .then(() => {
    console.log('✅ Seed data created');
  })
  .catch((error) => {
    console.error('❌ Failed to seed database', error);
    process.exit(1);
  });
`;

  await fs.writeFile(path.join(config.projectPath, 'src/db/seed.ts'), drizzleSeedContent);

  // Drizzle client
  let drizzleClientContent = '';

  if (config.database === 'turso') {
    drizzleClientContent = `import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export const db = drizzle(client, { schema });
`;
  } else if (config.database === 'supabase') {
    drizzleClientContent = `import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);

export const db = drizzle(client, { schema });
`;
  }

  await fs.writeFile(path.join(config.projectPath, 'src/db/index.ts'), drizzleClientContent);
}

async function addDatabaseScripts(config: ProjectConfig) {
  const packageJsonPath = path.join(config.projectPath, 'package.json');
  const packageJson = await fs.readJSON(packageJsonPath);

  const dbScripts: Record<string, string> = {};

  if (config.orm === 'prisma') {
    dbScripts['db:generate'] = 'prisma generate';
    dbScripts['db:push'] = 'prisma db push';
    dbScripts['db:migrate'] = 'prisma migrate dev';
    dbScripts['db:migrate:prod'] = 'prisma migrate deploy';
    dbScripts['db:seed'] = 'tsx prisma/seed.ts';
    dbScripts['db:studio'] = 'prisma studio';
    dbScripts['db:reset'] = 'prisma migrate reset';
    dbScripts['db:dbml'] = 'prisma-dbml-generator generate';
  } else if (config.orm === 'drizzle') {
    dbScripts['db:generate'] = 'drizzle-kit generate';
    dbScripts['db:push'] = 'drizzle-kit push';
    dbScripts['db:migrate'] = 'drizzle-kit migrate';
    dbScripts['db:studio'] = 'drizzle-kit studio';
    dbScripts['db:seed'] = 'tsx src/db/seed.ts';
  }

  packageJson.scripts = {
    ...packageJson.scripts,
    ...dbScripts,
  };

  await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
}
