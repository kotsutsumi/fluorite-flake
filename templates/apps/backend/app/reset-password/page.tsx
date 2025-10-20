/**
 * パスワード再設定ページ
 */
import { ThemeToggle } from "@repo/ui/components/theme-toggle";

import { PasswordResetForm } from "@/components/auth/password-reset-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ResetPasswordPageProps = {
  searchParams?: Promise<{
    token?: string;
    error?: string;
  }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const token = params?.token ?? null;
  const error = params?.error ?? null;

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle variant="ghost" />
      </div>
      <PasswordResetForm errorCode={error} token={token} />
    </div>
  );
}

// EOF
