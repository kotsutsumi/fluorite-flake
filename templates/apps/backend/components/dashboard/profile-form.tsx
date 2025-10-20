"use client";
// profile-form コンポーネントを定義する。

import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Separator } from "@repo/ui/components/separator";
import type React from "react";
import { useId, useState, useTransition } from "react";
import { ROLE_LABELS } from "@/lib/roles";

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
  return "An unknown error occurred";
}

type MembershipInfo = {
  id: string;
  role: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
};

type ProfileUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  image: string | null;
  memberships: MembershipInfo[];
};

type ProfileFormProps = {
  user: ProfileUser | null;
};

export function ProfileForm({ user }: ProfileFormProps) {
  const [name, setName] = useState(user?.name ?? "");
  const [password, setPassword] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.image ?? null);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const nameInputId = useId();
  const passwordInputId = useId();
  const avatarInputId = useId();

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>プロフィール</CardTitle>
        </CardHeader>
        <CardContent>ユーザー情報を読み込めませんでした。</CardContent>
      </Card>
    );
  }

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      setStatus(null);
      try {
        const response = await fetch("/api/profile", {
          method: "PUT",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "プロフィールの更新に失敗しました");
        }

        const data = await response.json();
        if (data.imageUrl) {
          setAvatarPreview(data.imageUrl);
        }

        setPassword("");
        setStatus({ type: "success", message: "プロフィールを更新しました。" });

        // ヘッダーのアバターを最新化するため、短い遅延後にページをリロード
        const RELOAD_DELAY_MS = 1000;
        setTimeout(() => {
          window.location.reload();
        }, RELOAD_DELAY_MS);
      } catch (err: unknown) {
        setStatus({
          type: "error",
          message: getErrorMessage(err) || "プロフィールの更新に失敗しました。",
        });
      }
    });
  };

  return (
    <form
      className="grid gap-6 lg:grid-cols-3"
      encType="multipart/form-data"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        if (!formData.get("name")) {
          formData.set("name", name);
        }
        handleSubmit(formData);
      }}
    >
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>プロフィール</CardTitle>
          <CardDescription>氏名とパスワード、プロフィール画像を更新できます。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label
              className="font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              htmlFor={nameInputId}
            >
              氏名
            </label>
            <Input
              id={nameInputId}
              name="name"
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value)}
              placeholder="山田 太郎"
              type="text"
              value={name}
            />
          </div>
          <div className="space-y-2">
            <label
              className="font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              htmlFor={passwordInputId}
            >
              パスワード (任意)
            </label>
            <Input
              id={passwordInputId}
              name="password"
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setPassword(event.target.value)
              }
              placeholder="新しいパスワード"
              type="password"
              value={password}
            />
            <p className="text-muted-foreground text-xs">
              8文字以上で入力してください。入力しない場合は変更されません。
            </p>
          </div>
          <div className="space-y-2">
            <label
              className="font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              htmlFor={avatarInputId}
            >
              プロフィール画像
            </label>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage alt={user.name ?? user.email} src={avatarPreview ?? undefined} />
                <AvatarFallback>
                  {(user.name ?? user.email).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Input
                accept="image/*"
                id={avatarInputId}
                name="avatar"
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                      if (typeof reader.result === "string") {
                        setAvatarPreview(reader.result);
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                type="file"
              />
            </div>
            <p className="text-muted-foreground text-xs">
              画像をアップロードすると現在のプロフィール画像が更新されます。
            </p>
          </div>
          {status && (
            <p
              className={
                status.type === "success" ? "text-emerald-600 text-sm" : "text-destructive text-sm"
              }
            >
              {status.message}
            </p>
          )}
          <Button disabled={isPending} type="submit">
            変更を保存する
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>アカウント情報</CardTitle>
          <CardDescription>権限と所属組織を確認できます。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-muted-foreground text-xs">メールアドレス</p>
            <p className="font-medium">{user.email}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">ロール</p>
            <p className="font-medium">
              {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] ?? user.role}
            </p>
          </div>
          <Separator />
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs">所属組織</p>
            {user.memberships.length === 0 && (
              <p className="text-muted-foreground text-sm">所属組織が登録されていません。</p>
            )}
            {user.memberships.map((membership) => (
              <div className="rounded-md border p-3" key={membership.id}>
                <p className="font-medium">{membership.organization.name}</p>
                <p className="text-muted-foreground text-xs">ロール: {membership.role}</p>
                <p className="text-muted-foreground text-xs">
                  slug: {membership.organization.slug}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

// EOF
