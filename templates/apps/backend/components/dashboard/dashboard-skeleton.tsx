// dashboard-skeleton コンポーネントを定義する。
import { Card, CardContent, CardHeader } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";

const STATS_CARD_COUNT = 3;
const ORGANIZATION_CARD_COUNT = 3;
const ADMIN_STAT_CARD_COUNT = 7;

export function DashboardSkeleton() {
  const statsCards = Array.from({ length: STATS_CARD_COUNT }, (_, i) => ({
    id: `stats-${i}`,
  }));
  const orgCards = Array.from({ length: ORGANIZATION_CARD_COUNT }, (_, i) => ({
    id: `org-${i}`,
  }));

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {/* Statistics cards skeleton */}
      {statsCards.map((card) => (
        <Card key={card.id}>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-4 w-48" />
          </CardContent>
        </Card>
      ))}

      {/* Organizations list skeleton */}
      <Card className="md:col-span-2 xl:col-span-3">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {orgCards.map((card) => (
            <div className="rounded-lg border border-border bg-card p-4 shadow-sm" key={card.id}>
              <Skeleton className="mb-2 h-6 w-40" />
              <Skeleton className="mb-1 h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function AdminStatsSkeleton() {
  const adminStatCards = Array.from({ length: ADMIN_STAT_CARD_COUNT }, (_, i) => ({
    id: `admin-stat-${i}`,
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <Skeleton className="mb-6 h-6 w-32" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {adminStatCards.map((card) => (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm" key={card.id}>
              <div className="flex items-center">
                <Skeleton className="mr-4 h-12 w-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// EOF
