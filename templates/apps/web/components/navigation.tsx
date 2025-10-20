"use client";
// navigation コンポーネントを定義する。

import { useState } from "react";
import { signOut, useSession } from "@/lib/auth-client";

type NavLink = {
  label: string;
  href: string;
};

const navLinks: NavLink[] = [
  { label: "サービス", href: "#services" },
  { label: "インサイト", href: "#insights" },
  { label: "私たちについて", href: "#about" },
  { label: "お問い合わせ", href: "#contact" },
];

export function Navigation() {
  const { data: session, isPending } = useSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            // キャッシュされたセッション情報を確実に破棄するためハードリロードする
            window.location.replace("/");
          },
        },
      });
    } catch (_error) {
      // Logout error handled silently
      setIsLoggingOut(false);
    }
  };

  const renderAuthSection = () => {
    if (isPending) {
      return <span className="text-foreground/50 text-sm">読み込み中...</span>;
    }

    if (session?.user) {
      return (
        <>
          <span className="hidden text-foreground/70 md:block">{session.user.email}</span>
          <button
            className="hidden text-foreground/70 transition-colors hover:text-foreground md:block"
            disabled={isLoggingOut}
            onClick={handleSignOut}
            type="button"
          >
            {isLoggingOut ? "ログアウト中..." : "ログアウト"}
          </button>
        </>
      );
    }

    return (
      <>
        <a
          className="hidden text-foreground/70 transition-colors hover:text-foreground md:block"
          href="/login"
        >
          ログイン
        </a>
        <a
          className="hidden text-foreground/70 transition-colors hover:text-foreground md:block"
          href="#insights"
        >
          資料ダウンロード
        </a>
      </>
    );
  };

  return (
    <>
      <div className="border-border/60 border-b px-6 py-3">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 text-foreground/70 text-sm md:flex-row md:items-center md:justify-between">
          <span className="font-medium text-foreground">
            戦略・テクノロジー・チェンジを一つの体験として提供します。
          </span>
          <div className="flex flex-wrap items-center gap-4">
            <span>hello@yoursite.com</span>
            <span className="hidden h-4 w-px bg-border/80 md:block" />
            <span>+1 (312) 555-0149</span>
          </div>
        </div>
      </div>
      <nav className="px-6 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-6 md:flex-nowrap">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground">
              YS
            </div>
            <span className="font-semibold text-xl tracking-tight">Your Site</span>
          </div>
          <div className="hidden flex-1 items-center justify-center gap-8 font-medium text-foreground/70 text-sm md:flex">
            {navLinks.map(({ label, href }) => (
              <a className="transition-colors hover:text-foreground" href={href} key={href}>
                {label}
              </a>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-4 font-medium text-sm">
            {renderAuthSection()}
            <a
              className="rounded-full bg-primary px-5 py-2 font-semibold text-primary-foreground text-sm shadow-primary/40 shadow-sm transition hover:shadow-md"
              href="/signup"
            >
              新規登録
            </a>
          </div>
        </div>
      </nav>
    </>
  );
}

// EOF
