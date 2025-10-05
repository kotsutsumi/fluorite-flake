/**
 * Next.js Full-Stack Admin Template ジェネレーター (Part 2)
 *
 * API ルート、UI コンポーネント、アプリケーションページの実装
 */
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * API ルートを作成
 */
export async function createApiRoutes(
    targetDirectory: string,
    isJavaScript: boolean,
    filesCreated: string[]
): Promise<void> {
    const ext = isJavaScript ? "js" : "ts";

    // NextAuth.js APIルート
    const nextAuthRoute = `import { handlers } from "@/lib/auth";

export { handlers as GET, handlers as POST };
`;

    await writeFile(
        join(targetDirectory, `app/api/auth/[...nextauth]/route.${ext}`),
        nextAuthRoute
    );
    filesCreated.push(`app/api/auth/[...nextauth]/route.${ext}`);

    // 組織 API ルート
    const organizationsRoute = `import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { organizationCreateSchema, organizationUpdateSchema } from "@/lib/schemas";

// 組織一覧取得
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
        }

        const organizations = await prisma.organization.findMany({
            include: {
                users: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                    },
                },
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

        return NextResponse.json(organizations);
    } catch (error) {
        console.error("組織取得エラー:", error);
        return NextResponse.json(
            { error: "組織の取得に失敗しました" },
            { status: 500 }
        );
    }
}

// 組織作成
export async function POST(request${isJavaScript ? "" : ": NextRequest"}) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
        }

        const body = await request.json();
        const validatedData = organizationCreateSchema.parse(body);

        const organization = await prisma.organization.create({
            data: validatedData,
            include: {
                users: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                    },
                },
                _count: {
                    select: {
                        users: true,
                    },
                },
            },
        });

        return NextResponse.json(organization, { status: 201 });
    } catch (error) {
        console.error("組織作成エラー:", error);
        return NextResponse.json(
            { error: "組織の作成に失敗しました" },
            { status: 500 }
        );
    }
}
`;

    await writeFile(
        join(targetDirectory, `app/api/organizations/route.${ext}`),
        organizationsRoute
    );
    filesCreated.push(`app/api/organizations/route.${ext}`);

    // ユーザー API ルート
    const usersRoute = `import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { userCreateSchema, userUpdateSchema } from "@/lib/schemas";
import { hash } from "bcryptjs";

// ユーザー一覧取得
export async function GET(request${isJavaScript ? "" : ": NextRequest"}) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const organizationId = searchParams.get("organizationId");

        const whereClause${isJavaScript ? "" : ": any"} = {};
        if (organizationId) {
            whereClause.organizationId = organizationId;
        }

        const users = await prisma.user.findMany({
            where: whereClause,
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                organizationId: true,
                organization: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json(users);
    } catch (error) {
        console.error("ユーザー取得エラー:", error);
        return NextResponse.json(
            { error: "ユーザーの取得に失敗しました" },
            { status: 500 }
        );
    }
}

// ユーザー作成
export async function POST(request${isJavaScript ? "" : ": NextRequest"}) {
    try {
        const session = await auth();
        if (!session?.user || !["ADMIN", "MANAGER"].includes(session.user.role)) {
            return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
        }

        const body = await request.json();
        const validatedData = userCreateSchema.parse(body);

        // パスワードをハッシュ化
        const hashedPassword = await hash(validatedData.password, 12);

        const user = await prisma.user.create({
            data: {
                ...validatedData,
                password: hashedPassword,
            },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                organizationId: true,
                organization: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return NextResponse.json(user, { status: 201 });
    } catch (error) {
        console.error("ユーザー作成エラー:", error);
        return NextResponse.json(
            { error: "ユーザーの作成に失敗しました" },
            { status: 500 }
        );
    }
}
`;

    await writeFile(
        join(targetDirectory, `app/api/users/route.${ext}`),
        usersRoute
    );
    filesCreated.push(`app/api/users/route.${ext}`);
}

/**
 * UI コンポーネントを作成
 */
