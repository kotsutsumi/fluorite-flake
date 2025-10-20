/**
 * パスワード忘れページ
 */
import { ThemeToggle } from "@repo/ui/components/theme-toggle";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function ForgotPasswordPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle variant="ghost" />
      </div>
      <ForgotPasswordForm />
    </div>
  );
}

// EOF
