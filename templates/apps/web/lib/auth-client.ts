"use client";
// Better Auth の React クライアントを初期化し、サインイン API を提供する
import { createAuthClient } from "better-auth/react";

// Next.js のリライトや Cookie を同一オリジンでやり取りできるよう、実行時のオリジンを使用
const runtimeBaseURL =
  typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

export const authClient = createAuthClient({
  baseURL: runtimeBaseURL,
});

export const { useSession, signIn, signOut } = authClient;

// EOF
