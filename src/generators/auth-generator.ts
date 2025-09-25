import { randomBytes } from 'node:crypto';
import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../commands/create/types.js';
// Unused imports removed for cleanup

export async function setupAuth(config: ProjectConfig) {
    if (config.framework !== 'nextjs') {
        return;
    }

    if (config.orm !== 'prisma') {
        throw new Error(
            'Better Auth advanced scaffolding currently requires Prisma. Please choose Prisma as the ORM when enabling authentication.'
        );
    }

    await addAuthDependencies(config);
    await writeAuthCore(config);
    await writeMiddleware(config);
    await writeAuthApiRoute(config);
    await writeDashboardScaffolding(config);
    await writeApiRoutes(config);
    await writeProfileUploadHelper(config);
    await writeHelperFunctions(config);
    await updateSeedFileForAuth(config);
}

async function addAuthDependencies(config: ProjectConfig) {
    const packageJsonPath = path.join(config.projectPath, 'package.json');
    const packageJson = await fs.readJSON(packageJsonPath);

    packageJson.dependencies = packageJson.dependencies ?? {};

    if (!packageJson.dependencies['better-auth']) {
        packageJson.dependencies['better-auth'] = '^1.2.3';
    }

    if (!packageJson.dependencies.zod) {
        packageJson.dependencies.zod = '^3.23.8';
    }

    if (!packageJson.dependencies.bcryptjs) {
        packageJson.dependencies.bcryptjs = '^2.4.3';
    }

    // Add dev dependencies for types
    packageJson.devDependencies = packageJson.devDependencies ?? {};
    if (!packageJson.devDependencies['@types/bcryptjs']) {
        packageJson.devDependencies['@types/bcryptjs'] = '^2.4.6';
    }

    await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
}

async function writeAuthCore(config: ProjectConfig) {
    const provider = config.database === 'supabase' ? 'postgresql' : 'sqlite';
    const libDir = path.join(config.projectPath, 'src/lib');
    await fs.ensureDir(libDir);

    const rolesContent = `export const APP_ROLES = {
  ADMIN: 'admin',
  ORG_ADMIN: 'org_admin',
  USER: 'user',
} as const;

export type AppRole = (typeof APP_ROLES)[keyof typeof APP_ROLES];

export const ROLE_LABELS: Record<AppRole, string> = {
  [APP_ROLES.ADMIN]: '管理ユーザー',
  [APP_ROLES.ORG_ADMIN]: '組織管理ユーザー',
  [APP_ROLES.USER]: '一般ユーザー',
};
`;

    await fs.outputFile(path.join(libDir, 'roles.ts'), rolesContent);

    const authSecret = randomBytes(32).toString('hex');

    const authContent = `import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { organization } from 'better-auth/plugins/organization';
import prisma from '@/lib/db';
import { APP_ROLES } from './roles';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: '${provider}',
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: APP_ROLES.USER,
      },
    },
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: false,
    }),
  ],
  trustedOrigins: process.env.VERCEL_URL
    ? [\`https://\${process.env.VERCEL_URL}\`, 'http://localhost:3000']
    : ['http://localhost:3000'],
});
`;

    await fs.outputFile(path.join(libDir, 'auth.ts'), authContent);

    const authClientContent = `'use client';

import { createAuthClient } from 'better-auth/react';
import { organizationClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  plugins: [organizationClient()],
});

export const {
  useSession,
  useUser,
  signIn,
  signOut,
  useAuth,
} = authClient;
`;

    await fs.outputFile(path.join(libDir, 'auth-client.ts'), authClientContent);

    const authServerContent = `import { headers, cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { auth } from './auth';
import { APP_ROLES, type AppRole } from './roles';


export async function getSession() {
  try {
    console.log('🔍 getSession: Starting session check');

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    console.log('🍪 Session cookie exists:', !!sessionCookie?.value);

    if (!sessionCookie?.value) {
      console.log('❌ No session cookie found');
      return null;
    }

    // Verify session exists in database and hasn't expired
    const session = await prisma.session.findUnique({
      where: {
        token: sessionCookie.value,
      },
      include: {
        user: true,
      },
    });

    console.log('🗄️ Database session found:', !!session);

    if (!session) {
      console.log('❌ Session not found in database');
      return null;
    }

    if (session.expiresAt < new Date()) {
      console.log('⏰ Session expired, cleaning up');
      // Clean up expired session
      await prisma.session.delete({
        where: { id: session.id },
      });
      return null;
    }

    console.log('✅ Valid session found for user:', session.user.email);

    return {
      user: session.user,
      session,
    };
  } catch (error) {
    console.error('💥 Session verification error:', error);
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return session;
}

export function hasRole(role: string | null | undefined, allowed: AppRole[]) {
  return role ? allowed.includes(role as AppRole) : false;
}

export function assertRole(session: Awaited<ReturnType<typeof getSession>>, allowed: AppRole[]) {
  if (!session || !hasRole(session.user?.role, allowed)) {
    redirect('/');
  }
}

export async function getAccessibleOrganizationIds(userId: string, role: AppRole) {
  if (role === APP_ROLES.ADMIN) {
    const organizations = await prisma.organization.findMany({ select: { id: true } });
    return organizations.map((org) => org.id);
  }

  const memberships = await prisma.member.findMany({
    where: { userId },
    select: { organizationId: true },
  });

  return memberships.map((membership) => membership.organizationId);
}

export function roleLabel(role: AppRole) {
  switch (role) {
    case APP_ROLES.ADMIN:
      return '管理ユーザー';
    case APP_ROLES.ORG_ADMIN:
      return '組織管理ユーザー';
    default:
      return '一般ユーザー';
  }
}
`;

    await fs.outputFile(path.join(libDir, 'auth-server.ts'), authServerContent);

    const slugUtilContent = `export function toSlug(input: string) {
  const normalized = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^(-)+|(-)+$/g, '');

  if (!normalized) {
    return \`organization-\${Date.now()}\`;
  }

  return normalized;
}
`;

    await fs.outputFile(path.join(libDir, 'to-slug.ts'), slugUtilContent);

    await appendEnv(
        config,
        `# Authentication
BETTER_AUTH_SECRET="${authSecret}"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
`
    );
}

async function writeMiddleware(config: ProjectConfig) {
    const middlewareContent = `import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/api/auth'];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((publicPath) => pathname === publicPath || pathname.startsWith(publicPath + '/'));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico' ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const sessionCookie =
    request.cookies.get('better-auth.session_token') ?? request.cookies.get('session');
  const hasSession = Boolean(sessionCookie?.value);

  if (hasSession && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (!hasSession && !isPublicPath(pathname)) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
`;

    await fs.outputFile(path.join(config.projectPath, 'middleware.ts'), middlewareContent);
}

async function writeAuthApiRoute(config: ProjectConfig) {
    const authApiDir = path.join(config.projectPath, 'src/app/api/auth/[...all]');
    await fs.ensureDir(authApiDir);

    const authApiContent = `import { auth } from '@/lib/auth';

export const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = auth.handler;
`;

    await fs.outputFile(path.join(authApiDir, 'route.ts'), authApiContent);
}

