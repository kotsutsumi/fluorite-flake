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
    await setupPrismaWithPost(config);
  } else if (config.orm === 'drizzle') {
    await setupDrizzleWithPost(config);
  }

  // Add database scripts to package.json
  await addDatabaseScripts(config);

  // Create API routes and UI for database demo
  if (config.framework === 'nextjs' && config.database !== 'none') {
    await createDatabaseDemoUI(config);
  }

  // Add post-install script for Turso database initialization
  if (config.database === 'turso' && config.orm === 'prisma') {
    await addPostInstallScript(config);
  }
}

async function setupTurso(config: ProjectConfig) {
  // Create database directory
  await fs.ensureDir(path.join(config.projectPath, 'prisma'));

  // Set up local Turso database with automatic configuration
  const localDbPath = path.join('prisma', 'dev.db');

  // Create comprehensive environment variables for local and cloud
  const envContent = `
# Turso Database - Local Development
TURSO_DATABASE_URL="file:${localDbPath}"
TURSO_AUTH_TOKEN=""
DATABASE_URL="file:${localDbPath}"

# Turso Cloud - Production/Staging/Development
# These will be automatically set during deployment
# Run 'pnpm run setup:turso:cloud' to create cloud databases
`;

  // Write to .env for Prisma CLI compatibility
  const envPath = path.join(config.projectPath, '.env');
  const existingEnv = await fs.readFile(envPath, 'utf-8').catch(() => '');
  await fs.writeFile(envPath, existingEnv + envContent);

  // Also write to .env.local for Next.js
  const envLocalPath = path.join(config.projectPath, '.env.local');
  const existingEnvLocal = await fs.readFile(envLocalPath, 'utf-8').catch(() => '');
  await fs.writeFile(envLocalPath, existingEnvLocal + envContent);

  // Create comprehensive Turso setup script for local and cloud
  const setupScriptContent = `#!/usr/bin/env bash
set -e

PROJECT_NAME="${config.projectName}"
PROJECT_NAME_CLEAN=$(echo "$PROJECT_NAME" | tr '-' '_')

echo "🚀 Setting up Turso database for $PROJECT_NAME..."

# Function to check if logged in to Turso
check_turso_auth() {
    if ! turso auth status &>/dev/null; then
        echo "📝 Logging in to Turso..."
        turso auth login
    else
        echo "✅ Already logged in to Turso"
    fi
}

# Function to create Turso Cloud database
create_turso_db() {
    local env=$1
    local db_name="\${PROJECT_NAME_CLEAN}_\${env}"

    echo "🗄️ Creating Turso Cloud database: $db_name..."

    # Check if database already exists
    if turso db show "$db_name" &>/dev/null; then
        echo "   Database $db_name already exists, skipping..."
        # Still get the URL and token
        DB_URL=$(turso db show "$db_name" --url)
        AUTH_TOKEN=$(turso db tokens create "$db_name")
    else
        # Create database
        turso db create "$db_name" --group default
        echo "   ✅ Database $db_name created"

        # Get database URL and create token
        DB_URL=$(turso db show "$db_name" --url)
        AUTH_TOKEN=$(turso db tokens create "$db_name")
    fi

    # Save to environment file
    echo "" >> .env.\${env,,}
    echo "# Turso Database - \${env^^} Environment" >> .env.\${env,,}
    echo "TURSO_DATABASE_URL=\"$DB_URL\"" >> .env.\${env,,}
    echo "TURSO_AUTH_TOKEN=\"$AUTH_TOKEN\"" >> .env.\${env,,}
    echo "DATABASE_URL=\"$DB_URL?authToken=$AUTH_TOKEN\"" >> .env.\${env,,}

    echo "   ✅ Environment variables saved to .env.\${env,,}"

    # Apply schema to cloud database
    echo "   📋 Applying schema to $db_name..."
    DATABASE_URL="$DB_URL?authToken=$AUTH_TOKEN" ${config.packageManager} run db:push
    echo "   ✅ Schema applied"
}

# Setup local database
echo "📁 Setting up local development database..."
mkdir -p prisma
touch prisma/dev.db
echo "✅ Local database created at prisma/dev.db"

# Run initial setup
echo "🔧 Running initial database setup..."
${config.packageManager} run db:generate || echo "Will complete after install"
${config.packageManager} run db:push || echo "Will complete after install"
${config.packageManager} run db:seed || echo "Will complete after install"

# Check if we should set up cloud databases
if [[ "$1" == "--cloud" ]]; then
    # Check if turso CLI is installed
    if ! command -v turso &> /dev/null; then
        echo "⚠️ Turso CLI not found. Installing..."
        curl -sSfL https://get.tur.so/install.sh | bash
        export PATH="$HOME/.turso:$PATH"
    fi

    check_turso_auth

    # Create databases for each environment
    echo ""
    echo "🌐 Setting up Turso Cloud databases..."

    # Create environment files
    touch .env.production
    touch .env.staging
    touch .env.development

    # Create databases
    create_turso_db "prod"
    create_turso_db "stg"
    create_turso_db "dev"

    echo ""
    echo "✅ All Turso Cloud databases created!"
    echo ""
    echo "📝 Database URLs have been saved to:"
    echo "   - .env.production"
    echo "   - .env.staging"
    echo "   - .env.development"
fi

echo ""
echo "✅ Turso setup complete!"
echo ""
echo "📚 Next steps:"
echo "   1. Run '${config.packageManager} run dev' to start development server"
echo "   2. Visit http://localhost:3000 to see the database demo"
echo "   3. Run '${config.packageManager} run setup:turso:cloud' to set up cloud databases"
echo "   4. Run '${config.packageManager} run deploy' to deploy to Vercel"
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

  // Write to .env for Prisma CLI compatibility
  const envPath = path.join(config.projectPath, '.env');
  const existingEnv = await fs.readFile(envPath, 'utf-8').catch(() => '');
  await fs.writeFile(envPath, existingEnv + envContent);

  // Also write to .env.local for Next.js
  const envLocalPath = path.join(config.projectPath, '.env.local');
  const existingEnvLocal = await fs.readFile(envLocalPath, 'utf-8').catch(() => '');
  await fs.writeFile(envLocalPath, existingEnvLocal + envContent);

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

async function setupPrismaWithPost(config: ProjectConfig) {
  await fs.ensureDir(path.join(config.projectPath, 'prisma'));

  // Prisma schema with Post model
  let datasourceProvider = 'sqlite';
  let datasourceUrl = '"file:./dev.db"';

  if (config.database === 'turso') {
    datasourceProvider = 'sqlite';
    datasourceUrl = 'env("DATABASE_URL")';
  } else if (config.database === 'supabase') {
    datasourceProvider = 'postgresql';
    datasourceUrl = 'env("DATABASE_URL")';
  }

  const schemaContent = `// Prisma schema with Post model for demonstration

generator client {
  provider = "prisma-client-js"${config.database === 'turso' ? '\n  previewFeatures = ["driverAdapters"]' : ''}
}

datasource db {
  provider = "${datasourceProvider}"
  url      = ${datasourceUrl}
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
  posts         Post[]
  accounts      Account[]
  sessions      Session[]${config.auth ? '\n  memberships   Member[]' : ''}
}

model Post {
  id          String   @id @default(cuid())
  title       String
  content     String?
  published   Boolean  @default(false)
  authorId    String
  author      User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([authorId])
  @@index([published])
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
}${
    config.auth
      ? `

model Organization {
  id         String       @id @default(cuid())
  name       String
  slug       String       @unique
  metadata   Json?
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
      : ''
  }
`;

  await fs.writeFile(path.join(config.projectPath, 'prisma/schema.prisma'), schemaContent);

  // Enhanced seed file with Posts
  const seedContent = `import { PrismaClient } from '@prisma/client';
${config.auth ? "import bcrypt from 'bcryptjs';" : ''}

const prisma = new PrismaClient();

async function main() {
  // Clean up existing data (handle empty database gracefully)
  try {
    await prisma.post.deleteMany();${
      config.auth
        ? `
    await prisma.invitation.deleteMany();
    await prisma.member.deleteMany();
    await prisma.organization.deleteMany();`
        : ''
    }
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
  } catch (error) {
    // Ignore errors during cleanup (tables might not exist yet)
    console.log('Database cleanup skipped (fresh database)');
  }

  ${
    config.auth
      ? `
  const hashedPassword = await bcrypt.hash('Demo123!', 12);
  `
      : ''
  }

  // Create demo users
  const alice = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      name: 'Alice Johnson',
      emailVerified: true,
      ${
        config.auth
          ? `
      accounts: {
        create: {
          providerId: 'email-password',
          accountId: 'alice@example.com',
          password: hashedPassword,
        },
      },
      `
          : ''
      }
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      name: 'Bob Smith',
      emailVerified: true,
      ${
        config.auth
          ? `
      accounts: {
        create: {
          providerId: 'email-password',
          accountId: 'bob@example.com',
          password: hashedPassword,
        },
      },
      `
          : ''
      }
    },
  });

  const charlie = await prisma.user.create({
    data: {
      email: 'charlie@example.com',
      name: 'Charlie Brown',
      ${
        config.auth
          ? `
      accounts: {
        create: {
          providerId: 'email-password',
          accountId: 'charlie@example.com',
          password: hashedPassword,
        },
      },
      `
          : ''
      }
    },
  });

  // Create demo posts
  await prisma.post.createMany({
    data: [
      {
        title: 'Getting Started with Next.js and Turso',
        content: 'Next.js is a powerful React framework that enables you to build full-stack web applications. Combined with Turso, a distributed SQLite database, you get the perfect combination of developer experience and performance.',
        published: true,
        authorId: alice.id,
        createdAt: new Date('2024-01-15'),
      },
      {
        title: 'Why Turso is Perfect for Edge Computing',
        content: 'Turso brings SQLite to the edge, offering low-latency database access from anywhere in the world. Its distributed nature makes it ideal for modern web applications.',
        published: true,
        authorId: alice.id,
        createdAt: new Date('2024-01-18'),
      },
      {
        title: 'Building Scalable Apps with Prisma',
        content: 'Prisma provides a type-safe database client that makes working with databases a breeze. Learn how to leverage its power in your Next.js applications.',
        published: true,
        authorId: bob.id,
        createdAt: new Date('2024-01-20'),
      },
      {
        title: 'Draft: Advanced Turso Techniques',
        content: 'This post is still in progress. It will cover advanced techniques for optimizing Turso performance.',
        published: false,
        authorId: bob.id,
        createdAt: new Date('2024-01-22'),
      },
      {
        title: 'The Future of Edge Databases',
        content: 'Edge computing is revolutionizing how we think about data storage and retrieval. Discover what the future holds for edge databases.',
        published: true,
        authorId: charlie.id,
        createdAt: new Date('2024-01-25'),
      },
    ],
  });

  ${
    config.auth
      ? `
  // Create organizations and memberships
  const techCorp = await prisma.organization.create({
    data: {
      name: 'Tech Corp',
      slug: 'tech-corp',
      metadata: { industry: 'Technology' },
    },
  });

  const startupInc = await prisma.organization.create({
    data: {
      name: 'Startup Inc',
      slug: 'startup-inc',
      metadata: { industry: 'Software' },
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
  });
  `
      : ''
  }

  console.log('✅ Database seeded successfully!');
  console.log('');
  console.log('📊 Created:');
  console.log('   - 3 users');
  console.log('   - 5 posts (4 published, 1 draft)');
  ${
    config.auth
      ? `
  console.log('   - 2 organizations');
  console.log('   - 4 memberships');
  console.log('   - 1 invitation');
  console.log('');
  console.log('🔐 Login credentials:');
  console.log('   - alice@example.com / Demo123! (owner of Tech Corp)');
  console.log('   - bob@example.com / Demo123! (member of Tech Corp, owner of Startup Inc)');
  console.log('   - charlie@example.com / Demo123! (member of Startup Inc)');
  `
      : ''
  }
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

// Determine if we're using local or cloud database
const isLocal = !process.env.TURSO_DATABASE_URL ||
                process.env.TURSO_DATABASE_URL.startsWith('file:');

let prisma: PrismaClient;

if (isLocal) {
  // Local development - use standard Prisma client
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
} else {
  // Cloud deployment - use Turso adapter
  const libsql = createClient({
    url: process.env.TURSO_DATABASE_URL || '',
    authToken: process.env.TURSO_AUTH_TOKEN || '',
  });

  const adapter = new PrismaLibSQL(libsql);
  prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

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

async function setupDrizzleWithPost(config: ProjectConfig) {
  await fs.ensureDir(path.join(config.projectPath, 'src/db'));

  // Drizzle config file
  const drizzleConfigContent = `import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: '${config.database === 'turso' ? 'sqlite' : 'postgresql'}',
  dbCredentials: {
    ${
      config.database === 'turso'
        ? `url: process.env.DATABASE_URL || 'file:./prisma/dev.db',`
        : 'connectionString: process.env.DATABASE_URL!,'
    }
  },
});
`;

  await fs.writeFile(path.join(config.projectPath, 'drizzle.config.ts'), drizzleConfigContent);

  // Database schema with Post model
  let schemaImports = '';
  let schemaContent = '';

  if (config.database === 'turso') {
    schemaImports = `import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';`;

    schemaContent = `
export const users = sqliteTable('users', {
  id: text('id').primaryKey().default(sql\`(lower(hex(randomblob(16))))\`),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
  name: text('name'),
  image: text('image'),
  role: text('role').default('user'),
  createdAt: text('created_at').default(sql\`(current_timestamp)\`),
  updatedAt: text('updated_at').default(sql\`(current_timestamp)\`),
});

export const posts = sqliteTable('posts', {
  id: text('id').primaryKey().default(sql\`(lower(hex(randomblob(16))))\`),
  title: text('title').notNull(),
  content: text('content'),
  published: integer('published', { mode: 'boolean' }).default(false),
  authorId: text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').default(sql\`(current_timestamp)\`),
  updatedAt: text('updated_at').default(sql\`(current_timestamp)\`),
});

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey().default(sql\`(lower(hex(randomblob(16))))\`),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: text('access_token_expires_at'),
  refreshTokenExpiresAt: text('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: text('created_at').default(sql\`(current_timestamp)\`),
  updatedAt: text('updated_at').default(sql\`(current_timestamp)\`),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey().default(sql\`(lower(hex(randomblob(16))))\`),
  expiresAt: text('expires_at').notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').default(sql\`(current_timestamp)\`),
  updatedAt: text('updated_at').default(sql\`(current_timestamp)\`),
});`;
  } else {
    schemaImports = `import { pgTable, text, boolean, timestamp, uuid } from 'drizzle-orm/pg-core';`;

    schemaContent = `
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false),
  name: text('name'),
  image: text('image'),
  role: text('role').default('user'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  content: text('content'),
  published: boolean('published').default(false),
  authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});`;
  }

  const schemaFileContent = `${schemaImports}
${schemaContent}

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
`;

  await fs.writeFile(path.join(config.projectPath, 'src/db/schema.ts'), schemaFileContent);

  // Drizzle database client
  let dbClientContent = '';

  if (config.database === 'turso') {
    dbClientContent = `import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

const client = createClient({
  url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
`;
  } else {
    dbClientContent = `import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);

export const db = drizzle(client, { schema });
`;
  }

  await fs.writeFile(path.join(config.projectPath, 'src/db/index.ts'), dbClientContent);

  // Seed file with Posts
  const seedContent = `import { db } from './index';
import { users, posts } from './schema';
${config.auth ? "import bcrypt from 'bcryptjs';" : ''}

async function seed() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await db.delete(posts);
  await db.delete(users);

  ${
    config.auth
      ? `
  const hashedPassword = await bcrypt.hash('Demo123!', 12);
  `
      : ''
  }

  // Create demo users
  const [alice] = await db.insert(users).values({
    email: 'alice@example.com',
    name: 'Alice Johnson',
    emailVerified: true,
  }).returning();

  const [bob] = await db.insert(users).values({
    email: 'bob@example.com',
    name: 'Bob Smith',
    emailVerified: true,
  }).returning();

  const [charlie] = await db.insert(users).values({
    email: 'charlie@example.com',
    name: 'Charlie Brown',
  }).returning();

  // Create demo posts
  await db.insert(posts).values([
    {
      title: 'Getting Started with Next.js and ${config.database === 'turso' ? 'Turso' : 'Supabase'}',
      content: 'Next.js is a powerful React framework that enables you to build full-stack web applications.',
      published: true,
      authorId: alice.id,
    },
    {
      title: 'Why ${config.database === 'turso' ? 'Turso' : 'Supabase'} is Perfect for Edge Computing',
      content: '${config.database === 'turso' ? 'Turso brings SQLite to the edge' : 'Supabase provides a complete backend'}, offering excellent performance.',
      published: true,
      authorId: alice.id,
    },
    {
      title: 'Building Scalable Apps with Drizzle',
      content: 'Drizzle ORM provides a type-safe database client that makes working with databases a breeze.',
      published: true,
      authorId: bob.id,
    },
    {
      title: 'Draft: Advanced Techniques',
      content: 'This post is still in progress.',
      published: false,
      authorId: bob.id,
    },
    {
      title: 'The Future of Edge Databases',
      content: 'Edge computing is revolutionizing how we think about data storage and retrieval.',
      published: true,
      authorId: charlie.id,
    },
  ]);

  console.log('✅ Database seeded successfully!');
  console.log('');
  console.log('📊 Created:');
  console.log('   - 3 users');
  console.log('   - 5 posts (4 published, 1 draft)');
  process.exit(0);
}

seed().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
`;

  await fs.writeFile(path.join(config.projectPath, 'src/db/seed.ts'), seedContent);

  // Create migration script
  const migrationScriptContent = `#!/usr/bin/env bash
set -e

echo "🗄️ Running database migrations..."

# Generate SQL migrations
${config.packageManager} run db:generate

# Apply migrations
${config.packageManager} run db:push

echo "✅ Migrations complete!"
`;

  const migrationScriptPath = path.join(config.projectPath, 'scripts', 'migrate.sh');
  await fs.ensureDir(path.dirname(migrationScriptPath));
  await fs.writeFile(migrationScriptPath, migrationScriptContent);
  await fs.chmod(migrationScriptPath, '755');
}

