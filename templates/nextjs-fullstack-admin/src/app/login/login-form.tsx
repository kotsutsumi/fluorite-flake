'use client';
import type React from 'react';
import { Suspense, useEffect, useId, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useLoadingMask } from '@/hooks/use-loading-mask';

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
    return '不明なエラーが発生しました';
}

const TEST_ACCOUNTS = [
    { label: 'システム管理ユーザー', email: 'admin@example.com', password: 'Admin123!' },
    { label: '組織管理ユーザー', email: 'orgadmin@example.com', password: 'OrgAdmin123!' },
    { label: '登録済み一般ユーザー', email: 'user@example.com', password: 'User123!' },
];

function InnerLoginForm() {
    const searchParams = useSearchParams();
    const [email, setEmail] = useState('admin@example.com');
    const [password, setPassword] = useState('Admin123!');
    const [status, setStatus] = useState<{ type: 'error'; message: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { show, hide } = useLoadingMask();
    const emailId = useId();
    const passwordId = useId();

    useEffect(() => {
        const prefill = searchParams.get('prefill');
        if (prefill) {
            const candidate = TEST_ACCOUNTS.find((account) => account.email === prefill);
            if (candidate) {
                setEmail(candidate.email);
                setPassword(candidate.password);
            }
        }
    }, [searchParams]);

    const handlePrefill = (account: { email: string; password: string }) => {
        setEmail(account.email);
        setPassword(account.password);
        setStatus(null);
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting) {
            return;
        }
        setStatus(null);
        setIsSubmitting(true);
        show('ログイン処理を実行しています…');
        const redirectTo = searchParams.get('redirect') ?? '/';

        try {
            const response = await fetch('/api/auth/sign-in/email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    email,
                    password,
                }),
            });

            const result = await response.json();

            if (!response.ok || result.error) {
                throw new Error(result.error?.message || 'ログインに失敗しました');
            }

            window.location.href = redirectTo;
        } catch (err: unknown) {
            setStatus({
                type: 'error',
                message: getErrorMessage(err) || 'ログインに失敗しました',
            });
            hide();
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="w-full max-w-md">
            <CardHeader className="space-y-2 text-center">
                <CardTitle className="text-2xl flex mb-6">
                    <span className="self-center ml-4">Fluorite Flake ログイン</span>
                </CardTitle>
                <CardDescription className="">アカウント情報を入力してください。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                        <label htmlFor={emailId} className="text-sm font-medium mb-2 block">
                            メールアドレス
                        </label>
                        <Input
                            className=""
                            id={emailId}
                            type="email"
                            value={email}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                setEmail(event.target.value)
                            }
                            placeholder="you@example.com"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor={passwordId} className="text-sm font-medium mb-2 block">
                            パスワード
                        </label>
                        <Input
                            className=""
                            id={passwordId}
                            type="password"
                            value={password}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                setPassword(event.target.value)
                            }
                            placeholder="********"
                            required
                        />
                    </div>
                    {status && (
                        <div className="border border-red-500 bg-red-50 p-3 rounded-md">
                            <p className="text-red-700 text-sm">{status.message}</p>
                        </div>
                    )}
                    <Button
                        type="submit"
                        className="w-full"
                        variant="default"
                        size="default"
                        disabled={isSubmitting}
                    >
                        ログイン
                    </Button>

                    <div className="grid grid-cols-1 gap-2">
                        {TEST_ACCOUNTS.map((account) => (
                            <Button
                                key={account.email}
                                className=""
                                variant="outline"
                                size="default"
                                onClick={() => handlePrefill(account)}
                            >
                                {account.label}としてログイン情報を入力
                            </Button>
                        ))}
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

export function LoginForm() {
    return (
        <div className="relative flex min-h-screen items-center justify-center bg-muted/30 px-4">
            <div className="absolute top-4 right-4 z-10">
                <ThemeToggle variant="ghost" />
            </div>
            <Suspense
                fallback={
                    <Card className="w-full max-w-md">
                        <CardHeader className="space-y-2 text-center">
                            <CardTitle className="text-2xl">ログイン</CardTitle>
                            <CardDescription className="">読み込み中...</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="h-32 bg-muted/20 rounded animate-pulse" />
                        </CardContent>
                    </Card>
                }
            >
                <InnerLoginForm />
            </Suspense>
        </div>
    );
}
