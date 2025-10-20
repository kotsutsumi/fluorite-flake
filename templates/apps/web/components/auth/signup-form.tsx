"use client";
/**
 * サインアップフォームのクライアントコンポーネント。
 * - 入力検証 (パスワード一致 / 文字数チェック)
 * - API エンドポイント `/api/auth/sign-up/email` へ POST
 * - 成功時はログインページへリダイレクト
 */

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
  status: "pending" | "approved";
  message: string;
  user?: {
    id: string;
    email: string;
    name: string | null;
  };
};

export function SignupForm() {
  const { show, hide } = useLoadingMask();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      // 二重送信を防止
      return;
    }

    if (password !== confirmPassword) {
      setStatus({ type: "error", message: "パスワードが一致しません。" });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);
    show("新規登録処理を実行しています…");

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/auth/sign-up/email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password, name: name || undefined }),
        }
      );

      const result: SignupResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "新規登録に失敗しました。");
      }

      setStatus({
        type: "success",
        message: result.message || "新規登録が完了しました。",
      });

      hide();

      setTimeout(() => {
        window.location.href = `/login?prefill=${encodeURIComponent(email)}`;
      }, VALIDATION_LIMITS.TIMEOUT.REDIRECT_DELAY);
    } catch (error) {
      const message = error instanceof Error ? error.message : "新規登録に失敗しました。";
      setStatus({ type: "error", message });
      hide();
      // 送信中フラグを解除して再試行できるようにする
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl">新規登録</CardTitle>
        <CardDescription>
          メールアドレスとパスワードを入力してアカウントを作成してください。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="mb-2 block font-medium text-sm" htmlFor="signup-name">
              氏名 (任意)
            </label>
            <Input
              id="signup-name"
              maxLength={VALIDATION_LIMITS.NAME.MAX_LENGTH}
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
              maxLength={VALIDATION_LIMITS.PASSWORD.MAX_LENGTH}
              minLength={VALIDATION_LIMITS.PASSWORD.MIN_LENGTH}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="********"
              required
              type="password"
              value={password}
            />
            <p className="text-muted-foreground text-xs">
              {VALIDATION_LIMITS.PASSWORD.MIN_LENGTH}文字以上で入力してください
            </p>
          </div>
          <div className="space-y-2">
            <label className="mb-2 block font-medium text-sm" htmlFor="signup-confirm-password">
              パスワード (確認)
            </label>
            <Input
              id="signup-confirm-password"
              maxLength={VALIDATION_LIMITS.PASSWORD.MAX_LENGTH}
              minLength={VALIDATION_LIMITS.PASSWORD.MIN_LENGTH}
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
            {isSubmitting ? "登録中…" : "新規登録"}
          </Button>
          <div className="space-y-2 text-center text-gray-600 text-sm">
            <div>
              既にアカウントをお持ちの場合は{" "}
              <Link className="text-blue-600 hover:text-blue-800" href="/login">
                ログイン
              </Link>
              してください。
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// EOF