async function writeDashboardScaffolding(config: ProjectConfig) {
    const appDir = path.join(config.projectPath, 'src/app');
    const groupDir = path.join(appDir, '(app)');
    const componentsDir = path.join(config.projectPath, 'src/components/dashboard');
    await fs.ensureDir(groupDir);
    await fs.ensureDir(componentsDir);

    const rootPagePath = path.join(appDir, 'page.tsx');
    if (await fs.pathExists(rootPagePath)) {
        await fs.remove(rootPagePath);
    }

    const appLayoutContent = `import type { ReactNode } from 'react';
import { requireSession } from '@/lib/auth-server';
import { Sidebar } from '@/components/dashboard/sidebar';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  const serializableUser = {
    id: session.user?.id ?? '',
    name: session.user?.name ?? '',
    email: session.user?.email ?? '',
    role: session.user?.role ?? 'user',
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar user={serializableUser} />
      <div className="flex min-h-screen flex-1 flex-col">
        <DashboardHeader user={serializableUser} />
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
`;

    await fs.outputFile(path.join(groupDir, 'layout.tsx'), appLayoutContent);

    const sidebarContent = `'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Building2, Users2, UserRound } from 'lucide-react';
import { APP_ROLES, type AppRole } from '@/lib/roles';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  {
    href: '/',
    label: 'ダッシュボード',
    icon: LayoutDashboard,
    roles: [APP_ROLES.ADMIN, APP_ROLES.ORG_ADMIN, APP_ROLES.USER],
  },
  {
    href: '/organizations',
    label: '組織管理',
    icon: Building2,
    roles: [APP_ROLES.ADMIN],
  },
  {
    href: '/users',
    label: 'ユーザー管理',
    icon: Users2,
    roles: [APP_ROLES.ADMIN, APP_ROLES.ORG_ADMIN],
  },
  {
    href: '/profile',
    label: 'プロフィール',
    icon: UserRound,
    roles: [APP_ROLES.ADMIN, APP_ROLES.ORG_ADMIN, APP_ROLES.USER],
  },
] as const;

interface SidebarProps {
  user: {
    id: string;
    email: string;
    name: string;
    role: AppRole | string;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const role = (user.role as AppRole) ?? APP_ROLES.USER;

  return (
    <aside className="hidden w-64 border-r bg-background/80 p-6 shadow-sm md:block">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground">ログイン中のユーザー</p>
        <h2 className="text-lg font-semibold">{user.name || user.email || 'Unknown User'}</h2>
        <p className="text-xs text-muted-foreground">ロール: {roleLabel(role)}</p>
      </div>
      <nav className="space-y-2">
        {NAV_ITEMS.filter((item) => item.roles.includes(role as AppRole)).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function roleLabel(role: AppRole) {
  switch (role) {
    case APP_ROLES.ADMIN:
      return '管理ユーザー';
    case APP_ROLES.ORG_ADMIN:
      return '組織管理ユーザー';
    default:
      return '一般ユーザー';
  }
}
`;

    await fs.outputFile(path.join(componentsDir, 'sidebar.tsx'), sidebarContent);

    const headerContent = `'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROLE_LABELS, type AppRole } from '@/lib/roles';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface DashboardHeaderProps {
  user: {
    id: string;
    email: string;
    name: string;
    role: AppRole | string;
  };
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const initials = user.name
    ? user.name
        .split(' ')
        .map((part) => part.charAt(0))
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : user.email.slice(0, 2).toUpperCase();

  const handleSignOut = () => {
    startTransition(async () => {
      try {
        console.log('🚪 Starting custom logout process');
        const response = await fetch('/api/auth/sign-out', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          console.log('✅ Logout successful, redirecting to login');
          router.push('/login');
          router.refresh(); // Force refresh to clear any cached data
        } else {
          console.error('❌ Logout failed:', response.status);
        }
      } catch (error) {
        console.error('💥 Logout error:', error);
      }
    });
  };

  return (
    <header className="flex items-center justify-between border-b bg-background/60 px-6 py-4">
      <div>
        <h1 className="text-2xl font-semibold">fluorite-flake ダッシュボード</h1>
        <p className="text-sm text-muted-foreground">
          {ROLE_LABELS[(user.role as AppRole) ?? 'user'] || '一般ユーザー'} / {user.email}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <Avatar className="h-10 w-10">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <Button variant="outline" size="sm" onClick={handleSignOut} disabled={isPending}>
          <LogOut className="mr-2 h-4 w-4" />
          ログアウト
        </Button>
      </div>
    </header>
  );
}
`;

    await fs.outputFile(path.join(componentsDir, 'dashboard-header.tsx'), headerContent);

    const dashboardPageContent = `import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { requireSession, getAccessibleOrganizationIds } from '@/lib/auth-server';
import prisma from '@/lib/db';
import { APP_ROLES, type AppRole } from '@/lib/roles';

export default async function DashboardPage() {
  const session = await requireSession();
  const role = (session.user?.role as string) ?? APP_ROLES.USER;
  const organizationIds = await getAccessibleOrganizationIds(session.user.id, role as AppRole);

  const [organizations, memberCount, pendingInvites] = await Promise.all([
    prisma.organization.findMany({
      where: role === APP_ROLES.ADMIN ? undefined : { id: { in: organizationIds } },
      include: {
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.member.count({
      where: role === APP_ROLES.ADMIN ? undefined : { organizationId: { in: organizationIds } },
    }),
    prisma.invitation.count({
      where: role === APP_ROLES.ADMIN ? undefined : { organizationId: { in: organizationIds }, status: 'pending' },
    }),
  ]);

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>参加している組織</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{organizations.length}</p>
          <p className="text-sm text-muted-foreground">直近5件までの組織を表示しています</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>所属ユーザー</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{memberCount}</p>
          <p className="text-sm text-muted-foreground">権限に応じて閲覧可能なユーザー数</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>未処理の招待</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{pendingInvites}</p>
          <p className="text-sm text-muted-foreground">期限切れに注意してください</p>
        </CardContent>
      </Card>
      <Card className="md:col-span-2 xl:col-span-3">
        <CardHeader>
          <CardTitle>最近の組織</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {organizations.map((organization) => (
            <div key={organization.id} className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{organization.name}</h3>
                <Badge variant="outline">メンバー {organization._count.members}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">slug: {organization.slug}</p>
              <p className="text-xs text-muted-foreground">作成日: {organization.createdAt.toLocaleDateString('ja-JP')}</p>
            </div>
          ))}
          {organizations.length === 0 && (
            <p className="text-sm text-muted-foreground">表示する組織がまだありません。</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
`;

    await fs.outputFile(path.join(groupDir, 'page.tsx'), dashboardPageContent);

    const organizationsPageContent = `import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { requireSession } from '@/lib/auth-server';
import { APP_ROLES } from '@/lib/roles';
import { OrganizationsClient } from '@/components/dashboard/organizations-client';

export default async function OrganizationsPage() {
  const session = await requireSession();
  const role = (session.user?.role as string) ?? APP_ROLES.USER;

  if (role !== APP_ROLES.ADMIN) {
    redirect('/');
  }

  const organizations = await prisma.organization.findMany({
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <OrganizationsClient
      initialOrganizations={JSON.parse(JSON.stringify(organizations))}
    />
  );
}
`;

    await fs.outputFile(path.join(groupDir, 'organizations/page.tsx'), organizationsPageContent);

    const organizationsClientContent = `'use client';

import { useMemo, useState, useTransition } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }
  return 'An unknown error occurred';
}

interface OrganizationMember {
  id: string;
  role: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  metadata: string | null; // JSON stored as string for SQLite compatibility
  members: OrganizationMember[];
}

interface OrganizationsClientProps {
  initialOrganizations: Organization[];
}

export function OrganizationsClient({ initialOrganizations }: OrganizationsClientProps) {
  const [organizations, setOrganizations] = useState<Organization[]>(initialOrganizations);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Organization | null>(null);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    metadata: '{}', // Initialize with empty JSON string
  });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const memberCount = useMemo(
    () => organizations.reduce((acc, organization) => acc + organization.members.length, 0),
    [organizations]
  );

  const openCreateDialog = () => {
    setEditing(null);
    setForm({ name: '', slug: '', metadata: '{}' });
    setError('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (organization: Organization) => {
    setEditing(organization);
    setForm({
      name: organization.name,
      slug: organization.slug,
      metadata: organization.metadata || '{}',
    });
    setError('');
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    startTransition(async () => {
      setError('');
      try {
        const payload = {
          name: form.name,
          slug: form.slug,
          metadata: form.metadata ? JSON.parse(form.metadata) : undefined,
        };

        const response = await fetch(editing ? \`/api/organizations/\${editing.id}\` : '/api/organizations', {
          method: editing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || '保存に失敗しました');
        }

        const data = await response.json();
        setOrganizations(data.organizations as Organization[]);
        setIsDialogOpen(false);
      } catch (err: unknown) {
        setError(getErrorMessage(err));
      }
    });
  };

  const handleDelete = (organization: Organization) => {
    const ok = window.confirm(\`組織 "\${organization.name}" を削除しますか？\`);
    if (!ok) return;

    startTransition(async () => {
      setError('');
      try {
        const response = await fetch(\`/api/organizations/\${organization.id}\` , {
          method: 'DELETE',
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || '削除に失敗しました');
        }

        const data = await response.json();
        setOrganizations(data.organizations as Organization[]);
      } catch (err: unknown) {
        setError(getErrorMessage(err));
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>組織一覧</CardTitle>
            <p className="text-sm text-muted-foreground">登録済みの組織 ({organizations.length}) ・総メンバー数 {memberCount}</p>
          </div>
          <Button onClick={openCreateDialog} className="w-full md:w-auto">
            <Plus className="mr-2 h-4 w-4" /> 組織を追加
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>メンバー数</TableHead>
                <TableHead className="w-[140px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((organization) => (
                <TableRow key={organization.id}>
                  <TableCell className="font-medium">{organization.name}</TableCell>
                  <TableCell>{organization.slug}</TableCell>
                  <TableCell>{organization.members.length}</TableCell>
                  <TableCell className="space-x-2">
                    <Button variant="outline" size="icon" onClick={() => openEditDialog(organization)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleDelete(organization)} disabled={isPending}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {organizations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                    組織がまだ登録されていません。
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? '組織を編集' : '新しい組織を追加'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="organization-name">
                組織名
              </label>
              <Input
                id="organization-name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Example Inc"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="organization-slug">
                Slug (省略時は自動生成)
              </label>
              <Input
                id="organization-slug"
                value={form.slug}
                onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                placeholder="example-inc"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="organization-metadata">
                メタデータ (JSON)
              </label>
              <Textarea
                id="organization-metadata"
                value={form.metadata}
                onChange={(event) => setForm((prev) => ({ ...prev, metadata: event.target.value }))}
                placeholder='{"industry": "SaaS"}'
                rows={4}
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {editing ? '更新する' : '登録する'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
`;

    await fs.outputFile(
        path.join(componentsDir, 'organizations-client.tsx'),
        organizationsClientContent
    );

    const usersPageContent = `import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { requireSession, getAccessibleOrganizationIds } from '@/lib/auth-server';
import { APP_ROLES } from '@/lib/roles';
import { UsersClient } from '@/components/dashboard/users-client';

export default async function UsersPage() {
  const session = await requireSession();
  const role = (session.user?.role as string) ?? APP_ROLES.USER;

  if (role === APP_ROLES.USER) {
    redirect('/');
  }

  const organizationIds = await getAccessibleOrganizationIds(session.user.id, role as AppRole);

  const [organizations, users] = await Promise.all([
    prisma.organization.findMany({
      where: role === APP_ROLES.ADMIN ? undefined : { id: { in: organizationIds } },
      select: {
        id: true,
        name: true,
        slug: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.user.findMany({
      where: role === APP_ROLES.ADMIN ? undefined : {
        memberships: {
          some: {
            organizationId: { in: organizationIds },
          },
        },
      },
      include: {
        memberships: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return (
    <UsersClient
      initialUsers={JSON.parse(JSON.stringify(users))}
      organizations={organizations}
      currentRole={role}
      currentUserId={session.user.id}
    />
  );
}
`;

    await fs.outputFile(path.join(groupDir, 'users/page.tsx'), usersPageContent);

    const usersClientContentLines = [
        "'use client';",
        '',
        "import { useMemo, useState, useTransition } from 'react';",
        "import { Button } from '@/components/ui/button';",
        "import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';",
        "import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';",
        "import { Input } from '@/components/ui/input';",
        "import { Label } from '@/components/ui/label';",
        "import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';",
        "import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';",
        "import { Badge } from '@/components/ui/badge';",
        "import { APP_ROLES, ROLE_LABELS } from '@/lib/roles';",
        "import { Trash2, UserPlus } from 'lucide-react';",
        '',
        'function getErrorMessage(error: unknown): string {',
        '  if (error instanceof Error) return error.message;',
        "  if (typeof error === 'string') return error;",
        "  if (error && typeof error === 'object' && 'message' in error) {",
        '    return String((error as any).message);',
        '  }',
        "  return 'An unknown error occurred';",
        '}',
        '',
        'interface OrganizationOption {',
        '  id: string;',
        '  name: string;',
        '  slug: string;',
        '}',
        '',
        'interface UserMembership {',
        '  id: string;',
        '  role: string;',
        '  organization: {',
        '    id: string;',
        '    name: string;',
        '    slug: string;',
        '  };',
        '}',
        '',
        'interface DashboardUser {',
        '  id: string;',
        '  email: string;',
        '  name: string | null;',
        '  role: string;',
        '  memberships: UserMembership[];',
        '  createdAt: string;',
        '}',
        '',
        'interface UsersClientProps {',
        '  initialUsers: DashboardUser[];',
        '  organizations: OrganizationOption[];',
        '  currentRole: string;',
        '  currentUserId: string;',
        '}',
        '',
        'export function UsersClient({ initialUsers, organizations, currentRole, currentUserId }: UsersClientProps) {',
        '  const [users, setUsers] = useState<DashboardUser[]>(initialUsers);',
        '  const [isDialogOpen, setIsDialogOpen] = useState(false);',
        '  const [form, setForm] = useState({',
        "    name: '',",
        "    email: '',",
        "    password: '',",
        "    organizationId: organizations[0]?.id ?? '',",
        '    role: APP_ROLES.USER,',
        '  });',
        '  const [isPending, startTransition] = useTransition();',
        "  const [error, setError] = useState('');",
        '',
        '  const canManageAdmins = currentRole === APP_ROLES.ADMIN;',
        '',
        '  const openDialog = () => {',
        '    setForm({',
        "      name: '',",
        "      email: '',",
        "      password: 'TempPass123!',",
        "      organizationId: organizations[0]?.id ?? '',",
        '      role: canManageAdmins ? APP_ROLES.ORG_ADMIN : APP_ROLES.USER,',
        '    });',
        "    setError('');",
        '    setIsDialogOpen(true);',
        '  };',
        '',
        '  const handleCreate = () => {',
        '    startTransition(async () => {',
        "      setError('');",
        '      try {',
        '        const payload = {',
        '          name: form.name,',
        '          email: form.email,',
        '          password: form.password,',
        '          organizationId: form.organizationId,',
        '          role: form.role,',
        '        };',
        '',
        "        const response = await fetch('/api/users', {",
        "          method: 'POST',",
        "          headers: { 'Content-Type': 'application/json' },",
        '          body: JSON.stringify(payload),',
        '        });',
        '',
        '        if (!response.ok) {',
        '          const data = await response.json().catch(() => ({}));',
        "          throw new Error(data.error || 'ユーザー作成に失敗しました');",
        '        }',
        '',
        '        const data = await response.json();',
        '        setUsers(data.users as DashboardUser[]);',
        '        setIsDialogOpen(false);',
        '      } catch (err: unknown) {',
        "        setError(getErrorMessage(err) || 'ユーザー作成に失敗しました');",
        '      }',
        '    });',
        '  };',
        '',
        '  const handleDelete = (user: DashboardUser) => {',
        '    if (!window.confirm(`${user.email} を削除しますか？`)) {',
        '      return;',
        '    }',
        '',
        '    startTransition(async () => {',
        "      setError('');",
        '      try {',
        '        const res = await fetch(`/api/users/${user.id}`, {',
        "          method: 'DELETE',",
        '        });',
        '',
        '        if (!res.ok) {',
        '          const data = await res.json().catch(() => ({}));',
        "          throw new Error(data.error || '削除に失敗しました');",
        '        }',
        '',
        '        const data = await res.json();',
        '        setUsers(data.users as DashboardUser[]);',
        '      } catch (err: unknown) {',
        '        setError(getErrorMessage(err));',
        '      }',
        '    });',
        '  };',
        '',
        '  const summary = useMemo(() => {',
        '    return {',
        '      total: users.length,',
        '      admin: users.filter((user) => user.role === APP_ROLES.ADMIN).length,',
        '      orgAdmin: users.filter((user) => user.role === APP_ROLES.ORG_ADMIN).length,',
        '      general: users.filter((user) => user.role === APP_ROLES.USER).length,',
        '    };',
        '  }, [users]);',
        '',
        '  return (',
        '    <div className="space-y-6">',
        '      <Card>',
        '        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">',
        '          <div>',
        '            <CardTitle>ユーザー管理</CardTitle>',
        '            <p className="text-sm text-muted-foreground">',
        '              合計 {summary.total} 名 / 管理ユーザー {summary.admin} 名 / 組織管理 {summary.orgAdmin} 名 / 一般 {summary.general} 名',
        '            </p>',
        '          </div>',
        '          <div className="flex w-full flex-col gap-2 md:w-auto md:items-end">',
        '            <Button onClick={openDialog} className="w-full md:w-auto" disabled={organizations.length === 0}>',
        '              <UserPlus className="mr-2 h-4 w-4" /> ユーザーを追加',
        '            </Button>',
        '            {organizations.length === 0 && (',
        '              <p className="text-xs text-muted-foreground">利用可能な組織がありません。先に組織を作成してください。</p>',
        '            )}',
        '          </div>',
        '        </CardHeader>',
        '        <CardContent className="overflow-x-auto">',
        '          <Table>',
        '            <TableHeader>',
        '              <TableRow>',
        '                <TableHead>氏名</TableHead>',
        '                <TableHead>メールアドレス</TableHead>',
        '                <TableHead>ロール</TableHead>',
        '                <TableHead>所属組織</TableHead>',
        '                <TableHead className="w-[120px]">操作</TableHead>',
        '              </TableRow>',
        '            </TableHeader>',
        '            <TableBody>',
        '              {users.map((user) => (',
        '                <TableRow key={user.id}>',
        '                  <TableCell className="font-medium">{user.name ?? \'-\'}</TableCell>',
        '                  <TableCell>{user.email}</TableCell>',
        '                  <TableCell>',
        '                    <Badge variant="outline">{ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] ?? user.role}</Badge>',
        '                  </TableCell>',
        '                  <TableCell>',
        '                    {user.memberships.length > 0',
        '                      ? user.memberships',
        '                          .map((membership) => `${membership.organization.name} (${membership.role})`)',
        "                          .join(', ')",
        "                      : '未所属'}",
        '                  </TableCell>',
        '                  <TableCell>',
        '                    <Button',
        '                      variant="outline"',
        '                      size="icon"',
        '                      onClick={() => handleDelete(user)}',
        '                      disabled={isPending || user.id === currentUserId}',
        '                    >',
        '                      <Trash2 className="h-4 w-4" />',
        '                    </Button>',
        '                  </TableCell>',
        '                </TableRow>',
        '              ))}',
        '              {users.length === 0 && (',
        '                <TableRow>',
        '                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">',
        '                    表示できるユーザーがいません。',
        '                  </TableCell>',
        '                </TableRow>',
        '              )}',
        '            </TableBody>',
        '          </Table>',
        '          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}',
        '        </CardContent>',
        '      </Card>',
        '',
        '      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>',
        '        <DialogContent className="sm:max-w-lg">',
        '          <DialogHeader>',
        '            <DialogTitle>ユーザーを追加</DialogTitle>',
        '          </DialogHeader>',
        '          <div className="space-y-4">',
        '            <div className="space-y-2">',
        '              <Label htmlFor="user-name">氏名</Label>',
        '              <Input',
        '                id="user-name"',
        '                value={form.name}',
        '                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}',
        '                placeholder="山田 太郎"',
        '              />',
        '            </div>',
        '            <div className="space-y-2">',
        '              <Label htmlFor="user-email">メールアドレス</Label>',
        '              <Input',
        '                id="user-email"',
        '                type="email"',
        '                value={form.email}',
        '                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}',
        '                placeholder="user@example.com"',
        '              />',
        '            </div>',
        '            <div className="space-y-2">',
        '              <Label htmlFor="user-password">初期パスワード</Label>',
        '              <Input',
        '                id="user-password"',
        '                type="password"',
        '                value={form.password}',
        '                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}',
        '                placeholder="TempPass123!"',
        '              />',
        '            </div>',
        '            <div className="space-y-2">',
        '              <Label>所属組織</Label>',
        '              <Select',
        '                value={form.organizationId}',
        '                onValueChange={(value) => setForm((prev) => ({ ...prev, organizationId: value }))}',
        '                disabled={organizations.length === 0}',
        '              >',
        '                <SelectTrigger>',
        '                  <SelectValue placeholder="所属組織を選択" />',
        '                </SelectTrigger>',
        '                <SelectContent>',
        '                  {organizations.map((organization) => (',
        '                    <SelectItem key={organization.id} value={organization.id}>',
        '                      {organization.name}',
        '                    </SelectItem>',
        '                  ))}',
        '                </SelectContent>',
        '              </Select>',
        '            </div>',
        '            <div className="space-y-2">',
        '              <Label>ロール</Label>',
        '              <Select value={form.role} onValueChange={(value) => setForm((prev) => ({ ...prev, role: value as string }))}>',
        '                <SelectTrigger>',
        '                  <SelectValue />',
        '                </SelectTrigger>',
        '                <SelectContent>',
        '                  {canManageAdmins && <SelectItem value={APP_ROLES.ADMIN}>管理ユーザー</SelectItem>}',
        '                  <SelectItem value={APP_ROLES.ORG_ADMIN}>組織管理ユーザー</SelectItem>',
        '                  <SelectItem value={APP_ROLES.USER}>一般ユーザー</SelectItem>',
        '                </SelectContent>',
        '              </Select>',
        '              {!canManageAdmins && (',
        '                <p className="text-xs text-muted-foreground">組織管理ユーザーは一般ユーザーのみ作成できます。</p>',
        '              )}',
        '            </div>',
        '          </div>',
        '          {error && <p className="text-sm text-destructive">{error}</p>}',
        '          <DialogFooter>',
        '            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isPending}>',
        '              キャンセル',
        '            </Button>',
        '            <Button onClick={handleCreate} disabled={isPending || organizations.length === 0}>',
        '              作成する',
        '            </Button>',
        '          </DialogFooter>',
        '        </DialogContent>',
        '      </Dialog>',
        '    </div>',
        '  );',
        '}',
        '',
    ];
    const usersClientContent = usersClientContentLines.join('\n');

    await fs.outputFile(path.join(componentsDir, 'users-client.tsx'), usersClientContent);

    const profilePageContent = `import prisma from '@/lib/db';
import { requireSession } from '@/lib/auth-server';
import { ProfileForm } from '@/components/dashboard/profile-form';

export default async function ProfilePage() {
  const session = await requireSession();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      image: true,
      memberships: {
        include: {
          organization: {
            select: { id: true, name: true, slug: true },
          },
        },
      },
    },
  });

  return <ProfileForm user={JSON.parse(JSON.stringify(user))} />;
}
`;

    await fs.outputFile(path.join(groupDir, 'profile/page.tsx'), profilePageContent);

    const profileFormContent = `'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ROLE_LABELS } from '@/lib/roles';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }
  return 'An unknown error occurred';
}

interface MembershipInfo {
  id: string;
  role: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
}

interface ProfileUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  image: string | null;
  memberships: MembershipInfo[];
}

interface ProfileFormProps {
  user: ProfileUser | null;
}

export function ProfileForm({ user }: ProfileFormProps) {
  const [name, setName] = useState(user?.name ?? '');
  const [password, setPassword] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.image ?? null);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>プロフィール</CardTitle>
        </CardHeader>
        <CardContent>ユーザー情報を読み込めませんでした。</CardContent>
      </Card>
    );
  }

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      setStatus(null);
      try {
        const response = await fetch('/api/profile', {
          method: 'PUT',
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'プロフィールの更新に失敗しました');
        }

        const data = await response.json();
        if (data.imageUrl) {
          setAvatarPreview(data.imageUrl);
        }

        setPassword('');
        setStatus({ type: 'success', message: 'プロフィールを更新しました。' });
      } catch (err: unknown) {
        setStatus({ type: 'error', message: getErrorMessage(err) || 'プロフィールの更新に失敗しました。' });
      }
    });
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        if (!formData.get('name')) {
          formData.set('name', name);
        }
        handleSubmit(formData);
      }}
      className="grid gap-6 lg:grid-cols-3"
      encType="multipart/form-data"
    >
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>プロフィール</CardTitle>
          <CardDescription>氏名とパスワード、プロフィール画像を更新できます。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">氏名</Label>
            <Input
              id="name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="山田 太郎"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">パスワード (任意)</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="新しいパスワード"
            />
            <p className="text-xs text-muted-foreground">8文字以上で入力してください。入力しない場合は変更されません。</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="avatar">プロフィール画像</Label>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={avatarPreview ?? undefined} alt={user.name ?? user.email} />
                <AvatarFallback>{(user.name ?? user.email).slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <Input
                id="avatar"
                name="avatar"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                      if (typeof reader.result === 'string') {
                        setAvatarPreview(reader.result);
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">画像をアップロードすると現在のプロフィール画像が更新されます。</p>
          </div>
          {status && (
            <p className={status.type === 'success' ? 'text-sm text-emerald-600' : 'text-sm text-destructive'}>
              {status.message}
            </p>
          )}
          <Button type="submit" disabled={isPending}>
            変更を保存する
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>アカウント情報</CardTitle>
          <CardDescription>権限と所属組織を確認できます。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground">メールアドレス</p>
            <p className="font-medium">{user.email}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">ロール</p>
            <p className="font-medium">{ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] ?? user.role}</p>
          </div>
          <Separator />
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">所属組織</p>
            {user.memberships.length === 0 && <p className="text-sm text-muted-foreground">所属組織が登録されていません。</p>}
            {user.memberships.map((membership) => (
              <div key={membership.id} className="rounded-md border p-3">
                <p className="font-medium">{membership.organization.name}</p>
                <p className="text-xs text-muted-foreground">ロール: {membership.role}</p>
                <p className="text-xs text-muted-foreground">slug: {membership.organization.slug}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
`;

    await fs.outputFile(path.join(componentsDir, 'profile-form.tsx'), profileFormContent);

    const loginPageContent = `'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { signIn } from '@/lib/auth-client';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }
  return 'An unknown error occurred';
}

const TEST_ACCOUNTS = [
  { label: '管理ユーザー', email: 'admin@example.com', password: 'Admin123!' },
  { label: '組織管理ユーザー', email: 'orgadmin@example.com', password: 'OrgAdmin123!' },
  { label: '一般ユーザー', email: 'user@example.com', password: 'User123!' },
];

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('Admin123!');
  const [status, setStatus] = useState<{ type: 'error'; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const prefill = searchParams.get('prefill');
    if (prefill) {
      const candidate = TEST_ACCOUNTS.find((account) => account.email === prefill);
      if (candidate) {
        setEmail(candidate.email);
        setPassword(candidate.password);
      }
    }
  }, [searchParams]);

  const handlePrefill = (account: { email: string; password: string }) => {
    setEmail(account.email);
    setPassword(account.password);
    setStatus(null);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    const redirectTo = searchParams.get('redirect') ?? '/';

    startTransition(async () => {
      try {
        // カスタムAPIエンドポイントを直接呼び出す
        const response = await fetch('/api/auth/sign-in/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            email,
            password,
          }),
        });

        const result = await response.json();

        if (!response.ok || result.error) {
          throw new Error(result.error?.message || 'ログインに失敗しました');
        }

        // ログイン成功後、リダイレクト
        router.push(redirectTo);
        router.refresh(); // ルーターキャッシュを更新
      } catch (err: unknown) {
        setStatus({ type: 'error', message: getErrorMessage(err) || 'ログインに失敗しました' });
      }
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl">fluorite-flake ログイン</CardTitle>
          <CardDescription>サンプルアカウントでログインするか、独自の資格情報を入力してください。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-2">
            {TEST_ACCOUNTS.map((account) => (
              <Button key={account.email} variant="outline" onClick={() => handlePrefill(account)}>
                {account.label}としてログイン情報を入力
              </Button>
            ))}
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="********"
                required
              />
            </div>
            {status && (
              <Alert variant="destructive">
                <AlertDescription>{status.message}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={isPending}>
              ログイン
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
`;

    await fs.ensureDir(path.join(appDir, 'login'));
    await fs.outputFile(path.join(appDir, 'login/page.tsx'), loginPageContent);
}

