/**
 * Next.js Full-Stack Admin Template ジェネレーター
 *
 * 認証、組織管理、ユーザー管理、データベース統合を含む
 * 完全なフルスタック管理システムテンプレートを生成
 */
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { GenerationContext, TemplateGenerationResult } from "./types.js";

/**
 * Next.js Full-Stack Admin Template を生成
 */
export async function generateFullStackAdmin(
    context: GenerationContext
): Promise<TemplateGenerationResult> {
    const { config, targetDirectory, isJavaScript } = context;
    const filesCreated: string[] = [];
    const directoriesCreated: string[] = [];
    const nextSteps: string[] = [];

    try {
        // ディレクトリ構造の作成
        await createDirectoryStructure(targetDirectory, directoriesCreated);

        // パッケージ設定ファイル
        await createPackageFiles(targetDirectory, isJavaScript, filesCreated);

        // Next.js設定ファイル
        await createNextJsConfig(targetDirectory, isJavaScript, filesCreated);

        // 認証システムファイル
        await createAuthSystem(targetDirectory, isJavaScript, filesCreated);

        // データベース設定（Prisma）
        await createDatabaseConfig(targetDirectory, filesCreated);

        // API ルート
        await createApiRoutes(targetDirectory, isJavaScript, filesCreated);

        // UI コンポーネント
        await createUIComponents(targetDirectory, isJavaScript, filesCreated);

        // アプリケーションページ
        await createAppPages(targetDirectory, isJavaScript, filesCreated);

        // スタイル設定
        await createStyleConfig(targetDirectory, filesCreated);

        // Vercel 統合スクリプト
        await createVercelScripts(targetDirectory, filesCreated);

        // 環境変数テンプレート
        await createEnvironmentFiles(targetDirectory, filesCreated);

        // README とドキュメント
        await createDocumentation(targetDirectory, config.name, filesCreated);

        // Next Steps の設定
        nextSteps.push(
            "1. データベースをセットアップしてください (PostgreSQL推奨)",
            "2. 環境変数を設定してください (.env.local)",
            "3. Prismaマイグレーションを実行してください (pnpm db:migrate)",
            "4. NextAuth.jsの設定を確認してください",
            "5. 開発サーバーを起動してください (pnpm dev)",
            "6. 管理者アカウントを作成してください"
        );

        return {
            success: true,
            filesCreated,
            directoriesCreated,
            nextSteps,
        };
    } catch (error) {
        return {
            success: false,
            filesCreated,
            directoriesCreated,
            nextSteps,
            errors: [error instanceof Error ? error.message : "Unknown error"],
        };
    }
}

/**
 * ディレクトリ構造を作成
 */
async function createDirectoryStructure(
    targetDirectory: string,
    directoriesCreated: string[]
): Promise<void> {
    const directories = [
        "app/(auth)/login",
        "app/(auth)/register",
        "app/(dashboard)/organizations",
        "app/(dashboard)/organizations/[id]",
        "app/(dashboard)/organizations/create",
        "app/(dashboard)/users",
        "app/(dashboard)/users/[id]",
        "app/(dashboard)/users/profile",
        "app/api/auth/[...nextauth]",
        "app/api/organizations",
        "app/api/users",
        "components/ui",
        "components/auth",
        "components/dashboard",
        "components/shared",
        "lib",
        "prisma",
        "scripts",
        "public",
    ];

    for (const dir of directories) {
        const fullPath = join(targetDirectory, dir);
        await mkdir(fullPath, { recursive: true });
        directoriesCreated.push(fullPath);
    }
}

/**
 * パッケージ設定ファイルを作成
 */
