/**
 * GraphQL APIエンドポイント
 * GraphQLスキーマの実行
 */
import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth-server";
import prisma from "@/lib/db";
import { resolvers } from "@/lib/graphql/resolvers";
import { typeDefs } from "@/lib/graphql/schema";
import { logger } from "@/lib/logger";

type Context = {
  req: NextRequest;
  user?: {
    id: string;
    email: string;
    name?: string;
    role: string;
    organizationId?: string;
  };
  session?: {
    id: string;
    token: string;
    expiresAt: Date;
  };
};

const server = new ApolloServer<Context>({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== "production",
  formatError: (error) => {
    logger.error("GraphQL Error:", error);

    // Don't expose internal errors in production
    if (process.env.NODE_ENV === "production" && !error.extensions?.code) {
      // Return generic error for unknown errors
      return new Error("Internal server error");
    }

    return error;
  },
});

async function createContext(req: NextRequest): Promise<Context> {
  const context: Context = { req };

  try {
    // Try to get session from BetterAuth
    const session = await getSession();

    if (session?.user) {
      // Get user's organization membership
      const userWithOrg = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          memberships: {
            include: {
              organization: true,
            },
          },
        },
      });

      context.user = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name || undefined,
        role: session.user.role,
        organizationId: userWithOrg?.memberships[0]?.organizationId,
      };

      context.session = {
        id: session.session.id,
        token: session.session.token,
        expiresAt: session.session.expiresAt,
      };
    }
  } catch (error) {
    // Session might be invalid or expired
    logger.info("Session validation failed:", error);
  }

  return context;
}

const handler = startServerAndCreateNextHandler<NextRequest, Context>(server, {
  context: async (req) => createContext(req),
});

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": process.env.NEXT_PUBLIC_CORS_ORIGIN ?? "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

type RouteContext = { params: Promise<Record<string, string>> };

function withCors(response: Response) {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export const OPTIONS = async () => new Response(null, { status: 204, headers: CORS_HEADERS });

export const GET = async (req: NextRequest, _context: RouteContext) => withCors(await handler(req));
export const POST = async (req: NextRequest, _context: RouteContext) =>
  withCors(await handler(req));

// EOF