async function writeApiRoutes(config: ProjectConfig) {
    const apiDir = path.join(config.projectPath, 'src/app/api');
    await fs.ensureDir(apiDir);

    await writeCustomAuthApi(config);
    await writeOrganizationsApi(config);
    await writeUsersApi(config);
    await writeProfileApi(config);
}

async function writeCustomAuthApi(config: ProjectConfig) {
    // Create custom sign-in API route for better login handling
    const signInDir = path.join(config.projectPath, 'src/app/api/auth/sign-in/email');
    const signOutDir = path.join(config.projectPath, 'src/app/api/auth/sign-out');
    await fs.ensureDir(signInDir);
    await fs.ensureDir(signOutDir);

    const signInRouteContent = `import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    console.log('Login attempt for:', email);
    console.log('Password provided:', !!password);

    // Find user in database with their account
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        accounts: {
          where: {
            providerId: 'email-password'
          }
        }
      }
    });

    console.log('User found:', !!user);
    console.log('Accounts found:', user?.accounts?.length || 0);

    if (!user || !user.accounts[0]) {
      console.error('User not found or no accounts:', {
        userExists: !!user,
        accountsLength: user?.accounts?.length || 0
      });
      return NextResponse.json({
        error: { message: 'Invalid credentials' }
      }, { status: 401 });
    }

    // Verify password from the account
    const account = user.accounts[0];
    console.log('Account password exists:', !!account.password);
    console.log('Account password length:', account.password?.length || 0);

    const isValidPassword = await bcrypt.compare(password, account.password || '');
    console.log('Password verification result:', isValidPassword);

    if (!isValidPassword) {
      console.error('Password verification failed for user:', email);
      console.error('Provided password:', password);
      console.error('Stored hash:', account.password);
      return NextResponse.json({
        error: { message: 'Invalid credentials' }
      }, { status: 401 });
    }

    // Create session
    const sessionToken = randomUUID();
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Store session in database
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        expiresAt: expires,
        ipAddress: request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    });

    // Return success response with cookie in headers
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        image: user.image,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        role: user.role
      },
      session: {
        id: session.id,
        userId: user.id,
        token: sessionToken,
        expiresAt: expires.toISOString()
      }
    });

    // Set cookie in response headers
    console.log('Setting session cookie:', sessionToken);
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expires,
      path: '/'
    });

    console.log('Cookie settings:', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expires.toISOString(),
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({
      error: { message: 'Login failed' }
    }, { status: 500 });
  }
}`;

    await fs.outputFile(path.join(signInDir, 'route.ts'), signInRouteContent);

    const signOutRouteContent = `import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (sessionCookie?.value) {
      // Delete session from database
      await prisma.session.deleteMany({
        where: {
          token: sessionCookie.value
        }
      });
    }

    // Create response and clear cookie
    const response = NextResponse.json({ success: true });
    response.cookies.delete('session');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({
      error: { message: 'Logout failed' }
    }, { status: 500 });
  }
}`;

    await fs.outputFile(path.join(signOutDir, 'route.ts'), signOutRouteContent);
}

