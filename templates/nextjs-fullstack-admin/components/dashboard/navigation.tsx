"use client";

import { Building2, LogOut, Settings, User, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function getRoleDisplayName(role?: string): string {
    if (role === "ADMIN") {
        return "管理者";
    }
    if (role === "MANAGER") {
        return "マネージャー";
    }
    return "ユーザー";
}

const navigation = [
    { name: "ダッシュボード", href: "/dashboard", icon: Settings },
    { name: "ユーザー", href: "/dashboard/users", icon: Users },
    { name: "組織", href: "/dashboard/organizations", icon: Building2 },
    { name: "プロフィール", href: "/dashboard/users/profile", icon: User },
];

export function Navigation() {
    const pathname = usePathname();
    const { data: session } = useSession();

    const handleSignOut = () => {
        signOut({ callbackUrl: "/login" });
    };

    return (
        <nav className="h-full border-gray-200 border-r bg-white shadow-sm">
            <div className="flex h-full flex-col">
                <div className="flex h-16 items-center justify-between border-gray-200 border-b px-4">
                    <h1 className="font-semibold text-gray-900 text-xl">
                        管理パネル
                    </h1>
                </div>

                <div className="flex-1 px-4 py-6">
                    <ul className="space-y-2">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <li key={item.name}>
                                    <Link
                                        className={cn(
                                            "flex items-center rounded-md px-3 py-2 font-medium text-sm transition-colors",
                                            isActive
                                                ? "bg-blue-100 text-blue-700"
                                                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                        )}
                                        href={item.href}
                                    >
                                        <item.icon className="mr-3 h-4 w-4" />
                                        {item.name}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <div className="border-gray-200 border-t p-4">
                    <div className="mb-4 flex items-center">
                        <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm">
                                {session?.user?.name || "ユーザー"}
                            </p>
                            <p className="text-gray-500 text-xs">
                                {getRoleDisplayName(session?.user?.role)}
                            </p>
                        </div>
                    </div>
                    <Button
                        className="w-full"
                        onClick={handleSignOut}
                        size="sm"
                        variant="outline"
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        ログアウト
                    </Button>
                </div>
            </div>
        </nav>
    );
}
