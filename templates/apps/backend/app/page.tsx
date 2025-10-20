/**
 * バックエンド管理ダッシュボードページ
 *
 * 管理者・ユーザーの権限に応じて、組織の統計情報やアクセス可能なデータを表示する
 * サーバーサイドレンダリングを使用してリアルタイムなデータを提供
 */

import type { Prisma } from "@prisma/client";
import { Badge } from "@repo/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import type { ComponentType } from "react";
import { Suspense } from "react";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { getAccessibleOrganizationIds, type getSession, requireSession } from "@/lib/auth-server";
import prisma from "@/lib/db";
import { APP_ROLES, type AppRole } from "@/lib/roles";

// 動的レンダリングを強制してリアルタイムなデータを取得
export const dynamic = "force-dynamic";

// Prismaの型定義：メンバー数を含む組織データ
type OrganizationWithMemberCount = Prisma.OrganizationGetPayload<{
  include: { _count: { select: { members: true } } };
}>;

/**
 * ダッシュボードコンテンツコンポーネント
 * 統計情報と組織一覧を表示
 */
async function DashboardContent({ userId, role }: { userId: string; role: AppRole }) {
  const organizationIds = await getAccessibleOrganizationIds(userId, role);

  // ロールに応じて組織データを取得（管理者は全組織、ユーザーはアクセス可能な組織のみ）
  const organizations: OrganizationWithMemberCount[] = await prisma.organization.findMany({
    where: role === APP_ROLES.ADMIN ? undefined : { id: { in: organizationIds } },
    include: {
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5, // 直近5件のみ表示
  });

  // 権限範囲内のメンバー総数を取得
  const memberCount = await prisma.member.count({
    where: role === APP_ROLES.ADMIN ? undefined : { organizationId: { in: organizationIds } },
  });

  // 未処理の招待数を取得
  const pendingInvites = await prisma.invitation.count({
    where:
      role === APP_ROLES.ADMIN
        ? undefined
        : { organizationId: { in: organizationIds }, status: "pending" },
  });

  // データベースデモコンポーネントの動的インポート
  let DatabaseDemo: ComponentType | null = null;
  try {
    const module = await import("@/components/database-demo");
    DatabaseDemo = module.default;
  } catch {
    // インポートに失敗した場合はnullを設定（コンポーネントが存在しない場合）
    DatabaseDemo = null;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {/* 組織数統計カード */}
      <Card className="">
        <CardHeader className="">
          <CardTitle className="">参加している組織</CardTitle>
        </CardHeader>
        <CardContent className="">
          <p className="font-bold text-4xl">{organizations.length}</p>
          <p className="text-muted-foreground text-sm">直近5件までの組織を表示しています</p>
        </CardContent>
      </Card>

      {/* メンバー数統計カード */}
      <Card className="">
        <CardHeader className="">
          <CardTitle className="">所属ユーザー</CardTitle>
        </CardHeader>
        <CardContent className="">
          <p className="font-bold text-4xl">{memberCount}</p>
          <p className="text-muted-foreground text-sm">権限に応じて閲覧可能なユーザー数</p>
        </CardContent>
      </Card>

      {/* 未処理招待数統計カード */}
      <Card className="">
        <CardHeader className="">
          <CardTitle className="">未処理の招待</CardTitle>
        </CardHeader>
        <CardContent className="">
          <p className="font-bold text-4xl">{pendingInvites}</p>
          <p className="text-muted-foreground text-sm">期限切れに注意してください</p>
        </CardContent>
      </Card>

      {/* 組織一覧カード（全幅） */}
      <Card className="md:col-span-2 xl:col-span-3">
        <CardHeader className="">
          <CardTitle className="">最近の組織</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {organizations.map((organization) => (
            <div
              className="rounded-lg border border-border bg-card p-4 shadow-sm"
              key={organization.id}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">{organization.name}</h3>
                <Badge className="" variant="secondary">
                  メンバー {organization._count.members}
                </Badge>
              </div>
              <p className="mt-2 text-muted-foreground text-sm">slug: {organization.slug}</p>
              <p className="text-muted-foreground text-xs">
                作成日: {organization.createdAt.toLocaleDateString("ja-JP")}
              </p>
            </div>
          ))}
          {/* 組織が存在しない場合のメッセージ */}
          {organizations.length === 0 && (
            <p className="text-muted-foreground text-sm">表示する組織がまだありません。</p>
          )}
        </CardContent>
      </Card>

      {/* データベースデモコンポーネントが利用可能な場合のみ表示 */}
      {DatabaseDemo && (
        <div className="md:col-span-2 xl:col-span-3">
          <DatabaseDemo />
        </div>
      )}
    </div>
  );
}

/**
 * メインダッシュボードページコンポーネント
 *
 * 機能:
 * - ユーザーの認証状態とロールの確認
 * - ロールベースでアクセス可能な組織データの取得
 * - 統計情報の表示（組織数、メンバー数、未処理招待数）
 * - 最近作成された組織の一覧表示
 */
export default async function DashboardPage() {
  // セッション情報の取得と認証チェック
  const session: Awaited<ReturnType<typeof getSession>> = await requireSession();
  const role = (session.user?.role as string) ?? APP_ROLES.USER;

  // セッション情報をシリアライズ可能な形式に変換
  const serializableUser = {
    id: session.user?.id ?? "",
    name: session.user?.name ?? "",
    email: session.user?.email ?? "",
    role: session.user?.role ?? "user",
  };

  return (
    <DashboardLayout user={serializableUser}>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent role={role as AppRole} userId={session.user.id} />
      </Suspense>
    </DashboardLayout>
  );
}

// EOF