async function writeOrganizationsApi(config: ProjectConfig) {
    const dir = path.join(config.projectPath, 'src/app/api/organizations');
    const organizationIdDir = path.join(dir, '[id]');
    await fs.ensureDir(dir);
    await fs.ensureDir(organizationIdDir);

    const collectionRoute = `import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import prisma from '@/lib/db';
import { auth } from '@/lib/auth';
import { APP_ROLES } from '@/lib/roles';
import { toSlug } from '@/lib/to-slug';

export const runtime = 'nodejs';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const organizations = await prisma.organization.findMany({
    include: {
      members: {
        include: {
          user: {
            select: { id: true, email: true, name: true, role: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ organizations });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session || session.user.role !== APP_ROLES.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const payload = await request.json();
  const name = String(payload.name ?? '').trim();
  const slug = String(payload.slug ?? '') || toSlug(name);

  if (!name) {
    return NextResponse.json({ error: '組織名は必須です。' }, { status: 400 });
  }

  const metadata = payload.metadata && typeof payload.metadata === 'object'
    ? JSON.stringify(payload.metadata)
    : undefined;

  await prisma.organization.create({
    data: {
      name,
      slug,
      metadata,
    },
  });

  const organizations = await prisma.organization.findMany({
    include: {
      members: {
        include: {
          user: {
            select: { id: true, email: true, name: true, role: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ organizations });
}
`;

    await fs.outputFile(path.join(dir, 'route.ts'), collectionRoute);

    const singleRoute = `import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import prisma from '@/lib/db';
import { auth } from '@/lib/auth';
import { APP_ROLES } from '@/lib/roles';
import { toSlug } from '@/lib/to-slug';

export const runtime = 'nodejs';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session || session.user.role !== APP_ROLES.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const payload = await request.json();
  const name = String(payload.name ?? '').trim();
  const slug = String(payload.slug ?? '') || toSlug(name);
  const metadata = payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : undefined;

  if (!name) {
    return NextResponse.json({ error: '組織名は必須です。' }, { status: 400 });
  }

  await prisma.organization.update({
    where: { id: params.id },
    data: {
      name,
      slug,
      metadata,
    },
  });

  const organizations = await prisma.organization.findMany({
    include: {
      members: {
        include: {
          user: {
            select: { id: true, email: true, name: true, role: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ organizations });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session || session.user.role !== APP_ROLES.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.member.deleteMany({ where: { organizationId: params.id } });
  await prisma.invitation.deleteMany({ where: { organizationId: params.id } });
  await prisma.organization.delete({ where: { id: params.id } });

  const organizations = await prisma.organization.findMany({
    include: {
      members: {
        include: {
          user: {
            select: { id: true, email: true, name: true, role: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ organizations });
}
`;

    await fs.outputFile(path.join(organizationIdDir, 'route.ts'), singleRoute);
}

