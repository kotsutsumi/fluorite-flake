/**
 * 新規登録ページ
 * エンドユーザー向けのサインアップ画面
 */
import { ThemeToggle } from "@repo/ui/components/theme-toggle";

import { SignupForm } from "@/components/auth/signup-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function SignupPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle variant="ghost" />
      </div>
      <SignupForm />
    </div>
  );
}

// EOF