async function createDatabaseDemoUI(config: ProjectConfig) {
  console.log('  • Creating database demo UI and API routes...');

  // Create API route for posts
  const apiRouteContent = `import { type NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      where: { published: true },
      include: { author: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(posts);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const { title, content, authorEmail } = json;

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: authorEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: authorEmail,
          name: authorEmail.split('@')[0],
        },
      });
    }

    const post = await prisma.post.create({
      data: {
        title,
        content,
        published: true,
        authorId: user.id,
      },
      include: { author: true },
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}
`;

  const apiPath = path.join(config.projectPath, 'src/app/api/posts/route.ts');
  await fs.ensureDir(path.dirname(apiPath));
  await fs.writeFile(apiPath, apiRouteContent);

  // Create database demo component
  const demoComponentContent = `'use client';

import type React from 'react';
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Database, RefreshCw, Plus, User, Calendar } from 'lucide-react';

interface Post {
  id: string;
  title: string;
  content: string;
  published: boolean;
  createdAt: string;
  author: {
    name: string;
    email: string;
  };
}

export default function DatabaseDemo() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    authorEmail: 'demo@example.com',
  });

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/posts');
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      const data = await response.json();
      setPosts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        throw new Error('Failed to create post');
      }

      setFormData({ title: '', content: '', authorEmail: 'demo@example.com' });
      setShowForm(false);
      fetchPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Connection Status
              </CardTitle>
              <CardDescription>
                ${config.database === 'turso' ? 'Turso SQLite Edge Database' : 'Supabase PostgreSQL Database'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant={error ? 'destructive' : 'default'}>
                {error ? 'Error' : loading ? 'Connecting...' : 'Connected'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button onClick={fetchPosts} disabled={loading} size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setShowForm(!showForm)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Post
            </Button>
          </div>
        </CardContent>
      </Card>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Post</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  placeholder="Post title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <Textarea
                  placeholder="Post content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={4}
                />
              </div>
              <div>
                <Input
                  type="email"
                  placeholder="Author email"
                  value={formData.authorEmail}
                  onChange={(e) => setFormData({ ...formData, authorEmail: e.target.value })}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">Create Post</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Posts ({posts.length})</h3>
          {posts.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground">No posts yet. Create your first post!</p>
              </CardContent>
            </Card>
          ) : (
            posts.map((post) => (
              <Card key={post.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{post.title}</CardTitle>
                    <Badge variant="secondary">Published</Badge>
                  </div>
                  <CardDescription className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {post.author.name || post.author.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </CardDescription>
                </CardHeader>
                {post.content && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{post.content}</p>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
`;

  const componentPath = path.join(config.projectPath, 'src/components/database-demo.tsx');
  await fs.ensureDir(path.dirname(componentPath));
  await fs.writeFile(componentPath, demoComponentContent);

  console.log('  • ✅ Database demo UI and API routes created');
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
  } else if (config.orm === 'drizzle') {
    dbScripts['db:generate'] = 'drizzle-kit generate';
    dbScripts['db:push'] = 'drizzle-kit push';
    dbScripts['db:migrate'] = 'drizzle-kit migrate';
    dbScripts['db:studio'] = 'drizzle-kit studio';
    dbScripts['db:seed'] = 'tsx src/db/seed.ts';
  }

  // Add database-specific scripts
  if (config.database === 'turso') {
    dbScripts['setup:turso'] = 'bash scripts/setup-turso.sh';
    dbScripts['setup:turso:cloud'] = 'bash scripts/setup-turso.sh --cloud';
  } else if (config.database === 'supabase') {
    dbScripts['setup:supabase'] = 'bash scripts/setup-supabase.sh';
  }

  packageJson.scripts = {
    ...packageJson.scripts,
    ...dbScripts,
  };

  // Update Prisma configuration in package.json
  if (config.orm === 'prisma') {
    packageJson.prisma = {
      seed: 'tsx prisma/seed.ts',
    };
  }

  await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
}