async function writeUsersApi(config: ProjectConfig) {
    const dir = path.join(config.projectPath, 'src/app/api/users');
    const userIdDir = path.join(dir, '[id]');
    await fs.ensureDir(dir);
    await fs.ensureDir(userIdDir);

    const collectionRoute = `import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { auth } from '@/lib/auth';
import { APP_ROLES } from '@/lib/roles';

export const runtime = 'nodejs';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role as string;
  const organizations = await prisma.member.findMany({
    where: { userId: session.user.id },
    select: { organizationId: true },
  });

  const organizationIds = organizations.map((membership) => membership.organizationId);

  const users = await prisma.user.findMany({
    where: role === APP_ROLES.ADMIN ? undefined : {
      memberships: {
        some: {
          organizationId: { in: organizationIds },
        },
      },
    },
    include: {
      memberships: {
        include: {
          organization: {
            select: { id: true, name: true, slug: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role as string;
  if (role !== APP_ROLES.ADMIN && role !== APP_ROLES.ORG_ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const payload = await request.json();
  const name = String(payload.name ?? '').trim();
  const email = String(payload.email ?? '').trim();
  const password = String(payload.password ?? '');
  const organizationId = String(payload.organizationId ?? '');
  const requestedRole = String(payload.role ?? APP_ROLES.USER);

  if (!email || !password || !organizationId) {
    return NextResponse.json({ error: 'メールアドレス・パスワード・所属組織は必須です。' }, { status: 400 });
  }

  if (role === APP_ROLES.ORG_ADMIN && requestedRole === APP_ROLES.ADMIN) {
    return NextResponse.json({ error: '組織管理ユーザーは管理ユーザーを作成できません。' }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      role: requestedRole,
      accounts: {
        create: {
          providerId: 'email-password',
          accountId: email,
          password: hashedPassword,
        },
      },
      memberships: {
        create: {
          organizationId,
          role: requestedRole,
        },
      },
    },
    include: {
      memberships: {
        include: {
          organization: {
            select: { id: true, name: true, slug: true },
          },
        },
      },
    },
  });

  const users = await prisma.user.findMany({
    where: role === APP_ROLES.ADMIN ? undefined : {
      memberships: {
        some: {
          organizationId: {
            in: await prisma.member.findMany({
              where: { userId: session.user.id },
              select: { organizationId: true },
            }).then((memberships) => memberships.map((membership) => membership.organizationId)),
          },
        },
      },
    },
    include: {
      memberships: {
        include: {
          organization: {
            select: { id: true, name: true, slug: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ users, createdUserId: user.id });
}
`;

    await fs.outputFile(path.join(dir, 'route.ts'), collectionRoute);

    const singleRoute = `import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { auth } from '@/lib/auth';
import { APP_ROLES } from '@/lib/roles';

export const runtime = 'nodejs';

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role as string;
  if (role !== APP_ROLES.ADMIN && role !== APP_ROLES.ORG_ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (session.user.id === params.id) {
    return NextResponse.json({ error: '自分自身を削除することはできません。' }, { status: 400 });
  }

  if (role === APP_ROLES.ORG_ADMIN) {
    const organizations = await prisma.member.findMany({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });
    const organizationIds = organizations.map((membership) => membership.organizationId);

    const targetMember = await prisma.member.findFirst({
      where: {
        userId: params.id,
        organizationId: { in: organizationIds },
      },
    });

    if (!targetMember) {
      return NextResponse.json({ error: '許可されていない操作です。' }, { status: 403 });
    }
  }

  await prisma.member.deleteMany({ where: { userId: params.id } });
  await prisma.account.deleteMany({ where: { userId: params.id } });
  await prisma.session.deleteMany({ where: { userId: params.id } });
  await prisma.user.delete({ where: { id: params.id } });

  const users = await prisma.user.findMany({
    where: role === APP_ROLES.ADMIN ? undefined : {
      memberships: {
        some: {
          organizationId: {
            in: await prisma.member.findMany({
              where: { userId: session.user.id },
              select: { organizationId: true },
            }).then((memberships) => memberships.map((membership) => membership.organizationId)),
          },
        },
      },
    },
    include: {
      memberships: {
        include: {
          organization: {
            select: { id: true, name: true, slug: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ users });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role as string;
  if (role !== APP_ROLES.ADMIN && role !== APP_ROLES.ORG_ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const payload = await request.json();
  const targetRole = String(payload.role ?? APP_ROLES.USER);
  const organizationId = String(payload.organizationId ?? '');

  if (role === APP_ROLES.ORG_ADMIN && targetRole === APP_ROLES.ADMIN) {
    return NextResponse.json({ error: '組織管理ユーザーは管理ユーザーを設定できません。' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: params.id },
    data: {
      role: targetRole,
      memberships: {
        deleteMany: {},
        ...(organizationId
          ? {
              create: {
                organizationId,
                role: targetRole,
              },
            }
          : {}),
      },
    },
  });

  const users = await prisma.user.findMany({
    where: role === APP_ROLES.ADMIN ? undefined : {
      memberships: {
        some: {
          organizationId: {
            in: await prisma.member.findMany({
              where: { userId: session.user.id },
              select: { organizationId: true },
            }).then((memberships) => memberships.map((membership) => membership.organizationId)),
          },
        },
      },
    },
    include: {
      memberships: {
        include: {
          organization: {
            select: { id: true, name: true, slug: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ users });
}
`;

    await fs.outputFile(path.join(userIdDir, 'route.ts'), singleRoute);
}

