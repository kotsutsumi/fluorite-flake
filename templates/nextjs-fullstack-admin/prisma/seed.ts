import { PrismaClient } from "@prisma/client";
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
    console.log("管理者アカウント:", {
        email: "admin@example.com",
        password: "admin123456",
    });
    console.log("テストアカウント:", {
        email: "user@example.com",
        password: "user123456",
    });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