async function createPackageFiles(
    targetDirectory: string,
    isJavaScript: boolean,
    filesCreated: string[]
): Promise<void> {
    // package.json
    const packageJson = {
        name: "fluorite-admin",
        version: "0.1.0",
        private: true,
        scripts: {
            dev: "next dev",
            build: "next build",
            start: "next start",
            lint: "ultracite check",
            format: "ultracite fix",
            "type-check": "tsc --noEmit",
            "db:generate": "prisma generate",
            "db:migrate": "prisma migrate dev",
            "db:push": "prisma db push",
            "db:seed": "tsx prisma/seed.ts",
            "env:setup": "bash scripts/vercel-env-setup.sh",
            "env:export": "node scripts/env-export.js",
        },
        dependencies: {
            next: "^14.0.0",
            "@next/bundle-analyzer": "^14.0.0",
            react: "^18.0.0",
            "react-dom": "^18.0.0",
            "@auth/nextjs": "^4.0.0",
            prisma: "^5.0.0",
            "@prisma/client": "^5.0.0",
            zod: "^3.22.0",
            "react-hook-form": "^7.45.0",
            "@hookform/resolvers": "^3.3.0",
            tailwindcss: "^3.3.0",
            "lucide-react": "^0.263.0",
            "class-variance-authority": "^0.7.0",
            clsx: "^2.0.0",
            "tailwind-merge": "^1.14.0",
        },
        devDependencies: {
            "@types/node": "^20.0.0",
            "@types/react": "^18.0.0",
            "@types/react-dom": "^18.0.0",
            typescript: "^5.0.0",
            "@biomejs/biome": "1.9.4",
            ultracite: "^0.0.1",
            tsx: "^4.0.0",
            postcss: "^8.0.0",
            autoprefixer: "^10.0.0",
        },
    };

    await writeFile(
        join(targetDirectory, "package.json"),
        JSON.stringify(packageJson, null, 2)
    );
    filesCreated.push("package.json");

    // TypeScript設定（JavaScriptの場合でも型チェック用に作成）
    const tsConfig = {
        compilerOptions: {
            target: "es5",
            lib: ["dom", "dom.iterable", "es6"],
            allowJs: true,
            skipLibCheck: true,
            strict: true,
            noEmit: true,
            esModuleInterop: true,
            module: "esnext",
            moduleResolution: "bundler",
            resolveJsonModule: true,
            isolatedModules: true,
            jsx: "preserve",
            incremental: true,
            plugins: [
                {
                    name: "next",
                },
            ],
            paths: {
                "@/*": ["./*"],
            },
        },
        include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
        exclude: ["node_modules"],
    };

    await writeFile(
        join(targetDirectory, "tsconfig.json"),
        JSON.stringify(tsConfig, null, 2)
    );
    filesCreated.push("tsconfig.json");

    // Ultracite設定
    const ultraciteConfig = {
        extends: ["@biomejs/biome/web", "ultracite"],
        organizeImports: {
            enabled: true,
        },
        linter: {
            enabled: true,
            rules: {
                recommended: true,
            },
        },
        formatter: {
            enabled: true,
            indentStyle: "space",
            indentSize: 4,
        },
    };

    await writeFile(
        join(targetDirectory, "ultracite.json"),
        JSON.stringify(ultraciteConfig, null, 2)
    );
    filesCreated.push("ultracite.json");
}

/**
 * Next.js設定ファイルを作成
 */
async function createNextJsConfig(
    targetDirectory: string,
    isJavaScript: boolean,
    filesCreated: string[]
): Promise<void> {
    const ext = isJavaScript ? "js" : "ts";

    const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverComponentsExternalPackages: ['@prisma/client'],
    },
    images: {
        domains: ['localhost'],
    },
};

export default nextConfig;
`;

    await writeFile(
        join(targetDirectory, `next.config.${ext}`),
        nextConfig
    );
    filesCreated.push(`next.config.${ext}`);

    // Tailwind CSS設定
    const tailwindConfig = `/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))',
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))',
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))',
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))',
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))',
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))',
                },
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))',
                },
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
            },
        },
    },
    plugins: [],
};
`;

    await writeFile(
        join(targetDirectory, "tailwind.config.js"),
        tailwindConfig
    );
    filesCreated.push("tailwind.config.js");

    // PostCSS設定
    const postcssConfig = `export default {
    plugins: {
        tailwindcss: {},
        autoprefixer: {},
    },
};
`;

    await writeFile(
        join(targetDirectory, "postcss.config.js"),
        postcssConfig
    );
    filesCreated.push("postcss.config.js");
}

/**
 * 認証システムファイルを作成
 */
async function createAuthSystem(
    targetDirectory: string,
    isJavaScript: boolean,
    filesCreated: string[]
): Promise<void> {
    const ext = isJavaScript ? "js" : "ts";
    const typeAnnotations = isJavaScript ? "" : ": NextAuthConfig";

    // auth.ts - NextAuth.js設定
    const authConfig = `import NextAuth${isJavaScript ? "" : ", { NextAuthConfig }"} from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db";