async function writeProfileApi(config: ProjectConfig) {
    const dir = path.join(config.projectPath, 'src/app/api/profile');
    await fs.ensureDir(dir);

    const routeContent = `import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { auth } from '@/lib/auth';
import { saveProfileImage } from '@/lib/profile-upload';

export const runtime = 'nodejs';

export async function PUT(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const name = formData.get('name')?.toString().trim();
  const password = formData.get('password')?.toString();
  const avatar = formData.get('avatar');

  const updateData: Record<string, unknown> = {};

  if (name) {
    updateData.name = name;
  }

  if (avatar instanceof File && avatar.size > 0) {
    const imageUrl = await saveProfileImage(avatar, session.user.id);
    updateData.image = imageUrl;
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
    });
  }

  if (password) {
    if (password.length < 8) {
      return NextResponse.json({ error: 'パスワードは8文字以上で入力してください。' }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 12);
    const existingAccount = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        providerId: 'email-password',
      },
    });

    if (existingAccount) {
      await prisma.account.update({
        where: { id: existingAccount.id },
        data: { password: hashed },
      });
    } else {
      await prisma.account.create({
        data: {
          userId: session.user.id,
          providerId: 'email-password',
          accountId: session.user.email ?? session.user.id,
          password: hashed,
        },
      });
    }
  }

  const refreshedUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      image: true,
      role: true,
    },
  });

  return NextResponse.json({
    success: true,
    imageUrl: refreshedUser?.image ?? null,
  });
}
`;

    await fs.outputFile(path.join(dir, 'route.ts'), routeContent);
}