async function addPostInstallScript(config: ProjectConfig) {
  const packageJsonPath = path.join(config.projectPath, 'package.json');
  const packageJson = await fs.readJSON(packageJsonPath);

  // Add post-install script to initialize database
  packageJson.scripts = {
    ...packageJson.scripts,
    postinstall: 'bash scripts/init-turso-db.sh',
  };

  await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });

  // Create initialization script
  const initScriptContent = `#!/usr/bin/env bash

# Only run if we're not in CI and this is first install
if [ -z "$CI" ] && [ ! -f ".turso-initialized" ]; then
  echo "🚀 Initializing Turso database..."

  # Flag to track if initialization was successful
  INIT_SUCCESS=true

  # Create database directory and file
  mkdir -p prisma
  touch prisma/dev.db

  # Generate Prisma client
  echo "  • Generating Prisma client..."
  if OUTPUT=$(${config.packageManager} run db:generate 2>&1); then
    echo "  ✅ Prisma client generated"
  else
    echo "  ⚠️  Prisma client generation failed:"
    echo "$OUTPUT" | sed 's/^/      /'
    echo ""
    INIT_SUCCESS=false
  fi

  # Push schema to database
  if [ "$INIT_SUCCESS" = true ]; then
    echo "  • Pushing schema to database..."
    if OUTPUT=$(${config.packageManager} run db:push 2>&1); then
      echo "  ✅ Schema pushed to database"
    else
      echo "  ⚠️  Schema push failed:"
      echo "$OUTPUT" | sed 's/^/      /'
      echo ""
      INIT_SUCCESS=false
    fi
  fi

  # Seed database
  if [ "$INIT_SUCCESS" = true ]; then
    echo "  • Seeding database..."
    if OUTPUT=$(${config.packageManager} run db:seed 2>&1); then
      echo "  ✅ Database seeded"
    else
      echo "  ⚠️  Database seeding failed:"
      echo "$OUTPUT" | sed 's/^/      /'
      echo ""
      INIT_SUCCESS=false
    fi
  fi

  # Only mark as initialized if all steps succeeded
  if [ "$INIT_SUCCESS" = true ]; then
    touch .turso-initialized
    echo "✅ Turso database initialization complete!"
  else
    echo ""
    echo "⚠️  Database initialization incomplete. Run the following after fixing any issues:"
    echo "    ${config.packageManager} run db:generate"
    echo "    ${config.packageManager} run db:push"
    echo "    ${config.packageManager} run db:seed"
  fi
fi
`;

  const scriptPath = path.join(config.projectPath, 'scripts', 'init-turso-db.sh');
  await fs.ensureDir(path.dirname(scriptPath));
  await fs.writeFile(scriptPath, initScriptContent);
  await fs.chmod(scriptPath, '755');
}
