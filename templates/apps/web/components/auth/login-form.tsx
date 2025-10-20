"use client";
/**
 * ログインフォームのクライアントコンポーネント。
 * - Better Auth の email サインインを呼び出し、結果に応じたトーストメッセージを表示
 * - フォーム送信中はボタンを無効化し、LoadingMask を併用
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
import { signIn } from "@/lib/auth-client";
import { VALIDATION_LIMITS } from "@/lib/validation-constants";

type LoginFormProps = {
  prefillEmail?: string;
};

export function LoginForm({ prefillEmail }: LoginFormProps) {
  const { show, hide } = useLoadingMask();
  const [email, setEmail] = useState(prefillEmail ?? "");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      // 二重送信を防ぐ
      return;
    }

    setIsSubmitting(true);
    setStatus(null);
    show("ログイン処理を実行しています…");

    try {
      const { error } = await signIn.email({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message || "ログインに失敗しました。");
      }

      setStatus({
        type: "success",
        message: "ログインに成功しました。リダイレクトしています…",
      });

      hide();

      setTimeout(() => {
        window.location.href = "/";
      }, VALIDATION_LIMITS.TIMEOUT.REDIRECT_DELAY);
    } catch (error) {
      const message = error instanceof Error ? error.message : "ログインに失敗しました。";
      setStatus({ type: "error", message });
      hide();
      // 再度入力できるよう送信中フラグを解除
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl">ログイン</CardTitle>
        <CardDescription>
          メールアドレスとパスワードを入力してログインしてください。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="mb-2 block font-medium text-sm" htmlFor="login-email">
              メールアドレス
            </label>
            <Input
              id="login-email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </div>
          <div className="space-y-2">
            <label className="mb-2 block font-medium text-sm" htmlFor="login-password">
              パスワード
            </label>
            <Input
              id="login-password"
              minLength={VALIDATION_LIMITS.PASSWORD.MIN_LENGTH}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="********"
              required
              type="password"
              value={password}
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
            {isSubmitting ? "ログイン中…" : "ログイン"}
          </Button>
          <div className="space-y-2 text-center text-gray-600 text-sm">
            <div>
              <Link className="text-blue-600 hover:text-blue-800" href="/forgot-password">
                パスワードをお忘れですか？
              </Link>
            </div>
            <div>
              アカウントをお持ちでない場合は{" "}
              <Link className="text-blue-600 hover:text-blue-800" href="/signup">
                新規登録
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