async function writeProfileUploadHelper(config: ProjectConfig) {
    const helperPath = path.join(config.projectPath, 'src/lib/profile-upload.ts');

    if (config.storage === 'none') {
        const uploadsDir = path.join(config.projectPath, 'public/uploads');
        await fs.ensureDir(uploadsDir);
        await fs.outputFile(path.join(uploadsDir, '.gitkeep'), '');

        const helperLines = [
            "import path from 'node:path';",
            "import fs from 'fs-extra';",
            '',
            "const uploadsDir = path.join(process.cwd(), 'public', 'uploads');",
            '',
            'async function ensureUploadsDir() {',
            '  await fs.ensureDir(uploadsDir);',
            '}',
            '',
            'export async function saveProfileImage(file: File, userId: string) {',
            '  await ensureUploadsDir();',
            '  const arrayBuffer = await file.arrayBuffer();',
            '  const buffer = Buffer.from(arrayBuffer);',
            "  const extension = file.name.split('.').pop()?.toLowerCase() || 'png';",
            '  const filename = `${userId}-${Date.now()}.${extension}`;',
            '  const storagePath = path.join(uploadsDir, filename);',
            '  await fs.outputFile(storagePath, buffer);',
            '  return `/uploads/${filename}`;',
            '}',
        ];

        await fs.outputFile(helperPath, helperLines.join('\n'));
    } else {
        const helperLines = [
            "import { uploadBuffer } from '@/lib/storage';",
            '',
            'export async function saveProfileImage(file: File, userId: string) {',
            '  const arrayBuffer = await file.arrayBuffer();',
            '  const buffer = Buffer.from(arrayBuffer);',
            "  const extension = file.name.split('.').pop()?.toLowerCase() || 'png';",
            '  const filename = `profiles/${userId}-${Date.now()}.${extension}`;',
            "  return uploadBuffer(buffer, filename, file.type || 'application/octet-stream');",
            '}',
        ];

        await fs.outputFile(helperPath, helperLines.join('\n'));
    }
}

