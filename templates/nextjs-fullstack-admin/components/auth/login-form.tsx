"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { type UserLogin, userLoginSchema } from "@/lib/schemas";

export function LoginForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<UserLogin>({
        resolver: zodResolver(userLoginSchema),
    });

    const onSubmit = async (data: UserLogin) => {
        try {
            setIsLoading(true);
            setError("");

            const result = await signIn("credentials", {
                email: data.email,
                password: data.password,
                redirect: false,
            });

            if (result?.error) {
                setError("メールアドレスまたはパスワードが正しくありません");
                return;
            }

            router.push("/dashboard");
            router.refresh();
        } catch (loginError) {
            setError("ログインに失敗しました");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>ログイン</CardTitle>
                <CardDescription>
                    アカウントにログインしてください
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                    <div className="space-y-2">
                        <label className="font-medium text-sm" htmlFor="email">
                            メールアドレス
                        </label>
                        <Input
                            id="email"
                            placeholder="user@example.com"
                            type="email"
                            {...register("email")}
                            disabled={isLoading}
                        />
                        {errors.email && (
                            <p className="text-red-600 text-sm">
                                {errors.email.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label
                            className="font-medium text-sm"
                            htmlFor="password"
                        >
                            パスワード
                        </label>
                        <Input
                            id="password"
                            placeholder="パスワードを入力"
                            type="password"
                            {...register("password")}
                            disabled={isLoading}
                        />
                        {errors.password && (
                            <p className="text-red-600 text-sm">
                                {errors.password.message}
                            </p>
                        )}
                    </div>

                    {error && (
                        <div className="rounded-md bg-red-50 p-4">
                            <p className="text-red-800 text-sm">{error}</p>
                        </div>
                    )}

                    <Button
                        className="w-full"
                        disabled={isLoading}
                        type="submit"
                    >
                        {isLoading ? "ログイン中..." : "ログイン"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
