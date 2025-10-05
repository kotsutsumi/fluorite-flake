/**
 * Next.js Full-Stack Admin Template ジェネレーター (Part 3)
 *
 * アプリケーションページ、スタイル設定、Vercelスクリプトの実装
 */
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * アプリケーションページを作成
 */
export async function createAppPages(
    targetDirectory: string,
    isJavaScript: boolean,
    filesCreated: string[]
): Promise<void> {
    const ext = isJavaScript ? "jsx" : "tsx";

    // ルートレイアウト
    const rootLayout = `import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/lib/auth";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata${isJavaScript ? "" : ": Metadata"} = {
    title: "Fluorite Admin",
    description: "フルスタック管理システム",
};

export default async function RootLayout({
    children,
}${isJavaScript ? "" : ": {\n    children: React.ReactNode;\n}"}) {
    const session = await auth();

    return (
        <html lang="ja">
            <body className={inter.className}>
                <SessionProvider session={session}>
                    {children}
                </SessionProvider>
            </body>
        </html>
    );
}
`;

    await writeFile(
        join(targetDirectory, `app/layout.${ext}`),
        rootLayout
    );
    filesCreated.push(`app/layout.${ext}`);

    // ホームページ（リダイレクト）
    const homePage = `import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function HomePage() {
    const session = await auth();

    if (session) {
        redirect("/dashboard");
    } else {
        redirect("/login");
    }
}
`;

    await writeFile(
        join(targetDirectory, `app/page.${ext}`),
        homePage
    );
    filesCreated.push(`app/page.${ext}`);

    // ログインページ
    const loginPage = `import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/components/auth/login-form";

export const metadata${isJavaScript ? "" : ": Metadata"} = {
    title: "ログイン | Fluorite Admin",
    description: "管理システムにログイン",
};

export default async function LoginPage() {
    const session = await auth();

    if (session) {
        redirect("/dashboard");
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Fluorite Admin
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        管理システムにログインしてください
                    </p>
                </div>
                <LoginForm />
            </div>
        </div>
    );
}
`;

    await writeFile(
        join(targetDirectory, `app/(auth)/login/page.${ext}`),
        loginPage
    );
    filesCreated.push(`app/(auth)/login/page.${ext}`);

    // ダッシュボードレイアウト
    const dashboardLayout = `import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Navigation } from "@/components/dashboard/navigation";

export default async function DashboardLayout({
    children,
}${isJavaScript ? "" : ": {\n    children: React.ReactNode;\n}"}) {
    const session = await auth();

    if (!session) {
        redirect("/login");
    }

    return (
        <div className="flex h-screen bg-gray-100">
            <div className="w-64 flex-shrink-0">
                <Navigation />
            </div>
            <div className="flex-1 overflow-auto">
                <main className="p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
`;

    await writeFile(
        join(targetDirectory, `app/(dashboard)/layout.${ext}`),
        dashboardLayout
    );
    filesCreated.push(`app/(dashboard)/layout.${ext}`);

    // ダッシュボードページ
    const dashboardPage = `import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, UserCheck, Activity } from "lucide-react";

async function getDashboardStats() {
    const [userCount, organizationCount, activeUsers] = await Promise.all([
        prisma.user.count(),
        prisma.organization.count(),
        prisma.user.count({
            where: {
                sessions: {
                    some: {
                        expires: {
                            gt: new Date(),
                        },
                    },
                },
            },
        }),
    ]);

    return {
        userCount,
        organizationCount,
        activeUsers,
        systemStatus: "正常",
    };
}

export default async function DashboardPage() {
    const session = await auth();
    const stats = await getDashboardStats();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
                <p className="mt-2 text-gray-600">
                    おかえりなさい、{session?.user?.name}さん
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            総ユーザー数
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.userCount}</div>
                        <p className="text-xs text-muted-foreground">
                            登録されているユーザー
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            組織数
                        </CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.organizationCount}</div>
                        <p className="text-xs text-muted-foreground">
                            登録されている組織
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            アクティブユーザー
                        </CardTitle>
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.activeUsers}</div>
                        <p className="text-xs text-muted-foreground">
                            現在ログイン中
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            システム状態
                        </CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {stats.systemStatus}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            すべてのサービスが正常
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>最近の活動</CardTitle>
                        <CardDescription>
                            システムの最新の活動状況
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center space-x-4">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <div>
                                    <p className="text-sm font-medium">新しいユーザーが登録されました</p>
                                    <p className="text-xs text-gray-500">2分前</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-4">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <div>
                                    <p className="text-sm font-medium">組織設定が更新されました</p>
                                    <p className="text-xs text-gray-500">1時間前</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-4">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                <div>
                                    <p className="text-sm font-medium">システムメンテナンスが完了しました</p>
                                    <p className="text-xs text-gray-500">3時間前</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>クイックアクション</CardTitle>
                        <CardDescription>
                            よく使用される操作のショートカット
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <button className="w-full text-left p-3 rounded-md hover:bg-gray-100 transition-colors">
                                <div className="font-medium">新しいユーザーを追加</div>
                                <div className="text-sm text-gray-500">システムに新しいユーザーを登録</div>
                            </button>
                            <button className="w-full text-left p-3 rounded-md hover:bg-gray-100 transition-colors">
                                <div className="font-medium">組織を作成</div>
                                <div className="text-sm text-gray-500">新しい組織を作成</div>
                            </button>
                            <button className="w-full text-left p-3 rounded-md hover:bg-gray-100 transition-colors">
                                <div className="font-medium">システム設定</div>
                                <div className="text-sm text-gray-500">システム全体の設定を変更</div>
                            </button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
`;

    await writeFile(
        join(targetDirectory, `app/(dashboard)/page.${ext}`),
        dashboardPage
    );
    filesCreated.push(`app/(dashboard)/page.${ext}`);

    // ユーザー一覧ページ
    const usersPage = `import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatRole } from "@/lib/utils";
import { Plus, Edit, Trash2 } from "lucide-react";

async function getUsers() {
    return await prisma.user.findMany({
        include: {
            organization: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
}

export default async function UsersPage() {
    const session = await auth();
    const users = await getUsers();

    const canManageUsers = session?.user?.role === "ADMIN" || session?.user?.role === "MANAGER";

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">ユーザー管理</h1>
                    <p className="mt-2 text-gray-600">
                        システムに登録されているユーザーを管理
                    </p>
                </div>
                {canManageUsers && (
                    <Button asChild>
                        <Link href="/dashboard/users/create">
                            <Plus className="mr-2 h-4 w-4" />
                            新しいユーザー
                        </Link>
                    </Button>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>ユーザー一覧</CardTitle>
                    <CardDescription>
                        登録されているすべてのユーザー ({users.length}人)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-3 px-4 font-medium">名前</th>
                                    <th className="text-left py-3 px-4 font-medium">メール</th>
                                    <th className="text-left py-3 px-4 font-medium">ロール</th>
                                    <th className="text-left py-3 px-4 font-medium">組織</th>
                                    <th className="text-left py-3 px-4 font-medium">登録日</th>
                                    {canManageUsers && (
                                        <th className="text-left py-3 px-4 font-medium">操作</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} className="border-b hover:bg-gray-50">
                                        <td className="py-3 px-4">
                                            <div>
                                                <div className="font-medium">{user.name}</div>
                                                <div className="text-sm text-gray-500">{user.id}</div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">{user.email}</td>
                                        <td className="py-3 px-4">
                                            <span className={clsx(
                                                "px-2 py-1 rounded-full text-xs font-medium",
                                                user.role === "ADMIN" && "bg-red-100 text-red-800",
                                                user.role === "MANAGER" && "bg-blue-100 text-blue-800",
                                                user.role === "USER" && "bg-green-100 text-green-800"
                                            )}>
                                                {formatRole(user.role)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            {user.organization?.name || "未所属"}
                                        </td>
                                        <td className="py-3 px-4">
                                            {formatDate(user.createdAt)}
                                        </td>
                                        {canManageUsers && (
                                            <td className="py-3 px-4">
                                                <div className="flex space-x-2">
                                                    <Button size="sm" variant="outline" asChild>
                                                        <Link href={\`/dashboard/users/\${user.id}\`}>
                                                            <Edit className="h-3 w-3" />
                                                        </Link>
                                                    </Button>
                                                    <Button size="sm" variant="outline">
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
`;

    await writeFile(
        join(targetDirectory, `app/(dashboard)/users/page.${ext}`),
        usersPage
    );
    filesCreated.push(`app/(dashboard)/users/page.${ext}`);

    // 組織一覧ページ
    const organizationsPage = `import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { Plus, Edit, Trash2, Users } from "lucide-react";

async function getOrganizations() {
    return await prisma.organization.findMany({
        include: {
            _count: {
                select: {
                    users: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
}

export default async function OrganizationsPage() {
    const session = await auth();
    const organizations = await getOrganizations();

    const canManageOrganizations = session?.user?.role === "ADMIN";

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">組織管理</h1>
                    <p className="mt-2 text-gray-600">
                        システムに登録されている組織を管理
                    </p>
                </div>
                {canManageOrganizations && (
                    <Button asChild>
                        <Link href="/dashboard/organizations/create">
                            <Plus className="mr-2 h-4 w-4" />
                            新しい組織
                        </Link>
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {organizations.map((organization) => (
                    <Card key={organization.id}>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-lg">{organization.name}</CardTitle>
                                    <CardDescription className="mt-1">
                                        {organization.description || "説明なし"}
                                    </CardDescription>
                                </div>
                                {canManageOrganizations && (
                                    <div className="flex space-x-1">
                                        <Button size="sm" variant="outline" asChild>
                                            <Link href={\`/dashboard/organizations/\${organization.id}\`}>
                                                <Edit className="h-3 w-3" />
                                            </Link>
                                        </Button>
                                        <Button size="sm" variant="outline">
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex items-center text-sm text-gray-600">
                                    <Users className="mr-2 h-4 w-4" />
                                    {organization._count.users} ユーザー
                                </div>
                                {organization.website && (
                                    <div className="text-sm">
                                        <a
                                            href={organization.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline"
                                        >
                                            Webサイト
                                        </a>
                                    </div>
                                )}
                                <div className="text-xs text-gray-500">
                                    作成日: {formatDate(organization.createdAt)}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {organizations.length === 0 && (
                <Card>
                    <CardContent className="text-center py-12">
                        <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-4 text-lg font-medium text-gray-900">
                            組織が見つかりません
                        </h3>
                        <p className="mt-2 text-gray-600">
                            まだ組織が登録されていません。
                        </p>
                        {canManageOrganizations && (
                            <Button className="mt-4" asChild>
                                <Link href="/dashboard/organizations/create">
                                    <Plus className="mr-2 h-4 w-4" />
                                    最初の組織を作成
                                </Link>
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
`;

    await writeFile(
        join(targetDirectory, `app/(dashboard)/organizations/page.${ext}`),
        organizationsPage
    );
    filesCreated.push(`app/(dashboard)/organizations/page.${ext}`);
}

