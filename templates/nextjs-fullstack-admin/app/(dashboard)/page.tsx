import { Activity, Building2, UserCheck, Users } from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function getDashboardStats() {
    const [userCount, organizationCount, activeUsers] = await Promise.all([
        prisma.user.count(),
        prisma.organization.count(),
        prisma.user.count({
            where: {
                sessions: {
                    some: {
                        expires: {
                            gt: new Date(),
                        },
                    },
                },
            },
        }),
    ]);

    return {
        userCount,
        organizationCount,
        activeUsers,
        systemStatus: "正常",
    };
}

export default async function DashboardPage() {
    const session = await auth();
    const stats = await getDashboardStats();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-bold text-3xl text-gray-900">
                    ダッシュボード
                </h1>
                <p className="mt-2 text-gray-600">
                    おかえりなさい、{session?.user?.name}さん
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="font-medium text-sm">
                            総ユーザー数
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="font-bold text-2xl">
                            {stats.userCount}
                        </div>
                        <p className="text-muted-foreground text-xs">
                            登録されているユーザー
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="font-medium text-sm">
                            組織数
                        </CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="font-bold text-2xl">
                            {stats.organizationCount}
                        </div>
                        <p className="text-muted-foreground text-xs">
                            登録されている組織
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="font-medium text-sm">
                            アクティブユーザー
                        </CardTitle>
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="font-bold text-2xl">
                            {stats.activeUsers}
                        </div>
                        <p className="text-muted-foreground text-xs">
                            現在ログイン中
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="font-medium text-sm">
                            システム状態
                        </CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="font-bold text-2xl text-green-600">
                            {stats.systemStatus}
                        </div>
                        <p className="text-muted-foreground text-xs">
                            すべてのサービスが正常
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>最近の活動</CardTitle>
                        <CardDescription>
                            システムの最新の活動状況
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center space-x-4">
                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                <div>
                                    <p className="font-medium text-sm">
                                        新しいユーザーが登録されました
                                    </p>
                                    <p className="text-gray-500 text-xs">
                                        2分前
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-4">
                                <div className="h-2 w-2 rounded-full bg-blue-500" />
                                <div>
                                    <p className="font-medium text-sm">
                                        組織設定が更新されました
                                    </p>
                                    <p className="text-gray-500 text-xs">
                                        1時間前
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-4">
                                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                                <div>
                                    <p className="font-medium text-sm">
                                        システムメンテナンスが完了しました
                                    </p>
                                    <p className="text-gray-500 text-xs">
                                        3時間前
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>クイックアクション</CardTitle>
                        <CardDescription>
                            よく使用される操作のショートカット
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <button
                                className="w-full rounded-md p-3 text-left transition-colors hover:bg-gray-100"
                                type="button"
                            >
                                <div className="font-medium">
                                    新しいユーザーを追加
                                </div>
                                <div className="text-gray-500 text-sm">
                                    システムに新しいユーザーを登録
                                </div>
                            </button>
                            <button
                                className="w-full rounded-md p-3 text-left transition-colors hover:bg-gray-100"
                                type="button"
                            >
                                <div className="font-medium">組織を作成</div>
                                <div className="text-gray-500 text-sm">
                                    新しい組織を作成
                                </div>
                            </button>
                            <button
                                className="w-full rounded-md p-3 text-left transition-colors hover:bg-gray-100"
                                type="button"
                            >
                                <div className="font-medium">システム設定</div>
                                <div className="text-gray-500 text-sm">
                                    システム全体の設定を変更
                                </div>
                            </button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