import { compare } from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export const authConfig${typeAnnotations} = {
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/login",
        signUp: "/register",
    },
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                try {
                    const { email, password } = loginSchema.parse(credentials);

                    const user = await prisma.user.findUnique({
                        where: { email },
                        include: { organization: true },
                    });

                    if (!user || !user.password) {
                        return null;
                    }

                    const isPasswordValid = await compare(password, user.password);
                    if (!isPasswordValid) {
                        return null;
                    }

                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        organizationId: user.organizationId,
                        organization: user.organization?.name,
                    };
                } catch (error) {
                    console.error("認証エラー:", error);
                    return null;
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.organizationId = user.organizationId;
                token.organization = user.organization;
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.sub;
                session.user.role = token.role${isJavaScript ? "" : " as string"};
                session.user.organizationId = token.organizationId${isJavaScript ? "" : " as string"};
                session.user.organization = token.organization${isJavaScript ? "" : " as string"};
            }
            return session;
        },
    },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
`;

    await writeFile(
        join(targetDirectory, `lib/auth.${ext}`),
        authConfig
    );
    filesCreated.push(`lib/auth.${ext}`);

    // データベース設定
    const dbConfig = `import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis${isJavaScript ? "" : " as unknown as {\n    prisma: PrismaClient | undefined;\n}"};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
`;

    await writeFile(
        join(targetDirectory, `lib/db.${ext}`),
        dbConfig
    );
    filesCreated.push(`lib/db.${ext}`);

    // スキーマ定義
    const schemas = `import { z } from "zod";

// ユーザー関連スキーマ
export const userCreateSchema = z.object({
    name: z.string().min(2, "名前は2文字以上で入力してください"),
    email: z.string().email("有効なメールアドレスを入力してください"),
    password: z.string().min(8, "パスワードは8文字以上で入力してください"),
    role: z.enum(["ADMIN", "USER", "MANAGER"]).default("USER"),
    organizationId: z.string().uuid().optional(),
});

export const userUpdateSchema = z.object({
    name: z.string().min(2, "名前は2文字以上で入力してください").optional(),
    email: z.string().email("有効なメールアドレスを入力してください").optional(),
    role: z.enum(["ADMIN", "USER", "MANAGER"]).optional(),
    organizationId: z.string().uuid().optional(),
});

export const userLoginSchema = z.object({
    email: z.string().email("有効なメールアドレスを入力してください"),
    password: z.string().min(1, "パスワードを入力してください"),
});

// 組織関連スキーマ
export const organizationCreateSchema = z.object({
    name: z.string().min(2, "組織名は2文字以上で入力してください"),
    description: z.string().optional(),
    website: z.string().url("有効なURLを入力してください").optional(),
});

export const organizationUpdateSchema = z.object({
    name: z.string().min(2, "組織名は2文字以上で入力してください").optional(),
    description: z.string().optional(),
    website: z.string().url("有効なURLを入力してください").optional(),
});

// 型エクスポート
export type UserCreate = z.infer<typeof userCreateSchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;
export type UserLogin = z.infer<typeof userLoginSchema>;
export type OrganizationCreate = z.infer<typeof organizationCreateSchema>;
export type OrganizationUpdate = z.infer<typeof organizationUpdateSchema>;
`;

    await writeFile(
        join(targetDirectory, `lib/schemas.${ext}`),
        schemas
    );
    filesCreated.push(`lib/schemas.${ext}`);

    // ユーティリティ関数
    const utils = `import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs${isJavaScript ? "" : ": ClassValue[]"}) {
    return twMerge(clsx(inputs));
}