/**
 * スタイル設定を作成
 */
export async function createStyleConfig(
    targetDirectory: string,
    filesCreated: string[]
): Promise<void> {
    // globals.css
    const globalStyles = `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
    :root {
        --background: 0 0% 100%;
        --foreground: 222.2 84% 4.9%;
        --card: 0 0% 100%;
        --card-foreground: 222.2 84% 4.9%;
        --popover: 0 0% 100%;
        --popover-foreground: 222.2 84% 4.9%;
        --primary: 221.2 83.2% 53.3%;
        --primary-foreground: 210 40% 98%;
        --secondary: 210 40% 96%;
        --secondary-foreground: 222.2 84% 4.9%;
        --muted: 210 40% 96%;
        --muted-foreground: 215.4 16.3% 46.9%;
        --accent: 210 40% 96%;
        --accent-foreground: 222.2 84% 4.9%;
        --destructive: 0 84.2% 60.2%;
        --destructive-foreground: 210 40% 98%;
        --border: 214.3 31.8% 91.4%;
        --input: 214.3 31.8% 91.4%;
        --ring: 221.2 83.2% 53.3%;
        --radius: 0.5rem;
    }

    .dark {
        --background: 222.2 84% 4.9%;
        --foreground: 210 40% 98%;
        --card: 222.2 84% 4.9%;
        --card-foreground: 210 40% 98%;
        --popover: 222.2 84% 4.9%;
        --popover-foreground: 210 40% 98%;
        --primary: 217.2 91.2% 59.8%;
        --primary-foreground: 222.2 84% 4.9%;
        --secondary: 217.2 32.6% 17.5%;
        --secondary-foreground: 210 40% 98%;
        --muted: 217.2 32.6% 17.5%;
        --muted-foreground: 215 20.2% 65.1%;
        --accent: 217.2 32.6% 17.5%;
        --accent-foreground: 210 40% 98%;
        --destructive: 0 62.8% 30.6%;
        --destructive-foreground: 210 40% 98%;
        --border: 217.2 32.6% 17.5%;
        --input: 217.2 32.6% 17.5%;
        --ring: 224.3 76.3% 94.1%;
    }
}

@layer base {
    * {
        @apply border-border;
    }
    body {
        @apply bg-background text-foreground;
    }
}

@layer components {
    .container {
        @apply max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8;
    }

    .btn {
        @apply inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background;
    }

    .form-input {
        @apply flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50;
    }

    .form-label {
        @apply text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70;
    }

    .form-error {
        @apply text-sm font-medium text-destructive;
    }
}

@layer utilities {
    .text-balance {
        text-wrap: balance;
    }
}
`;

    await writeFile(
        join(targetDirectory, "app/globals.css"),
        globalStyles
    );
    filesCreated.push("app/globals.css");
}