export async function createUIComponents(
    targetDirectory: string,
    isJavaScript: boolean,
    filesCreated: string[]
): Promise<void> {
    const ext = isJavaScript ? "jsx" : "tsx";

    // Button コンポーネント
    const buttonComponent = `import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground hover:bg-primary/90",
                destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
                secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                ghost: "hover:bg-accent hover:text-accent-foreground",
                link: "text-primary underline-offset-4 hover:underline",
            },
            size: {
                default: "h-10 px-4 py-2",
                sm: "h-9 rounded-md px-3",
                lg: "h-11 rounded-md px-8",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button";
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";

export { Button, buttonVariants };
`;

    await writeFile(
        join(targetDirectory, `components/ui/button.${ext}`),
        buttonComponent
    );
    filesCreated.push(`components/ui/button.${ext}`);

    // Input コンポーネント
    const inputComponent = `import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);
Input.displayName = "Input";

export { Input };
`;

    await writeFile(
        join(targetDirectory, `components/ui/input.${ext}`),
        inputComponent
    );
    filesCreated.push(`components/ui/input.${ext}`);

    // Card コンポーネント
    const cardComponent = `import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "rounded-lg border bg-card text-card-foreground shadow-sm",
            className
        )}
        {...props}
    />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex flex-col space-y-1.5 p-6", className)}
        {...props}
    />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h3
        ref={ref}
        className={cn(
            "text-2xl font-semibold leading-none tracking-tight",
            className
        )}
        {...props}
    />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
    />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex items-center p-6 pt-0", className)}
        {...props}
    />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
`;

    await writeFile(
        join(targetDirectory, `components/ui/card.${ext}`),
        cardComponent
    );
    filesCreated.push(`components/ui/card.${ext}`);

    // 認証フォームコンポーネント
    const loginFormComponent = `"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { userLoginSchema, type UserLogin } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LoginForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<UserLogin>({
        resolver: zodResolver(userLoginSchema),
    });

    const onSubmit = async (data${isJavaScript ? "" : ": UserLogin"}) => {
        try {
            setIsLoading(true);
            setError("");

            const result = await signIn("credentials", {
                email: data.email,
                password: data.password,
                redirect: false,
            });

            if (result?.error) {
                setError("メールアドレスまたはパスワードが正しくありません");
                return;
            }

            router.push("/dashboard");
            router.refresh();
        } catch (error) {
            setError("ログインに失敗しました");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>ログイン</CardTitle>
                <CardDescription>
                    アカウントにログインしてください
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium">
                            メールアドレス
                        </label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="user@example.com"
                            {...register("email")}
                            disabled={isLoading}
                        />
                        {errors.email && (
                            <p className="text-sm text-red-600">{errors.email.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="password" className="text-sm font-medium">
                            パスワード
                        </label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="パスワードを入力"
                            {...register("password")}
                            disabled={isLoading}
                        />
                        {errors.password && (
                            <p className="text-sm text-red-600">{errors.password.message}</p>
                        )}
                    </div>

                    {error && (
                        <div className="rounded-md bg-red-50 p-4">
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "ログイン中..." : "ログイン"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
`;

    await writeFile(
        join(targetDirectory, `components/auth/login-form.${ext}`),
        loginFormComponent
    );
    filesCreated.push(`components/auth/login-form.${ext}`);

    // ナビゲーションコンポーネント
    const navigationComponent = `"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    Users,
    Building2,
    User,
    LogOut,
    Settings
} from "lucide-react";

const navigation = [
    { name: "ダッシュボード", href: "/dashboard", icon: Settings },
    { name: "ユーザー", href: "/dashboard/users", icon: Users },
    { name: "組織", href: "/dashboard/organizations", icon: Building2 },
    { name: "プロフィール", href: "/dashboard/users/profile", icon: User },
];

export function Navigation() {
    const pathname = usePathname();
    const { data: session } = useSession();

    const handleSignOut = () => {
        signOut({ callbackUrl: "/login" });
    };

    return (
        <nav className="bg-white shadow-sm border-r border-gray-200 h-full">
            <div className="flex flex-col h-full">
                <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
                    <h1 className="text-xl font-semibold text-gray-900">
                        管理パネル
                    </h1>
                </div>

                <div className="flex-1 px-4 py-6">
                    <ul className="space-y-2">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        className={cn(
                                            "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                            isActive
                                                ? "bg-blue-100 text-blue-700"
                                                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                        )}
                                    >
                                        <item.icon className="mr-3 h-4 w-4" />
                                        {item.name}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <div className="p-4 border-t border-gray-200">
                    <div className="flex items-center mb-4">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                                {session?.user?.name || "ユーザー"}
                            </p>
                            <p className="text-xs text-gray-500">
                                {session?.user?.role === "ADMIN" ? "管理者" :
                                 session?.user?.role === "MANAGER" ? "マネージャー" : "ユーザー"}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSignOut}
                        className="w-full"
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        ログアウト
                    </Button>
                </div>
            </div>
        </nav>
    );
}
`;

    await writeFile(
        join(targetDirectory, `components/dashboard/navigation.${ext}`),
        navigationComponent
    );
    filesCreated.push(`components/dashboard/navigation.${ext}`);
}

// EOF