"use client";
/**
 * パスワードリセットリンクから遷移するフォームコンポーネント。
 * - トークンが無効な場合のガード画面を表示
 * - 新しいパスワードの入力・確認・送信を処理
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

type PasswordResetFormProps = {
  token: string | null;
  errorCode?: string | null;
};

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_TOKEN: "トークンが無効または期限切れです。再度リセットを申請してください。",
};

export function PasswordResetForm({ token, errorCode }: PasswordResetFormProps) {
  const { show, hide } = useLoadingMask();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(
    errorCode && ERROR_MESSAGES[errorCode]
      ? { type: "error", message: ERROR_MESSAGES[errorCode] }
      : null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!token) {
    // トークンが存在しない場合はフォームを表示せず注意メッセージを出す
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl">パスワードリセット</CardTitle>
          <CardDescription>
            パスワードリセットリンクが無効か、アクセス方法が正しくありません。再度メールを確認してください。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center text-gray-600 text-sm">
          <Link className="text-blue-600 hover:text-blue-800" href="/forgot-password">
            パスワードリセットを再申請する
          </Link>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus({ type: "error", message: "パスワードが一致しません。" });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);
    show("パスワードを更新しています…");

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/auth/reset-password?token=${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ newPassword }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || "パスワードの更新に失敗しました。");
      }

      setStatus({ type: "success", message: "パスワードを更新しました。ログインしてください。" });
      hide();
      setTimeout(() => {
        window.location.href = "/login";
      }, VALIDATION_LIMITS.TIMEOUT.REDIRECT_DELAY);
    } catch (error) {
      const message = error instanceof Error ? error.message : "パスワードの更新に失敗しました。";
      setStatus({ type: "error", message });
      hide();
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl">新しいパスワードを設定</CardTitle>
        <CardDescription>
          新しいパスワードを入力して、アカウントを保護してください。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="mb-2 block font-medium text-sm" htmlFor="new-password">
              新しいパスワード
            </label>
            <Input
              id="new-password"
              minLength={VALIDATION_LIMITS.PASSWORD.MIN_LENGTH}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="********"
              required
              type="password"
              value={newPassword}
            />
          </div>
          <div className="space-y-2">
            <label className="mb-2 block font-medium text-sm" htmlFor="confirm-password">
              パスワード（確認）
            </label>
            <Input
              id="confirm-password"
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
            {isSubmitting ? "更新中…" : "パスワードを更新"}
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
