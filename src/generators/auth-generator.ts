import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../commands/create.js';

export async function setupAuth(config: ProjectConfig) {
  // Install Better Auth dependencies
  await addAuthDependencies(config);

  // Setup Better Auth configuration
  await setupBetterAuth(config);

  // Create auth components
  await createAuthComponents(config);

  // Create auth API routes
  await createAuthRoutes(config);

  // Update database schema for auth
  if (config.orm === 'prisma') {
    await updatePrismaSchemaForAuth(config);
  } else if (config.orm === 'drizzle') {
    await updateDrizzleSchemaForAuth(config);
  }
}

async function addAuthDependencies(config: ProjectConfig) {
  const packageJsonPath = path.join(config.projectPath, 'package.json');
  const packageJson = await fs.readJSON(packageJsonPath);

  // Add Better Auth dependencies
  packageJson.dependencies = {
    ...packageJson.dependencies,
    'better-auth': '^0.4.0',
    '@better-auth/react': '^0.2.0',
  };

  // Add database adapter dependencies
  if (config.orm === 'prisma') {
    packageJson.dependencies['@better-auth/prisma-adapter'] = '^0.1.0';
  } else if (config.orm === 'drizzle') {
    packageJson.dependencies['@better-auth/drizzle-adapter'] = '^0.1.0';
  }

  await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
}

async function setupBetterAuth(config: ProjectConfig) {
  let authConfigContent = '';

  if (config.orm === 'prisma') {
    authConfigContent = `import { betterAuth } from 'better-auth';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import prisma from '@/lib/db';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: '${config.database === 'supabase' ? 'postgresql' : 'sqlite'}',
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  trustedOrigins: process.env.VERCEL_URL
    ? [\`https://\\\${process.env.VERCEL_URL}\`, 'http://localhost:3000']
    : ['http://localhost:3000'],
});

export type Session = typeof auth.session;
`;
  } else if (config.orm === 'drizzle') {
    authConfigContent = `import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { db } from '@/db';
import * as schema from '@/db/schema';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: '${config.database === 'supabase' ? 'postgresql' : 'sqlite'}',
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  trustedOrigins: process.env.VERCEL_URL
    ? [\`https://\\\${process.env.VERCEL_URL}\`, 'http://localhost:3000']
    : ['http://localhost:3000'],
});

export type Session = typeof auth.session;
`;
  }

  await fs.writeFile(path.join(config.projectPath, 'src/lib/auth.ts'), authConfigContent);

  // Add auth environment variables
  const envContent = `
# Authentication
BETTER_AUTH_SECRET="[generate-a-32-character-secret]"
BETTER_AUTH_URL="http://localhost:3000"

# OAuth Providers (optional)
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
`;

  const envPath = path.join(config.projectPath, '.env.local');
  const existingEnv = await fs.readFile(envPath, 'utf-8').catch(() => '');
  await fs.writeFile(envPath, existingEnv + envContent);

  // Create auth client hook
  const authClientContent = `'use client';

import { createAuthClient } from '@better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
});

export const {
  useSession,
  useUser,
  signIn,
  signUp,
  signOut,
  useAuth,
} = authClient;
`;

  await fs.writeFile(path.join(config.projectPath, 'src/lib/auth-client.ts'), authClientContent);
}

async function createAuthComponents(config: ProjectConfig) {
  // Sign in form component
  const signInFormContent = `'use client';

import { useState } from 'react';
import { signIn } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signIn.emailAndPassword({
        email,
        password,
      });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>

      <div className="text-center text-sm">
        <span className="text-gray-600">Don't have an account? </span>
        <a href="/auth/signup" className="text-blue-500 hover:underline">
          Sign up
        </a>
      </div>
    </form>
  );
}
`;

  await fs.writeFile(
    path.join(config.projectPath, 'src/components/auth/sign-in-form.tsx'),
    signInFormContent
  );

  // Sign up form component
  const signUpFormContent = `'use client';

import { useState } from 'react';
import { signUp } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';

export function SignUpForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signUp.emailAndPassword({
        email,
        password,
        name,
      });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          minLength={8}
        />
      </div>

      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Creating account...' : 'Sign Up'}
      </button>

      <div className="text-center text-sm">
        <span className="text-gray-600">Already have an account? </span>
        <a href="/auth/signin" className="text-blue-500 hover:underline">
          Sign in
        </a>
      </div>
    </form>
  );
}
`;

  await fs.writeFile(
    path.join(config.projectPath, 'src/components/auth/sign-up-form.tsx'),
    signUpFormContent
  );

  // User menu component
  const userMenuContent = `'use client';

import { useSession, signOut } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';

export function UserMenu() {
  const router = useRouter();
  const { data: session, loading } = useSession();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!session) {
    return (
      <div className="flex gap-2">
        <a
          href="/auth/signin"
          className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Sign In
        </a>
        <a
          href="/auth/signup"
          className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
        >
          Sign Up
        </a>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-gray-700">
        {session.user?.email}
      </span>
      <button
        onClick={handleSignOut}
        className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600"
      >
        Sign Out
      </button>
    </div>
  );
}
`;

  await fs.writeFile(
    path.join(config.projectPath, 'src/components/auth/user-menu.tsx'),
    userMenuContent
  );
}