/**
 * Vercel 統合スクリプトを作成
 */
export async function createVercelScripts(
    targetDirectory: string,
    filesCreated: string[]
): Promise<void> {
    // Vercel 環境変数セットアップスクリプト
    const vercelEnvSetup = `#!/bin/bash
set -e

echo "🔧 Vercel環境変数セットアップ開始..."

# 環境変数ファイルの存在確認
if [[ ! -f .env.example ]]; then
    echo "❌ .env.example ファイルが見つかりません"
    exit 1
fi

echo "📋 利用可能な環境変数:"
echo "  - DATABASE_URL (データベース接続文字列)"
echo "  - NEXTAUTH_SECRET (NextAuth.js認証シークレット)"
echo "  - NEXTAUTH_URL (NextAuth.js認証URL)"
echo ""

# 各環境での環境変数設定
echo "🏗️  Development環境の設定..."
if [[ -f .env.development ]]; then
    while IFS= read -r line; do
        if [[ $line =~ ^[A-Z_]+= ]]; then
            var_name=$(echo "$line" | cut -d'=' -f1)
            echo "  設定中: $var_name"
            echo "$line" | vercel env add --environment development
        fi
    done < .env.development
else
    echo "⚠️  .env.development が見つかりません"
fi

echo "🚀 Production環境の設定..."
if [[ -f .env.production ]]; then
    while IFS= read -r line; do
        if [[ $line =~ ^[A-Z_]+= ]]; then
            var_name=$(echo "$line" | cut -d'=' -f1)
            echo "  設定中: $var_name"
            echo "$line" | vercel env add --environment production
        fi
    done < .env.production
else
    echo "⚠️  .env.production が見つかりません"
fi

echo "🔍 設定された環境変数の確認..."
vercel env ls

echo "✅ Vercel環境変数セットアップ完了"
echo ""
echo "📝 次のステップ:"
echo "  1. vercel deploy --prod でデプロイを実行"
echo "  2. 環境変数の値を確認・更新"
echo "  3. データベースマイグレーションを実行"
`;

    await writeFile(
        join(targetDirectory, "scripts/vercel-env-setup.sh"),
        vercelEnvSetup
    );
    filesCreated.push("scripts/vercel-env-setup.sh");

    // 環境変数エクスポートスクリプト
    const envExport = `const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

/**
 * 環境変数をZIPファイルにエクスポート
 */
async function exportEnvToZip() {
    try {
        console.log('📦 環境変数のエクスポートを開始...');

        const output = fs.createWriteStream('env-backup.zip');
        const archive = archiver('zip', { zlib: { level: 9 } });

        archive.pipe(output);

        // .env ファイルの存在確認とアーカイブ追加
        const envFiles = [
            '.env.example',
            '.env.local',
            '.env.development',
            '.env.production'
        ];

        let addedFiles = 0;

        for (const file of envFiles) {
            if (fs.existsSync(file)) {
                archive.file(file, { name: file.replace('.', '') });
                addedFiles++;
                console.log(\`  ✓ \${file} を追加\`);
            } else {
                console.log(\`  ⚠️  \${file} が見つかりません（スキップ）\`);
            }
        }

        if (addedFiles === 0) {
            console.log('❌ エクスポートする環境変数ファイルが見つかりません');
            return;
        }

        // README ファイルの追加
        const readmeContent = \`# 環境変数バックアップ

このZIPファイルには以下の環境変数ファイルが含まれています:

## ファイル一覧
- env-example: 環境変数のサンプル
- env-local: ローカル開発用環境変数
- env-development: 開発環境用環境変数
- env-production: 本番環境用環境変数

## 復元方法
1. 適切なディレクトリにファイルを配置
2. ファイル名を元に戻す（例: env-local → .env.local）
3. 必要に応じて値を更新

## セキュリティ注意事項
⚠️ このファイルには機密情報が含まれている可能性があります
- 安全な場所に保管してください
- 不要になったら削除してください
- 他人と共有しないでください

作成日時: \${new Date().toISOString()}
\`;

        archive.append(readmeContent, { name: 'README.txt' });

        await archive.finalize();

        output.on('close', () => {
            console.log(\`✅ エクスポート完了: \${archive.pointer()} bytes\`);
            console.log('📁 ファイル: env-backup.zip');
            console.log('');
            console.log('🔒 セキュリティ注意事項:');
            console.log('  - このファイルには機密情報が含まれています');
            console.log('  - 安全な場所に保管してください');
            console.log('  - 不要になったら削除してください');
        });

        output.on('error', (err) => {
            console.error('❌ エクスポートエラー:', err);
        });

    } catch (error) {
        console.error('❌ エクスポート失敗:', error.message);
        process.exit(1);
    }
}

// スクリプトとして実行された場合のみ関数を呼び出し
if (require.main === module) {
    exportEnvToZip();
}

module.exports = { exportEnvToZip };
`;

    await writeFile(
        join(targetDirectory, "scripts/env-export.js"),
        envExport
    );
    filesCreated.push("scripts/env-export.js");

    // 環境変数インポートスクリプト
    const envImport = `const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');

/**
 * ZIPファイルから環境変数をインポート
 */
async function importEnvFromZip(zipPath = 'env-backup.zip') {
    try {
        console.log('📥 環境変数のインポートを開始...');

        if (!fs.existsSync(zipPath)) {
            console.error(\`❌ ZIPファイルが見つかりません: \${zipPath}\`);
            process.exit(1);
        }

        const extractPath = './env-import-temp';

        // 一時ディレクトリの作成
        if (fs.existsSync(extractPath)) {
            fs.rmSync(extractPath, { recursive: true, force: true });
        }
        fs.mkdirSync(extractPath);

        console.log('📂 ZIPファイルを展開中...');

        await fs.createReadStream(zipPath)
            .pipe(unzipper.Extract({ path: extractPath }))
            .promise();

        // ファイルの復元
        const fileMapping = {
            'env-example': '.env.example',
            'env-local': '.env.local',
            'env-development': '.env.development',
            'env-production': '.env.production'
        };

        let restoredFiles = 0;

        for (const [sourceFile, targetFile] of Object.entries(fileMapping)) {
            const sourcePath = path.join(extractPath, sourceFile);

            if (fs.existsSync(sourcePath)) {
                // 既存ファイルの確認
                if (fs.existsSync(targetFile)) {
                    console.log(\`⚠️  \${targetFile} は既に存在します（バックアップを作成）\`);
                    fs.copyFileSync(targetFile, \`\${targetFile}.backup\`);
                }

                fs.copyFileSync(sourcePath, targetFile);
                restoredFiles++;
                console.log(\`  ✓ \${sourceFile} → \${targetFile}\`);
            }
        }

        // 一時ディレクトリの削除
        fs.rmSync(extractPath, { recursive: true, force: true });

        if (restoredFiles === 0) {
            console.log('❌ インポートする環境変数ファイルが見つかりません');
            return;
        }

        console.log(\`✅ インポート完了: \${restoredFiles} ファイル\`);
        console.log('');
        console.log('📝 次のステップ:');
        console.log('  1. 環境変数の値を確認・更新');
        console.log('  2. アプリケーションを再起動');
        console.log('  3. バックアップファイルを確認（必要に応じて削除）');

    } catch (error) {
        console.error('❌ インポート失敗:', error.message);
        process.exit(1);
    }
}

// コマンドライン引数の処理
const zipPath = process.argv[2] || 'env-backup.zip';

// スクリプトとして実行された場合のみ関数を呼び出し
if (require.main === module) {
    importEnvFromZip(zipPath);
}

module.exports = { importEnvFromZip };
`;

    await writeFile(
        join(targetDirectory, "scripts/env-import.js"),
        envImport
    );
    filesCreated.push("scripts/env-import.js");
}

// EOF