async function appendEnv(config: ProjectConfig, block: string) {
    await appendEnvFile(path.join(config.projectPath, '.env.local'), block);
    await appendEnvFile(path.join(config.projectPath, '.env'), block);
}

async function appendEnvFile(envPath: string, block: string) {
    let existing = '';

    try {
        existing = await fs.readFile(envPath, 'utf-8');
    } catch (_error) {
        // file does not exist yet
    }

    const linesToAdd = block
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    const linesMissing = linesToAdd.filter((line) => !existing.includes(line));

    if (linesMissing.length === 0) {
        return;
    }

    const newline = existing.endsWith('\n') || existing.length === 0 ? '' : '\n';
    const updated = `${existing}${newline}${linesMissing.join('\n')}\n`;
    await fs.outputFile(envPath, updated);
}

async function writeHelperFunctions(config: ProjectConfig) {
    // Write error helper function
    const errorHelperContent = `export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }
  return 'An unknown error occurred';
}
`;

    const helperPath = path.join(config.projectPath, 'src/lib/error-helper.ts');
    await fs.outputFile(helperPath, errorHelperContent);
}

async function updateSeedFileForAuth(config: ProjectConfig) {
    // Update the seed file with proper auth test users
    const seedContent = `import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { APP_ROLES } from '../src/lib/roles';

const prisma = new PrismaClient();

async function main() {
  // Clean up existing data (handle empty database gracefully)
  try {
    await prisma.post.deleteMany();
    await prisma.invitation.deleteMany();
    await prisma.member.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
  } catch (_error) {
    console.log('Database cleanup skipped (fresh database)');
  }

  // Create passwords for test users
  const adminPassword = await bcrypt.hash('Admin123!', 12);
  const orgAdminPassword = await bcrypt.hash('OrgAdmin123!', 12);
  const userPassword = await bcrypt.hash('User123!', 12);

  // Create test organizations
  const techCorp = await prisma.organization.create({
    data: {
      name: 'Tech Corp',  // Changed to match test expectations
      slug: 'tech-corp',
      metadata: JSON.stringify({
        industry: 'Technology',
        size: 'Enterprise',
      }),
    },
  });

  const startupInc = await prisma.organization.create({
    data: {
      name: 'Startup Inc',
      slug: 'startup-inc',
      metadata: JSON.stringify({
        industry: 'SaaS',
        size: 'Startup',
      }),
    },
  });

  // Create admin user (full system access)
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: '管理者ユーザー',
      emailVerified: true,
      role: APP_ROLES.ADMIN,
      accounts: {
        create: {
          providerId: 'email-password',
          accountId: 'admin@example.com',
          password: adminPassword,
        },
      },
      memberships: {
        create: [
          {
            organizationId: techCorp.id,
            role: APP_ROLES.ADMIN,
          },
          {
            organizationId: startupInc.id,
            role: APP_ROLES.ADMIN,
          },
        ],
      },
    },
  });

  // Create org admin user (manages specific organizations)
  const orgAdmin = await prisma.user.create({
    data: {
      email: 'orgadmin@example.com',
      name: '組織管理者',
      emailVerified: true,
      role: APP_ROLES.ORG_ADMIN,
      accounts: {
        create: {
          providerId: 'email-password',
          accountId: 'orgadmin@example.com',
          password: orgAdminPassword,
        },
      },
      memberships: {
        create: {
          organizationId: techCorp.id,
          role: APP_ROLES.ORG_ADMIN,
        },
      },
    },
  });

  // Create regular user
  const user = await prisma.user.create({
    data: {
      email: 'user@example.com',
      name: '一般ユーザー',
      emailVerified: true,
      role: APP_ROLES.USER,
      accounts: {
        create: {
          providerId: 'email-password',
          accountId: 'user@example.com',
          password: userPassword,
        },
      },
      memberships: {
        create: {
          organizationId: techCorp.id,
          role: APP_ROLES.USER,
        },
      },
    },
  });

  // Create additional test users (for backward compatibility)
  const alice = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      name: 'Alice Johnson',
      emailVerified: true,
      role: APP_ROLES.USER,
      accounts: {
        create: {
          providerId: 'email-password',
          accountId: 'alice@example.com',
          password: await bcrypt.hash('Demo123!', 12),
        },
      },
      memberships: {
        create: {
          organizationId: startupInc.id,
          role: APP_ROLES.USER,
        },
      },
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      name: 'Bob Smith',
      emailVerified: true,
      role: APP_ROLES.USER,
      accounts: {
        create: {
          providerId: 'email-password',
          accountId: 'bob@example.com',
          password: await bcrypt.hash('Demo123!', 12),
        },
      },
      memberships: {
        create: {
          organizationId: startupInc.id,
          role: APP_ROLES.ORG_ADMIN,
        },
      },
    },
  });

  const charlie = await prisma.user.create({
    data: {
      email: 'charlie@example.com',
      name: 'Charlie Brown',
      emailVerified: false,
      role: APP_ROLES.USER,
      accounts: {
        create: {
          providerId: 'email-password',
          accountId: 'charlie@example.com',
          password: await bcrypt.hash('Demo123!', 12),
        },
      },
    },
  });

  // Create demo posts
  await prisma.post.createMany({
    data: [
      {
        title: 'Getting Started with Better Auth',
        content: 'Better Auth provides a comprehensive authentication solution with role-based access control, organizations, and more.',
        published: true,
        authorId: admin.id,
      },
      {
        title: 'Organization Management Best Practices',
        content: 'Learn how to effectively manage multiple organizations with role-based permissions.',
        published: true,
        authorId: orgAdmin.id,
      },
      {
        title: 'User Onboarding Guide',
        content: 'A step-by-step guide to onboarding new users to your platform.',
        published: true,
        authorId: user.id,
      },
      {
        title: 'Draft: Security Considerations',
        content: 'This post about security is still being written...',
        published: false,
        authorId: alice.id,
      },
      {
        title: 'Team Collaboration Features',
        content: 'Explore the collaboration features available within organizations.',
        published: true,
        authorId: bob.id,
      },
      {
        title: 'Testing Authentication Features',
        content: 'This post demonstrates the authentication and authorization features.',
        published: true,
        authorId: charlie.id,
      },
    ],
  });

  // Create pending invitations
  await prisma.invitation.createMany({
    data: [
      {
        email: 'pending@example.com',
        role: APP_ROLES.USER,
        status: 'pending',
        organizationId: techCorp.id,
        invitedBy: admin.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      },
      {
        email: 'another@example.com',
        role: APP_ROLES.ORG_ADMIN,
        status: 'pending',
        organizationId: startupInc.id,
        invitedBy: orgAdmin.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  console.log('✅ Database seeded successfully!');
  console.log('');
  console.log('📊 Created:');
  console.log('   - 2 organizations (Tech Corp, Startup Inc)');
  console.log('   - 6 users with different roles');
  console.log('   - 6 posts (5 published, 1 draft)');
  console.log('   - 2 pending invitations');
  console.log('');
  console.log('🔐 Test Accounts:');
  console.log('   Admin:       admin@example.com / Admin123!');
  console.log('   Org Admin:   orgadmin@example.com / OrgAdmin123!');
  console.log('   User:        user@example.com / User123!');
  console.log('   Demo Users:  alice@example.com, bob@example.com / Demo123!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('❌ Seeding failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
`;

    const seedPath = path.join(config.projectPath, 'prisma/seed.ts');
    await fs.outputFile(seedPath, seedContent);
}
