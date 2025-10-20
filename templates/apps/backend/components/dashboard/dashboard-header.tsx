/**
 * ダッシュボードヘッダーコンポーネント
 * ユーザー情報表示・テーマ切替・ログアウト機能を提供
 */
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { ThemeToggle } from "@repo/ui/components/theme-toggle";
import { type AppRole, ROLE_LABELS } from "@/lib/roles";
import { LogoutButton } from "./logout-button";

type DashboardHeaderProps = {
  user: {
    id: string;
    email: string;
    name: string;
    role: AppRole | string;
    image?: string | null;
  };
};

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const initials = user.name
    ? user.name
        .split(" ")
        .map((part) => part.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : user.email.slice(0, 2).toUpperCase();

  return (
    <header className="flex items-center justify-between border-b bg-background/60 px-6 py-4">
      <div>
        <h1 className="mb-3 font-semibold text-2xl">ダッシュボード</h1>
        <p className="text-muted-foreground text-sm">
          {ROLE_LABELS[(user.role as AppRole) ?? "user"] || "一般ユーザー"} / {user.email}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Avatar>
          {user.image && <AvatarImage alt={user.name || user.email} src={user.image} />}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <ThemeToggle className="h-10 w-10" variant="ghost" />
        <LogoutButton />
      </div>
    </header>
  );
}

// EOF
