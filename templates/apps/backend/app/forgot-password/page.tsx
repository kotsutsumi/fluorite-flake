/**
 * パスワードリセット申請ページ
 */
import { ThemeToggle } from "@repo/ui/components/theme-toggle";

import { PasswordResetRequestForm } from "@/components/auth/password-reset-request-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function ForgotPasswordPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle variant="ghost" />
      </div>
      <PasswordResetRequestForm />
    </div>
  );
}

// EOF
