/**
 * ログインフォームコンポーネント
 * メール・パスワード認証
 */
"use client";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { useLoadingMask } from "@repo/ui/hooks/use-loading-mask";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type React from "react";
import { useEffect, useId, useRef, useState } from "react";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "不明なエラーが発生しました";
}

const TEST_ACCOUNTS = [
  { label: "システム管理ユーザー", email: "admin@example.com", password: "Admin123!" },
  { label: "組織管理ユーザー", email: "orgadmin@example.com", password: "OrgAdmin123!" },
  { label: "登録済み一般ユーザー", email: "user@example.com", password: "User123!" },
];

const ERROR_MESSAGES: Record<string, string> = {
  ACCOUNT_DISABLED: "アカウントが無効化されています。管理者にお問い合わせください。",
  PENDING_APPROVAL: "現在承認待ちです。承認が完了してからログインしてください。",
  REJECTED: "このアカウントは利用を拒否されています。管理者にお問い合わせください。",
};

export function LoginFormSkeleton() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl">ログイン</CardTitle>
        <CardDescription>読み込み中...</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="h-32 animate-pulse rounded bg-muted/20" />
      </CardContent>
    </Card>
  );
}

export function LoginFormClient() {
  const searchParams = useSearchParams();
  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<{ type: "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { show, hide } = useLoadingMask();
  const emailId = useId();
  const passwordId = useId();

  useEffect(() => {
    const prefill = searchParams.get("prefill");
    if (prefill) {
      const candidate = TEST_ACCOUNTS.find((account) => account.email === prefill);
      if (candidate) {
        if (emailRef.current) {
          emailRef.current.value = candidate.email;
        }
        if (passwordRef.current) {
          passwordRef.current.value = candidate.password;
        }
      }
    }
  }, [searchParams]);

  const handlePrefill = (account: { email: string; password: string }) => {
    if (emailRef.current) {
      emailRef.current.value = account.email;
    }
    if (passwordRef.current) {
      passwordRef.current.value = account.password;
    }
    setStatus(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }
    setStatus(null);
    setIsSubmitting(true);
    show("ログイン処理を実行しています…");
    const redirectTo = searchParams.get("redirect") ?? "/";
    const email = emailRef.current?.value ?? "";
    const password = passwordRef.current?.value ?? "";

    try {
      const response = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.error) {
        const code = result.code || result.error?.code;
        if (code && ERROR_MESSAGES[code]) {
          throw new Error(ERROR_MESSAGES[code]);
        }

        throw new Error(result.message || result.error?.message || "ログインに失敗しました");
      }

      window.location.href = redirectTo;
    } catch (err: unknown) {
      setStatus({
        type: "error",
        message: getErrorMessage(err) || "ログインに失敗しました",
      });
      hide();
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="mb-6 flex text-2xl">
          <span className="ml-4 self-center">Fluorite Flake ログイン</span>
        </CardTitle>
        <CardDescription className="">アカウント情報を入力してください。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="mb-2 block font-medium text-sm" htmlFor={emailId}>
              メールアドレス
            </label>
            <Input
              className=""
              id={emailId}
              placeholder="you@example.com"
              ref={emailRef}
              required
              type="email"
            />
          </div>
          <div className="space-y-2">
            <label className="mb-2 block font-medium text-sm" htmlFor={passwordId}>
              パスワード
            </label>
            <Input
              className=""
              id={passwordId}
              placeholder="********"
              ref={passwordRef}
              required
              type="password"
            />
          </div>
          {status && (
            <div className="rounded-md border border-red-500 bg-red-50 p-3">
              <p className="text-red-700 text-sm">{status.message}</p>
            </div>
          )}
          <Button
            className="w-full"
            disabled={isSubmitting}
            size="default"
            type="submit"
            variant="default"
          >
            ログイン
          </Button>

          <div className="grid grid-cols-1 gap-2">
            {TEST_ACCOUNTS.map((account) => (
              <Button
                className=""
                key={account.email}
                onClick={() => handlePrefill(account)}
                size="default"
                variant="outline"
              >
                {account.label}としてログイン情報を入力
              </Button>
            ))}
          </div>
          <div className="mt-4 flex flex-col items-center gap-2 text-gray-600 text-sm">
            <Link className="text-blue-600 hover:text-blue-800" href="/forgot-password">
              パスワードをお忘れですか？
            </Link>
            <span>
              アカウントをお持ちでない場合は{" "}
              <Link className="text-blue-600 hover:text-blue-800" href="/signup">
                新規登録
              </Link>
            </span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// EOF
