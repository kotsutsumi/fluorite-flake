"use client";
/**
 * Better Auth の React クライアント初期化をまとめるモジュール。
 * - ブラウザ環境では現在のオリジンを基準に baseURL を決定
 * - SSR / ビルド時は NEXT_PUBLIC_APP_URL をフォールバックとして利用
 * - organizationClient プラグインを登録し、組織機能の API を有効化
 */
import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const runtimeBaseURL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const authClient = createAuthClient({
  baseURL: runtimeBaseURL,
  plugins: [organizationClient()],
});

export const { useSession, signIn, signOut } = authClient;

// EOF
