import clsx from "clsx";
import { Edit, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatRole } from "@/lib/utils";

async function getUsers() {
    return await prisma.user.findMany({
        include: {
            organization: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
}

export default async function UsersPage() {
    const session = await auth();
    const users = await getUsers();

    const canManageUsers =
        session?.user?.role === "ADMIN" || session?.user?.role === "MANAGER";

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-bold text-3xl text-gray-900">
                        ユーザー管理
                    </h1>
                    <p className="mt-2 text-gray-600">
                        システムに登録されているユーザーを管理
                    </p>
                </div>
                {canManageUsers && (
                    <Button asChild>
                        <Link href="/dashboard/users/create">
                            <Plus className="mr-2 h-4 w-4" />
                            新しいユーザー
                        </Link>
                    </Button>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>ユーザー一覧</CardTitle>
                    <CardDescription>
                        登録されているすべてのユーザー ({users.length}人)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="px-4 py-3 text-left font-medium">
                                        名前
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium">
                                        メール
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium">
                                        ロール
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium">
                                        組織
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium">
                                        登録日
                                    </th>
                                    {canManageUsers && (
                                        <th className="px-4 py-3 text-left font-medium">
                                            操作
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr
                                        className="border-b hover:bg-gray-50"
                                        key={user.id}
                                    >
                                        <td className="px-4 py-3">
                                            <div>
                                                <div className="font-medium">
                                                    {user.name}
                                                </div>
                                                <div className="text-gray-500 text-sm">
                                                    {user.id}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {user.email}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={clsx(
                                                    "rounded-full px-2 py-1 font-medium text-xs",
                                                    user.role === "ADMIN" &&
                                                        "bg-red-100 text-red-800",
                                                    user.role === "MANAGER" &&
                                                        "bg-blue-100 text-blue-800",
                                                    user.role === "USER" &&
                                                        "bg-green-100 text-green-800"
                                                )}
                                            >
                                                {formatRole(user.role)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {user.organization?.name ||
                                                "未所属"}
                                        </td>
                                        <td className="px-4 py-3">
                                            {formatDate(user.createdAt)}
                                        </td>
                                        {canManageUsers && (
                                            <td className="px-4 py-3">
                                                <div className="flex space-x-2">
                                                    <Button
                                                        asChild
                                                        size="sm"
                                                        variant="outline"
                                                    >
                                                        <Link
                                                            href={`/dashboard/users/${user.id}`}
                                                        >
                                                            <Edit className="h-3 w-3" />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
