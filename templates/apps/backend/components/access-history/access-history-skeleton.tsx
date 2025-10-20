// access-history-skeleton コンポーネントを定義する。
import { Card, CardContent, CardHeader } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";

const STAT_CARD_COUNT = 4;
const CHART_CARD_COUNT = 2;
const RECENT_ACTIVITY_COUNT = 5;

export function AccessHistorySkeleton() {
  const statCards = Array.from({ length: STAT_CARD_COUNT }, (_, i) => ({
    id: `stat-${i}`,
  }));
  const chartCards = Array.from({ length: CHART_CARD_COUNT }, (_, i) => ({
    id: `chart-${i}`,
  }));
  const recentActivityItems = Array.from({ length: RECENT_ACTIVITY_COUNT }, (_, i) => ({
    id: `activity-${i}`,
  }));

  return (
    <div className="space-y-6">
      {/* Stats Overview Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="mb-2 h-8 w-20" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tab Navigation Skeleton */}
      <div className="space-y-4">
        <div className="border-border border-b">
          <div className="-mb-px flex space-x-8">
            <Skeleton className="h-10 w-16" />
            <Skeleton className="h-10 w-16" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>

        {/* Content Area Skeleton */}
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {chartCards.map((card) => (
              <Card key={card.id}>
                <CardHeader>
                  <Skeleton className="mb-2 h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[200px] w-full" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent Activity Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="mb-2 h-6 w-32" />
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivityItems.map((item) => (
                  <div className="flex items-center space-x-4" key={item.id}>
                    <Skeleton className="h-8 w-20" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// EOF
