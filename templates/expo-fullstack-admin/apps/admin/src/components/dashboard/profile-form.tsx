'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ROLE_LABELS } from '@/lib/roles';
import type React from 'react';
import { useId, useState, useTransition } from 'react';

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
        return String((error as { message: unknown }).message);
    }
    return 'An unknown error occurred';
}

interface MembershipInfo {
    id: string;
    role: string;
    organization: {
        id: string;
        name: string;
        slug: string;
    };
}

interface ProfileUser {
    id: string;
    email: string;
    name: string | null;
    role: string;
    image: string | null;
    memberships: MembershipInfo[];
}

interface ProfileFormProps {
    user: ProfileUser | null;
}

export function ProfileForm({ user }: ProfileFormProps) {
    const [name, setName] = useState(user?.name ?? '');
    const [password, setPassword] = useState('');
    const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.image ?? null);
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(
        null
    );
    const [isPending, startTransition] = useTransition();
    const nameInputId = useId();
    const passwordInputId = useId();
    const avatarInputId = useId();

    if (!user) {
        return (
            <Card className="">
                <CardHeader className="">
                    <CardTitle className="">プロフィール</CardTitle>
                </CardHeader>
                <CardContent className="">ユーザー情報を読み込めませんでした。</CardContent>
            </Card>
        );
    }

    const handleSubmit = (formData: FormData) => {
        startTransition(async () => {
            setStatus(null);
            try {
                const response = await fetch('/api/profile', {
                    method: 'PUT',
                    body: formData,
                });

                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data.error || 'プロフィールの更新に失敗しました');
                }

                const data = await response.json();
                if (data.imageUrl) {
                    setAvatarPreview(data.imageUrl);
                }

                setPassword('');
                setStatus({ type: 'success', message: 'プロフィールを更新しました。' });
            } catch (err: unknown) {
                setStatus({
                    type: 'error',
                    message: getErrorMessage(err) || 'プロフィールの更新に失敗しました。',
                });
            }
        });
    };

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                if (!formData.get('name')) {
                    formData.set('name', name);
                }
                handleSubmit(formData);
            }}
            className="grid gap-6 lg:grid-cols-3"
            encType="multipart/form-data"
        >
            <Card className="lg:col-span-2">
                <CardHeader className="">
                    <CardTitle className="">プロフィール</CardTitle>
                    <CardDescription className="">
                        氏名とパスワード、プロフィール画像を更新できます。
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <label
                            htmlFor={nameInputId}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            氏名
                        </label>
                        <Input
                            id={nameInputId}
                            name="name"
                            value={name}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                setName(event.target.value)
                            }
                            placeholder="山田 太郎"
                            className=""
                            type="text"
                        />
                    </div>
                    <div className="space-y-2">
                        <label
                            htmlFor={passwordInputId}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            パスワード (任意)
                        </label>
                        <Input
                            id={passwordInputId}
                            name="password"
                            type="password"
                            value={password}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                setPassword(event.target.value)
                            }
                            placeholder="新しいパスワード"
                            className=""
                        />
                        <p className="text-xs text-muted-foreground">
                            8文字以上で入力してください。入力しない場合は変更されません。
                        </p>
                    </div>
                    <div className="space-y-2">
                        <label
                            htmlFor={avatarInputId}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            プロフィール画像
                        </label>
                        <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16">
                                <AvatarImage
                                    src={avatarPreview ?? undefined}
                                    alt={user.name ?? user.email}
                                    className=""
                                />
                                <AvatarFallback className="">
                                    {(user.name ?? user.email).slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <Input
                                id={avatarInputId}
                                name="avatar"
                                type="file"
                                accept="image/*"
                                className=""
                                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                                    const file = event.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onload = () => {
                                            if (typeof reader.result === 'string') {
                                                setAvatarPreview(reader.result);
                                            }
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                }}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            画像をアップロードすると現在のプロフィール画像が更新されます。
                        </p>
                    </div>
                    {status && (
                        <p
                            className={
                                status.type === 'success'
                                    ? 'text-sm text-emerald-600'
                                    : 'text-sm text-destructive'
                            }
                        >
                            {status.message}
                        </p>
                    )}
                    <Button
                        type="submit"
                        disabled={isPending}
                        className=""
                        variant="default"
                        size="default"
                    >
                        変更を保存する
                    </Button>
                </CardContent>
            </Card>

            <Card className="">
                <CardHeader className="">
                    <CardTitle className="">アカウント情報</CardTitle>
                    <CardDescription className="">権限と所属組織を確認できます。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <p className="text-xs text-muted-foreground">メールアドレス</p>
                        <p className="font-medium">{user.email}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">ロール</p>
                        <p className="font-medium">
                            {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] ?? user.role}
                        </p>
                    </div>
                    <Separator className="" />
                    <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">所属組織</p>
                        {user.memberships.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                所属組織が登録されていません。
                            </p>
                        )}
                        {user.memberships.map((membership) => (
                            <div key={membership.id} className="rounded-md border p-3">
                                <p className="font-medium">{membership.organization.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    ロール: {membership.role}
                                </p>
                                <p className="text-xs text-muted-foreground">
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
