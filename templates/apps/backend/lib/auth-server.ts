// サーバーサイドでの認証ヘルパーとロール判定を提供する。
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { type AuthSession, auth } from "./auth";
import prisma from "./db";
import type { AppRole } from "./roles";
import { APP_ROLES } from "./roles";

// Better Auth のセッション管理機能をそのまま利用する
export type SessionPayload = AuthSession;

export async function getSession(): Promise<SessionPayload | null> {
  const headersList = await headers();
  // Route Handler では headers() を介してリクエストスコープのヘッダーを取得
  return getSessionFromHeaders(headersList);
}

export async function getSessionFromHeaders(headersInit: Headers): Promise<SessionPayload | null> {
  const session = (await auth.api.getSession({
    headers: headersInit,
  })) as AuthSession | null;

  return session;
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();

  if (!session) {
    // 未ログインの場合はログインページへリダイレクト
    redirect("/login");
  }

  return session;
}

export function hasRole(userRole: string | null | undefined, allowed: AppRole[]): boolean {
  if (!userRole) {
    return false;
  }
  return allowed.includes(userRole as AppRole);
}

export function assertRole(session: Awaited<ReturnType<typeof getSession>>, allowed: AppRole[]) {
  if (!(session && hasRole(session.user?.role, allowed))) {
    // 権限が不足している場合はトップページへ戻す
    redirect("/");
  }
}

// ユーザーがアクセスできる組織 ID を取得する
export async function getAccessibleOrganizationIds(
  userId: string,
  role: AppRole
): Promise<string[]> {
  // 管理者ユーザーはすべての組織にアクセスできる
  if (role === APP_ROLES.ADMIN) {
    const organizations = await prisma.organization.findMany({
      select: { id: true },
    });
    return organizations.map((org) => org.id);
  }

  // 一般ユーザーは所属している組織のみアクセスできる
  const memberships = await prisma.member.findMany({
    where: { userId },
    select: { organizationId: true },
  });

  return memberships.map((m) => m.organizationId);
}

// EOF
