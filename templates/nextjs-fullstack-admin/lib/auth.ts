import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import NextAuth, { type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "./db";

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export const authConfig: NextAuthConfig = {
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

                    if (!user?.password) {
                        return null;
                    }

                    const isPasswordValid = await compare(
                        password,
                        user.password
                    );
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
        jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.organizationId = user.organizationId;
                token.organization = user.organization;
            }
            return token;
        },
        session({ session, token }) {
            if (token) {
                session.user.id = token.sub;
                session.user.role = token.role as string;
                session.user.organizationId = token.organizationId as string;
                session.user.organization = token.organization as string;
            }
            return session;
        },
    },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
