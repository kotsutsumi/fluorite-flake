// Better Auth の設定とユーティリティを集約する。
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization } from "better-auth/plugins/organization";

import prisma from "@/lib/db";

import { logger } from "./logger";
import { APP_ROLES } from "./roles";

type DatabaseProvider = "turso" | "supabase";

// 信頼できるオリジンを導出するためのユーティリティ
const toURL = (value?: string | null) => {
    if (!value) {
        return;
    }

    if (value.startsWith("http")) {
        return value;
    }

    return `https://${value}`;
};

// Vercel デプロイ環境変数からアクセス可能な URL を解決
const getVercelURL = () => {
    const branchUrl = toURL(process.env.VERCEL_BRANCH_URL);
    const deploymentUrl = toURL(process.env.VERCEL_URL);
    const publicUrl = toURL(process.env.NEXT_PUBLIC_VERCEL_URL);

    return branchUrl ?? deploymentUrl ?? publicUrl;
};

// Better Auth の baseURL を環境に応じて決定
const getBaseURL = () => {
    if (typeof window !== "undefined") {
        return window.location.origin;
    }

    const vercelUrl = getVercelURL();
    const environment = process.env.VERCEL_ENV ?? process.env.NODE_ENV;

    if (environment === "preview" && vercelUrl) {
        return vercelUrl;
    }

    const fallbackOrder = [toURL(process.env.BETTER_AUTH_URL), toURL(process.env.NEXT_PUBLIC_APP_URL), vercelUrl];

    for (const candidate of fallbackOrder) {
        if (candidate) {
            return candidate;
        }
    }

    return "http://localhost:3000";
};

const resolveAdapterProvider = (): DatabaseProvider => {
    const provider = (process.env.DATABASE_PROVIDER ?? "turso").toLowerCase().trim();

    if (provider === "supabase") {
        return "supabase";
    }

    return "turso";
};

// 信頼できるオリジンを安全に取得する
const expandLocalVariants = (origin: string): string[] => {
    try {
        const url = new URL(origin);
        const hosts = [url.hostname];

        if (["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname)) {
            hosts.push("localhost", "127.0.0.1", "0.0.0.0");
        }

        return hosts.map((host) => `${url.protocol}//${host}${url.port ? `:${url.port}` : ""}`);
    } catch {
        return [origin];
    }
};

const getTrustedOrigins = () => {
    const candidates = [
        getBaseURL(),
        toURL(process.env.BETTER_AUTH_URL),
        toURL(process.env.NEXT_PUBLIC_APP_URL),
        getVercelURL(),
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://0.0.0.0:3000",
    ];

    const expanded = candidates.filter((origin): origin is string => Boolean(origin)).flatMap(expandLocalVariants);

    return [...new Set(expanded)];
};

const adapterProvider = resolveAdapterProvider() === "supabase" ? "postgresql" : "sqlite";

// セッションや Cookie の有効期限に関する定数
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const SESSION_EXPIRY_DAYS = 30;
const SESSION_RENEWAL_DAYS = 1;
const COOKIE_CACHE_MINUTES = 5;
const SECONDS_PER_HOUR = SECONDS_PER_MINUTE * MINUTES_PER_HOUR;

const SECONDS_PER_DAY = SECONDS_PER_MINUTE * MINUTES_PER_HOUR * HOURS_PER_DAY;
const SESSION_EXPIRY_SECONDS = SECONDS_PER_DAY * SESSION_EXPIRY_DAYS;
const SESSION_UPDATE_AGE_SECONDS = SECONDS_PER_DAY * SESSION_RENEWAL_DAYS;
const _COOKIE_CACHE_MAX_AGE_SECONDS = SECONDS_PER_MINUTE * COOKIE_CACHE_MINUTES;

// Better Auth の設定インスタンス
// ReturnType を使用して betterAuth 関数の戻り値型を自動的に推論
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: adapterProvider,
    }),
    secret: process.env.BETTER_AUTH_SECRET || "dev-secret-change-in-production",
    // SSR 時にも正しいドメインでメールリンクや Cookie を発行できるよう baseURL を指定
    baseURL: getBaseURL(),
    emailAndPassword: {
        enabled: true,
        autoSignIn: false,
        minPasswordLength: 8,
        maxPasswordLength: 128,
        resetPasswordTokenExpiresIn: SECONDS_PER_HOUR,
        revokeSessionsOnPasswordReset: true,
        sendResetPassword: ({ user, url }) => {
            logger.info("Password reset link issued", {
                userId: user.id,
                email: user.email,
                url,
            });
            return Promise.resolve();
        },
    },
    session: {
        expiresIn: SESSION_EXPIRY_SECONDS,
        updateAge: SESSION_UPDATE_AGE_SECONDS,
        cookieCache: {
            enabled: false,
        },
        cookie: {
            secure: getBaseURL().startsWith("https://"),
            sameSite: "lax",
            httpOnly: true,
            path: "/",
            domain: (() => {
                const baseURL = getBaseURL();
                const isProduction = process.env.NODE_ENV === "production" && process.env.VERCEL_ENV === "production";
                const isStaging = process.env.NEXT_PUBLIC_ENV === "staging";

                if ((isProduction || isStaging) && baseURL.startsWith("https://")) {
                    return new URL(baseURL).hostname;
                }

                return;
            })(),
        },
    },
    user: {
        additionalFields: {
            role: {
                type: "string",
                defaultValue: APP_ROLES.USER,
            },
        },
    },
    plugins: [
        organization({
            // 組織の新規作成は管理者のみ許可するポリシーに合わせて disable
            allowUserToCreateOrganization: false,
        }),
    ],
    trustedOrigins: getTrustedOrigins(),
    // biome-ignore lint/suspicious/noExplicitAny: better-auth type compatibility requires any
}) as any;

type RawAuthSession = Exclude<Awaited<ReturnType<typeof auth.api.getSession>>, null>;

export type AuthSession = RawAuthSession & {
    user: RawAuthSession["user"] & { role: string };
};

export type AuthUser = AuthSession["user"];

// EOF

// EOF
