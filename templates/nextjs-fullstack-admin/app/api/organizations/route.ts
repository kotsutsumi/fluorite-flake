import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { organizationCreateSchema } from "@/lib/schemas";

// 組織一覧取得
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json(
                { error: "認証が必要です" },
                { status: 401 }
            );
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
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== "ADMIN") {
            return NextResponse.json(
                { error: "管理者権限が必要です" },
                { status: 403 }
            );
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