async function createAuthRoutes(config: ProjectConfig) {
  // API route handler
  const authRouteContent = `import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

export const { POST, GET } = toNextJsHandler(auth);
`;

  await fs.ensureDir(path.join(config.projectPath, 'src/app/api/auth/[...all]'));
  await fs.writeFile(
    path.join(config.projectPath, 'src/app/api/auth/[...all]/route.ts'),
    authRouteContent
  );

  // Sign in page
  const signInPageContent = `import { SignInForm } from '@/components/auth/sign-in-form';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm p-6">
        <h1 className="text-2xl font-bold text-center mb-6">Sign In</h1>
        <SignInForm />
      </div>
    </div>
  );
}
`;

  await fs.ensureDir(path.join(config.projectPath, 'src/app/auth/signin'));
  await fs.writeFile(
    path.join(config.projectPath, 'src/app/auth/signin/page.tsx'),
    signInPageContent
  );

  // Sign up page
  const signUpPageContent = `import { SignUpForm } from '@/components/auth/sign-up-form';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm p-6">
        <h1 className="text-2xl font-bold text-center mb-6">Create Account</h1>
        <SignUpForm />
      </div>
    </div>
  );
}
`;

  await fs.ensureDir(path.join(config.projectPath, 'src/app/auth/signup'));
  await fs.writeFile(
    path.join(config.projectPath, 'src/app/auth/signup/page.tsx'),
    signUpPageContent
  );

  // Protected dashboard page
  const dashboardPageContent = `import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-2">Welcome!</h2>
        <p className="text-gray-600">You are logged in as: {session.user?.email}</p>
      </div>
    </div>
  );
}
`;

  await fs.ensureDir(path.join(config.projectPath, 'src/app/dashboard'));
  await fs.writeFile(
    path.join(config.projectPath, 'src/app/dashboard/page.tsx'),
    dashboardPageContent
  );
}

async function updatePrismaSchemaForAuth(config: ProjectConfig) {
  const schemaPath = path.join(config.projectPath, 'prisma/schema.prisma');
  const schema = await fs.readFile(schemaPath, 'utf-8');

  const authModels = `
model Session {
  id           String   @id @default(cuid())
  expiresAt    DateTime
  token        String   @unique
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  ipAddress    String?
  userAgent    String?
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Account {
  id           String   @id @default(cuid())
  accountId    String
  providerId   String
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken  String?
  refreshToken String?
  idToken      String?
  expiresAt    DateTime?
  password     String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([providerId, accountId])
}
`;

  // Update User model to include auth relations
  const updatedSchema = schema.replace(
    'model User {',
    `model User {
  sessions  Session[]
  accounts  Account[]`
  );

  const finalSchema = updatedSchema + authModels;

  await fs.writeFile(schemaPath, finalSchema);
}

async function updateDrizzleSchemaForAuth(config: ProjectConfig) {
  const schemaPath = path.join(config.projectPath, 'src/db/schema.ts');
  const schema = await fs.readFile(schemaPath, 'utf-8');

  const authTables = `
export const sessions = ${config.database === 'supabase' ? 'pgTable' : 'sqliteTable'}('sessions', {
  id: ${config.database === 'supabase' ? 'serial' : 'integer'}('id').primaryKey(),
  expiresAt: ${config.database === 'supabase' ? 'timestamp' : 'integer'}('expires_at', ${config.database === 'supabase' ? '' : '{ mode: "timestamp" }'}).notNull(),
  token: text('token').notNull().unique(),
  createdAt: ${config.database === 'supabase' ? 'timestamp' : 'integer'}('created_at', ${config.database === 'supabase' ? '' : '{ mode: "timestamp" }'}).notNull().defaultNow(),
  updatedAt: ${config.database === 'supabase' ? 'timestamp' : 'integer'}('updated_at', ${config.database === 'supabase' ? '' : '{ mode: "timestamp" }'}).notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: ${config.database === 'supabase' ? 'integer' : 'integer'}('user_id').notNull().references(() => users.id),
});

export const accounts = ${config.database === 'supabase' ? 'pgTable' : 'sqliteTable'}('accounts', {
  id: ${config.database === 'supabase' ? 'serial' : 'integer'}('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: ${config.database === 'supabase' ? 'integer' : 'integer'}('user_id').notNull().references(() => users.id),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  expiresAt: ${config.database === 'supabase' ? 'timestamp' : 'integer'}('expires_at', ${config.database === 'supabase' ? '' : '{ mode: "timestamp" }'}),
  password: text('password'),
  createdAt: ${config.database === 'supabase' ? 'timestamp' : 'integer'}('created_at', ${config.database === 'supabase' ? '' : '{ mode: "timestamp" }'}).notNull().defaultNow(),
  updatedAt: ${config.database === 'supabase' ? 'timestamp' : 'integer'}('updated_at', ${config.database === 'supabase' ? '' : '{ mode: "timestamp" }'}).notNull().defaultNow(),
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));
`;

  // Update users relations to include auth relations
  const updatedSchema = schema.replace(
    'export const usersRelations = relations(users, ({ many }) => ({',
    `export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),`
  );

  const finalSchema = `${updatedSchema}\n${authTables}`;

  await fs.writeFile(schemaPath, finalSchema);
}
