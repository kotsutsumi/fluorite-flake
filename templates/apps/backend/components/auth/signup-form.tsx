"use client";
// signup-form コンポーネントを定義する。

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
import { useState } from "react";
import { VALIDATION_LIMITS } from "@/lib/validation-constants";

type SignupResponse = {
  message: string;
  status: "pending" | "approved";
};

export function SignupForm() {
  const { show, hide } = useLoadingMask();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (password !== confirmPassword) {
      setStatus({ type: "error", message: "パスワードが一致しません。" });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);
    show("登録処理を実行しています…");

    try {
      const response = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const result: SignupResponse & { error?: string } = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || "登録に失敗しました。");
      }

      setStatus({
        type: "success",
        message: result.message,
      });

      hide();

      if (result.status === "approved") {
        setTimeout(() => {
          window.location.href = `/login?prefill=${encodeURIComponent(email)}`;
        }, VALIDATION_LIMITS.TIMEOUT.REDIRECT_DELAY);
      } else {
        setIsSubmitting(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "登録に失敗しました。";
      setStatus({ type: "error", message });
      hide();
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl">新規登録</CardTitle>
        <CardDescription>
          アカウント情報を入力し、承認完了後にログインして利用を開始できます。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="mb-2 block font-medium text-sm" htmlFor="signup-name">
              氏名（任意）
            </label>
            <Input
              id="signup-name"
              onChange={(event) => setName(event.target.value)}
              placeholder="山田 太郎"
              type="text"
              value={name}
            />
          </div>
          <div className="space-y-2">
            <label className="mb-2 block font-medium text-sm" htmlFor="signup-email">
              メールアドレス
            </label>
            <Input
              id="signup-email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </div>
          <div className="space-y-2">
            <label className="mb-2 block font-medium text-sm" htmlFor="signup-password">
              パスワード
            </label>
            <Input
              id="signup-password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="********"
              required
              type="password"
              value={password}
            />
          </div>
          <div className="space-y-2">
            <label className="mb-2 block font-medium text-sm" htmlFor="signup-password-confirm">
              パスワード（確認）
            </label>
            <Input
              id="signup-password-confirm"
              minLength={8}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="********"
              required
              type="password"
              value={confirmPassword}
            />
          </div>
          {status && (
            <div
              className={`rounded-md border p-3 text-sm ${
                status.type === "success"
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {status.message}
            </div>
          )}
          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? "登録処理中…" : "登録する"}
          </Button>
          <div className="text-center text-gray-600 text-sm">
            すでにアカウントをお持ちの場合は{" "}
            <Link className="text-blue-600 hover:text-blue-800" href="/login">
              ログイン
            </Link>
            してください。
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// EOF
