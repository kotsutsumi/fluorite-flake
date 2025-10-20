/**
 * ダッシュボードサイドバーコンポーネント
 * ナビゲーションメニューとロールベースのアクセス制御
 */
import { cn } from "@repo/ui/lib/utils";
import { BarChart3, LayoutDashboard, UserRound, Users2 } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import type React from "react";
import { APP_ROLES, type AppRole } from "@/lib/roles";

const NAV_ITEMS: Array<{
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: AppRole[];
}> = [
  {
    href: "/",
    label: "ダッシュボード",
    icon: LayoutDashboard,
    roles: [APP_ROLES.ADMIN, APP_ROLES.ORG_ADMIN, APP_ROLES.USER],
  },
  {
    href: "/users",
    label: "ユーザー管理",
    icon: Users2,
    roles: [APP_ROLES.ADMIN, APP_ROLES.ORG_ADMIN],
  },
  {
    href: "/profile",
    label: "プロフィール",
    icon: UserRound,
    roles: [APP_ROLES.ADMIN, APP_ROLES.ORG_ADMIN, APP_ROLES.USER],
  },
  {
    href: "/access-history",
    label: "アクセス履歴",
    icon: BarChart3,
    roles: [APP_ROLES.ADMIN, APP_ROLES.ORG_ADMIN],
  },
] as const;

type SidebarProps = {
  user: {
    id: string;
    email: string;
    name: string;
    role: AppRole | string;
  };
};

export async function Sidebar({ user }: SidebarProps) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "/";
  const role = (user.role as AppRole) ?? APP_ROLES.USER;

  return (
    <aside className="hidden w-64 border-r bg-background/80 p-6 shadow-sm md:block">
      <div className="mb-8 flex items-center gap-3">
        <div>
          <h2 className="font-semibold text-lg">{user.name || user.email || "Unknown User"}</h2>
          <p className="text-muted-foreground text-xs">ロール: {roleLabel(role)}</p>
        </div>
      </div>
      <nav className="space-y-2">
        {NAV_ITEMS.filter((item) => item.roles.includes(role)).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted"
              )}
              href={item.href}
              key={item.href}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function roleLabel(role: AppRole) {
  switch (role) {
    case APP_ROLES.ADMIN:
      return "管理ユーザー";
    case APP_ROLES.ORG_ADMIN:
      return "組織管理ユーザー";
    default:
      return "一般ユーザー";
  }
}

// EOF
