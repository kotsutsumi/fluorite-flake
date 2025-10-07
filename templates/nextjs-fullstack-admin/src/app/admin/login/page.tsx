import type { Metadata } from 'next';

import { AdminLoginForm } from '@/components/admin/AdminLoginForm';

export const metadata: Metadata = {
    title: '管理画面ログイン - Fluorite Flake',
    description: '管理画面へのログイン',
};

export default function AdminLoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        管理画面
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        管理者権限でログインしてください
                    </p>
                </div>
                <AdminLoginForm />
            </div>
        </div>
    );
}
