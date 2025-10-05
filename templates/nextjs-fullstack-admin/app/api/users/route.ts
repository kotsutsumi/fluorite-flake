import { hash } from "bcryptjs";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { userCreateSchema } from "@/lib/schemas";

// ユーザー一覧取得
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json(
                { error: "認証が必要です" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const organizationId = searchParams.get("organizationId");

        const whereClause: any = {};
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
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (
            !(session?.user && ["ADMIN", "MANAGER"].includes(session.user.role))
        ) {
            return NextResponse.json(
                { error: "管理者権限が必要です" },
                { status: 403 }
            );
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
