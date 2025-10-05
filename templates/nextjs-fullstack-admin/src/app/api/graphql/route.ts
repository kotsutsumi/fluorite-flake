import { ApolloServer } from '@apollo/server';
import { type NextRequest, NextResponse } from 'next/server';
import { typeDefs } from '@/lib/graphql/schema';
import { resolvers } from '@/lib/graphql/resolvers';
import { getSession } from '@/lib/auth-server';
import prisma from '@/lib/db';

interface Context {
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
}

const server = new ApolloServer<Context>({
    typeDefs,
    resolvers,
    introspection: process.env.NODE_ENV !== 'production',
    formatError: (error) => {
        console.error('GraphQL Error:', error);

        // Don't expose internal errors in production
        if (process.env.NODE_ENV === 'production') {
            // Return generic error for unknown errors
            if (!error.extensions?.code) {
                return new Error('Internal server error');
            }
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
        console.log('Session validation failed:', error);
    }

    return context;
}

async function handleGraphQLRequest(req: NextRequest) {
    await server.start();

    const body = await req.text();
    const context = await createContext(req);

    const response = await server.executeHTTPGraphQLRequest({
        httpGraphQLRequest: {
            method: req.method,
            // Apollo GraphQL expects HeaderMap - convert Next.js Headers to plain object
            headers: Object.fromEntries(req.headers.entries()),
            body,
            search: req.nextUrl.search,
        },
        context: () => Promise.resolve(context),
    });

    let responseBody: string;
    if (response.body.kind === 'complete') {
        responseBody = response.body.string;
    } else {
        // Handle chunked response
        responseBody = await new Promise<string>((resolve) => {
            let result = '';
            const body = response.body as { asyncIterator: AsyncIterator<string> };
            const asyncIterator = body.asyncIterator;
            const processChunk = async () => {
                const chunk = await asyncIterator.next();
                if (chunk.done) {
                    resolve(result);
                } else {
                    result += chunk.value;
                    processChunk();
                }
            };
            processChunk();
        });
    }

    return new NextResponse(responseBody, {
        status: response.status || 200,
        headers: Object.fromEntries(response.headers.entries()),
    });
}

export const GET = handleGraphQLRequest;
export const POST = handleGraphQLRequest;
