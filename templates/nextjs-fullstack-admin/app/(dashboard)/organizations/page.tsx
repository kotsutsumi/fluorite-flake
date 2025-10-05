import { Building2, Edit, Plus, Trash2, Users } from "lucide-react";
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
import { formatDate } from "@/lib/utils";

async function getOrganizations() {
    return await prisma.organization.findMany({
        include: {
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
}

export default async function OrganizationsPage() {
    const session = await auth();
    const organizations = await getOrganizations();

    const canManageOrganizations = session?.user?.role === "ADMIN";

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-bold text-3xl text-gray-900">
                        組織管理
                    </h1>
                    <p className="mt-2 text-gray-600">
                        システムに登録されている組織を管理
                    </p>
                </div>
                {canManageOrganizations && (
                    <Button asChild>
                        <Link href="/dashboard/organizations/create">
                            <Plus className="mr-2 h-4 w-4" />
                            新しい組織
                        </Link>
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {organizations.map((organization) => (
                    <Card key={organization.id}>
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div>
                                    <CardTitle className="text-lg">
                                        {organization.name}
                                    </CardTitle>
                                    <CardDescription className="mt-1">
                                        {organization.description || "説明なし"}
                                    </CardDescription>
                                </div>
                                {canManageOrganizations && (
                                    <div className="flex space-x-1">
                                        <Button
                                            asChild
                                            size="sm"
                                            variant="outline"
                                        >
                                            <Link
                                                href={`/dashboard/organizations/${organization.id}`}
                                            >
                                                <Edit className="h-3 w-3" />
                                            </Link>
                                        </Button>
                                        <Button size="sm" variant="outline">
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex items-center text-gray-600 text-sm">
                                    <Users className="mr-2 h-4 w-4" />
                                    {organization._count.users} ユーザー
                                </div>
                                {organization.website && (
                                    <div className="text-sm">
                                        <a
                                            className="text-blue-600 hover:underline"
                                            href={organization.website}
                                            rel="noopener noreferrer"
                                            target="_blank"
                                        >
                                            Webサイト
                                        </a>
                                    </div>
                                )}
                                <div className="text-gray-500 text-xs">
                                    作成日: {formatDate(organization.createdAt)}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {organizations.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-4 font-medium text-gray-900 text-lg">
                            組織が見つかりません
                        </h3>
                        <p className="mt-2 text-gray-600">
                            まだ組織が登録されていません。
                        </p>
                        {canManageOrganizations && (
                            <Button asChild className="mt-4">
                                <Link href="/dashboard/organizations/create">
                                    <Plus className="mr-2 h-4 w-4" />
                                    最初の組織を作成
                                </Link>
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
