"use client";
// password-reset-request-form コンポーネントを定義する。

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

export function PasswordResetRequestForm() {
  const { show, hide } = useLoadingMask();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setStatus(null);
    show("パスワードリセットリンクを送信しています…");

    try {
      const response = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          redirectTo:
            typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || "リセットリンクの送信に失敗しました。");
      }

      setStatus({
        type: "success",
        message:
          result.message ||
          "入力いただいたメールアドレス宛にリセット方法を送信しました。受信トレイをご確認ください。",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "リクエストに失敗しました。";
      setStatus({ type: "error", message });
    } finally {
      hide();
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl">パスワードリセット</CardTitle>
        <CardDescription>
          登録済みのメールアドレスを入力すると、パスワード再設定用のリンクを送信します。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="mb-2 block font-medium text-sm" htmlFor="reset-email">
              メールアドレス
            </label>
            <Input
              id="reset-email"
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
            {isSubmitting ? "送信中…" : "メールを送信"}
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
