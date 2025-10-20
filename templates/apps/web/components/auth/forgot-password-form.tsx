"use client";
/**
 * パスワードリセット用のフォームコンポーネント。
 * - メールアドレスを入力すると API `/api/auth/forget-password` にリクエスト
 * - 成否に応じてステータスメッセージを表示
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

type ForgotPasswordResponse = {
  message: string;
};

export function ForgotPasswordForm() {
  const { show, hide } = useLoadingMask();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      // 送信中は追加リクエストを防ぐ
      return;
    }

    setIsSubmitting(true);
    setStatus(null);
    show("パスワードリセットリンクを送信しています…");

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/auth/forget-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email }),
        }
      );

      const result: ForgotPasswordResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "パスワードリセットリンクの送信に失敗しました。");
      }

      setStatus({
        type: "success",
        message: "パスワードリセットリンクをメールで送信しました。メールをご確認ください。",
      });

      hide();
      setEmail("");
      setIsSubmitting(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "パスワードリセットリンクの送信に失敗しました。";
      setStatus({ type: "error", message });
      hide();
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl">パスワードをお忘れですか？</CardTitle>
        <CardDescription>
          メールアドレスを入力してください。パスワードリセットリンクを送信します。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="mb-2 block font-medium text-sm" htmlFor="forgot-email">
              メールアドレス
            </label>
            <Input
              id="forgot-email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
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
            {isSubmitting ? "送信中…" : "リセットリンクを送信"}
          </Button>
          <div className="text-center text-gray-600 text-sm">
            <Link className="text-blue-600 hover:text-blue-800" href="/login">
              ログイン画面に戻る
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// EOF
