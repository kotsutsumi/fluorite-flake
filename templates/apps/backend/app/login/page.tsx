/**
 * ログインページ
 * Better Auth統合のログイン画面
 */
import { ThemeToggle } from "@repo/ui/components/theme-toggle";
import { Suspense } from "react";
import { LoginFormClient, LoginFormSkeleton } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle variant="ghost" />
      </div>
      <Suspense fallback={<LoginFormSkeleton />}>
        <LoginFormClient />
      </Suspense>
    </div>
  );
}

// EOF
