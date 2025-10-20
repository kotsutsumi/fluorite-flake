/**
 * アクセス履歴ページ
 * ユーザーのログイン履歴・アクセス記録表示
 */
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AccessHistoryClient } from "@/components/access-history/access-history-client";
import { AccessHistorySkeleton } from "@/components/access-history/access-history-skeleton";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { getSession } from "@/lib/auth-server";
import { APP_ROLES } from "@/lib/roles";

type PageProps = {
  params: Promise<{
    tab?: string[];
  }>;
};

export default async function AccessHistoryPage({ params }: PageProps) {
  const session = await getSession();

  // params to comply with Next.js 15 requirements を待機する
  const resolvedParams = await params;

  // Get the current tab from URL params, default to 'overview'
  const currentTab = resolvedParams.tab?.[0] || "overview";

  // Validate tab parameter
  const validTabs = ["overview", "charts", "logs"];
  if (!validTabs.includes(currentTab)) {
    redirect("/access-history/overview");
  }

  if (!session?.user) {
    redirect("/login");
  }

  // user has permission to view access history か確認する
  if (session.user.role !== APP_ROLES.ADMIN && session.user.role !== APP_ROLES.ORG_ADMIN) {
    redirect("/");
  }

  return (
    <DashboardLayout user={session.user}>
      <div className="space-y-6">
        <div>
          <h1 className="font-bold text-3xl tracking-tight">アクセス履歴</h1>
          <p className="text-muted-foreground">システムへのアクセス状況を確認できます</p>
        </div>

        <Suspense fallback={<AccessHistorySkeleton />}>
          <AccessHistoryClient initialTab={currentTab} user={session.user} />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}

// EOF
