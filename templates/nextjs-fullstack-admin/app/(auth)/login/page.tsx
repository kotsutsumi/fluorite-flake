import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
    title: "ログイン | Fluorite Admin",
    description: "管理システムにログイン",
};

export default async function LoginPage() {
    const session = await auth();

    if (session) {
        redirect("/dashboard");
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8">
                <div>
                    <h2 className="mt-6 text-center font-extrabold text-3xl text-gray-900">
                        Fluorite Admin
                    </h2>
                    <p className="mt-2 text-center text-gray-600 text-sm">
                        管理システムにログインしてください
                    </p>
                </div>
                <LoginForm />
            </div>
        </div>
    );
}