export function formatDate(date${isJavaScript ? "" : ": Date | string | number"}) {
    return new Intl.DateTimeFormat("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(date));
}

export function formatRole(role${isJavaScript ? "" : ": string"}) {
    const roleMap${isJavaScript ? "" : ": Record<string, string>"} = {
        ADMIN: "管理者",
        MANAGER: "マネージャー",
        USER: "ユーザー",
    };
    return roleMap[role] || role;
}

export function generatePassword() {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
}
`;

    await writeFile(
        join(targetDirectory, `lib/utils.${ext}`),
        utils
    );
    filesCreated.push(`lib/utils.${ext}`);
}

/**
 * データベース設定（Prisma）を作成
 */
async function createDatabaseConfig(
    targetDirectory: string,
    filesCreated: string[]
): Promise<void> {
    // Prismaスキーマ
    const prismaSchema = `// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  password      String?
  emailVerified DateTime?
  image         String?
  role          Role      @default(USER)
  organizationId String?

  accounts      Account[]
  sessions      Session[]
  organization  Organization? @relation(fields: [organizationId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Organization {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  website     String?

  users       User[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

enum Role {
  ADMIN
  MANAGER
  USER
}
`;

    await writeFile(
        join(targetDirectory, "prisma/schema.prisma"),
        prismaSchema
    );
    filesCreated.push("prisma/schema.prisma");

    // データベースシード
    const seedScript = `import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 データベースシード開始...");

    // デフォルト組織を作成
    const defaultOrg = await prisma.organization.upsert({
        where: { name: "デフォルト組織" },
        update: {},
        create: {
            name: "デフォルト組織",
            description: "システムのデフォルト組織です",
            website: "https://example.com",
        },
    });

    // 管理者ユーザーを作成
    const hashedPassword = await hash("admin123456", 12);

    const adminUser = await prisma.user.upsert({
        where: { email: "admin@example.com" },
        update: {},
        create: {
            name: "管理者",
            email: "admin@example.com",
            password: hashedPassword,
            role: "ADMIN",
            organizationId: defaultOrg.id,
        },
    });

    // テストユーザーを作成
    const testPassword = await hash("user123456", 12);

    const testUser = await prisma.user.upsert({
        where: { email: "user@example.com" },
        update: {},
        create: {
            name: "テストユーザー",
            email: "user@example.com",
            password: testPassword,
            role: "USER",
            organizationId: defaultOrg.id,
        },
    });

    console.log("✅ シード完了");
    console.log("管理者アカウント:", { email: "admin@example.com", password: "admin123456" });
    console.log("テストアカウント:", { email: "user@example.com", password: "user123456" });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
`;

    await writeFile(
        join(targetDirectory, "prisma/seed.ts"),
        seedScript
    );
    filesCreated.push("prisma/seed.ts");
}

/**
 * API ルートを作成
 */
async function createApiRoutes(
    targetDirectory: string,
    isJavaScript: boolean,
    filesCreated: string[]
): Promise<void> {
    const { createApiRoutes: createApiRoutesImpl } = await import("./nextjs-fullstack-admin-part2.js");
    return createApiRoutesImpl(targetDirectory, isJavaScript, filesCreated);
}

/**
 * UI コンポーネントを作成
 */
async function createUIComponents(
    targetDirectory: string,
    isJavaScript: boolean,
    filesCreated: string[]
): Promise<void> {
    const { createUIComponents: createUIComponentsImpl } = await import("./nextjs-fullstack-admin-part2.js");
    return createUIComponentsImpl(targetDirectory, isJavaScript, filesCreated);
}

/**
 * アプリケーションページを作成
 */
async function createAppPages(
    targetDirectory: string,
    isJavaScript: boolean,
    filesCreated: string[]
): Promise<void> {
    const { createAppPages: createAppPagesImpl } = await import("./nextjs-fullstack-admin-part3.js");
    return createAppPagesImpl(targetDirectory, isJavaScript, filesCreated);
}

/**
 * スタイル設定を作成
 */
async function createStyleConfig(
    targetDirectory: string,
    filesCreated: string[]
): Promise<void> {
    const { createStyleConfig: createStyleConfigImpl } = await import("./nextjs-fullstack-admin-part3.js");
    return createStyleConfigImpl(targetDirectory, filesCreated);
}

/**
 * Vercel 統合スクリプトを作成
 */
async function createVercelScripts(
    targetDirectory: string,
    filesCreated: string[]
): Promise<void> {
    const { createVercelScripts: createVercelScriptsImpl } = await import("./nextjs-fullstack-admin-part3.js");
    return createVercelScriptsImpl(targetDirectory, filesCreated);
}

/**
 * 環境変数テンプレートを作成
 */
async function createEnvironmentFiles(
    targetDirectory: string,
    filesCreated: string[]
): Promise<void> {
    const { createEnvironmentFiles: createEnvironmentFilesImpl } = await import("./nextjs-fullstack-admin-part4.js");
    return createEnvironmentFilesImpl(targetDirectory, filesCreated);
}

/**
 * ドキュメントを作成
 */
async function createDocumentation(
    targetDirectory: string,
    projectName: string,
    filesCreated: string[]
): Promise<void> {
    const { createDocumentation: createDocumentationImpl } = await import("./nextjs-fullstack-admin-part4.js");
    return createDocumentationImpl(targetDirectory, projectName, filesCreated);
}

// EOF