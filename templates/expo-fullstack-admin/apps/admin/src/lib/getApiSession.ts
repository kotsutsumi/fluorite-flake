import prisma from '@/lib/db';

interface ApiSession {
    user: {
        id: string;
        email: string;
        emailVerified: boolean;
        name: string | null;
        image: string | null;
        role: string;
        createdAt: Date;
        updatedAt: Date;
    };
    session: {
        id: string;
        expiresAt: Date;
        token: string;
        ipAddress: string | null;
        userAgent: string | null;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
    };
}

const SESSION_COOKIE_CANDIDATES = [
    '__Secure-better-auth.session_token',
    'better-auth.session_token',
    'session',
];

/**
 * API ルートから呼び出すためのセッション取得ヘルパー。
 * Cookie からセッショントークンを抽出し、Prisma を用いて利用可能なセッションか検証する。
 */
export async function getApiSession(request: Request): Promise<ApiSession | null> {
    const cookieHeader = request.headers.get('cookie') ?? '';

    const token = extractSessionToken(cookieHeader);

    if (!token) {
        return null;
    }

    // Better Auth tokens might have format "token.signature"
    // Database stores only the token part (before the dot)
    const tokenId = token.split('.')[0];

    const session = await prisma.session.findUnique({
        where: { token: tokenId },
        include: { user: true },
    });

    if (!session) {
        return null;
    }

    if (session.expiresAt < new Date()) {
        await prisma.session.delete({ where: { id: session.id } });
        return null;
    }

    return {
        user: session.user,
        session,
    };
}

function extractSessionToken(cookieHeader: string): string | null {
    // Parse all cookies first
    const cookies = new Map<string, string>();
    for (const part of cookieHeader.split(';')) {
        const [rawKey, ...rest] = part.trim().split('=');
        if (rawKey) {
            cookies.set(rawKey, decodeURIComponent(rest.join('=')));
        }
    }

    // Check cookies in priority order
    for (const candidate of SESSION_COOKIE_CANDIDATES) {
        if (cookies.has(candidate)) {
            const cookie = cookies.get(candidate);
            if (cookie) {
                return cookie;
            }
        }
    }

    return null;
}
