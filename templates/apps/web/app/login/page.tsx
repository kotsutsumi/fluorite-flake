/**
 * ログインページ
 */
import { ThemeToggle } from "@repo/ui/components/theme-toggle";

import { LoginForm } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type LoginPageProps = {
  searchParams?: Promise<{
    prefill?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const prefillEmail = params?.prefill ?? undefined;

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle variant="ghost" />
      </div>
      <LoginForm prefillEmail={prefillEmail} />
    </div>
  );
}

// EOF
