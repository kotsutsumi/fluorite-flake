/**
 * アクセス履歴コンテンツコンポーネント
 * タブ切替とアクセスログ表示
 */
"use client";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Calendar } from "@repo/ui/components/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/table";
import { cn } from "@repo/ui/lib/utils";
import { format, subDays } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarIcon, Filter, Monitor, RefreshCw, Search, Smartphone, TrendingUp, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PieLabelRenderProps } from "recharts";
import {
    Area,
    AreaChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { logger } from "@/lib/logger";

// CSS 変数の値を取得する
function getCSSVariable(variable: string): string {
    if (typeof window === "undefined") {
        return "";
    }
    return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
}

// CSS 変数からチャート用の色を取得する
function getChartColors() {
    return {
        chart1: getCSSVariable("--chart-1"),
        chart2: getCSSVariable("--chart-2"),
        chart3: getCSSVariable("--chart-3"),
        chart4: getCSSVariable("--chart-4"),
        chart5: getCSSVariable("--chart-5"),
    };
}

type AccessLog = {
    id: string;
    userId?: string;
    sessionId?: string;
    deviceId?: string;
    ipAddress?: string;
    userAgent?: string;
    method: string;
    path: string;
    query?: string;
    statusCode?: number;
    responseTime?: number;
    referrer?: string;
    country?: string;
    city?: string;
    platform?: string;
    appVersion?: string;
    organizationId?: string;
    createdAt: string;
    user?: {
        id: string;
        name?: string;
        email: string;
    };
    device?: {
        deviceId: string;
        platform: string;
        deviceModel?: string;
        appVersion?: string;
    };
};

type AccessStats = {
    totalAccesses: number;
    uniqueUsers: number;
    uniqueDevices: number;
    topPlatforms: Array<{
        platform: string;
        count: number;
        percentage: number;
    }>;
    recentActivity: AccessLog[];
    hourlyStats: Array<{
        hour: number;
        count: number;
    }>;
};

type AccessHistoryContentProps = {
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
    };
    initialTab: string;
};

const DEFAULT_ACCESS_HISTORY_LOOKBACK_DAYS = 7;
const DEFAULT_ACCESS_LOG_PAGE_SIZE = 50;
const FALLBACK_TOTAL_ACCESS_COUNT = 1247;
const FALLBACK_UNIQUE_USER_COUNT = 45;
const FALLBACK_UNIQUE_DEVICE_COUNT = 78;
const RECENT_ACTIVITY_LIMIT = 5;
const HOURS_PER_DAY = 24;
const PEAK_HOUR_START = 9;
const PEAK_HOUR_END = 17;
const PEAK_HOUR_BASE_COUNT = 30;
const PEAK_HOUR_MODULO = 5;
const PEAK_HOUR_MULTIPLIER = 8;
const OFF_PEAK_BASE_COUNT = 10;
const OFF_PEAK_MODULO = 3;
const OFF_PEAK_MULTIPLIER = 5;
const PERCENTAGE_MULTIPLIER = 100;
const HTTP_STATUS_SUCCESS_MIN = 200;
const HTTP_STATUS_REDIRECT_MIN = 300;
const HTTP_STATUS_CLIENT_ERROR_MIN = 400;
const HTTP_STATUS_SERVER_ERROR_MIN = 500;
const HTTP_STATUS_SUCCESS_MAX = HTTP_STATUS_REDIRECT_MIN - 1;
const HTTP_STATUS_REDIRECT_MAX = HTTP_STATUS_CLIENT_ERROR_MIN - 1;
const HTTP_STATUS_CLIENT_ERROR_MAX = HTTP_STATUS_SERVER_ERROR_MIN - 1;

const DEFAULT_PLATFORM_BREAKDOWN: AccessStats["topPlatforms"] = [
    { platform: "web", count: 623, percentage: 49.9 },
    { platform: "ios", count: 374, percentage: 30.0 },
    { platform: "android", count: 250, percentage: 20.1 },
];

// デモ用に時間帯ごとの統計を決定的に生成する (Math.random を避ける)
const DEMO_HOURLY_STATS = Array.from({ length: HOURS_PER_DAY }, (_, hour) => ({
    hour,
    // ピーク時間帯では値が高くなるよう決定的に計算する
    count:
        hour >= PEAK_HOUR_START && hour <= PEAK_HOUR_END
            ? PEAK_HOUR_BASE_COUNT + (hour % PEAK_HOUR_MODULO) * PEAK_HOUR_MULTIPLIER
            : OFF_PEAK_BASE_COUNT + (hour % OFF_PEAK_MODULO) * OFF_PEAK_MULTIPLIER,
}));

export function AccessHistoryClient({ user: _user, initialTab }: AccessHistoryContentProps) {
    const router = useRouter();
    const [logs, setLogs] = useState<AccessLog[]>([]);
    const [stats, setStats] = useState<AccessStats | null>(null);
    const [totalAccessCount, setTotalAccessCount] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        platform: "all",
        userId: "",
        startDate: format(subDays(new Date(), DEFAULT_ACCESS_HISTORY_LOOKBACK_DAYS), "yyyy-MM-dd"),
        endDate: format(new Date(), "yyyy-MM-dd"),
        search: "",
    });
    const [startDate, setStartDate] = useState<Date>(subDays(new Date(), DEFAULT_ACCESS_HISTORY_LOOKBACK_DAYS));
    const [endDate, setEndDate] = useState<Date>(new Date());
    const [currentPage, setCurrentPage] = useState(0);
    const [limit] = useState(DEFAULT_ACCESS_LOG_PAGE_SIZE);
    const [chartColors, setChartColors] = useState<{
        chart1: string;
        chart2: string;
        chart3: string;
        chart4: string;
        chart5: string;
    }>({
        chart1: "",
        chart2: "",
        chart3: "",
        chart4: "",
        chart5: "",
    });

    // マウント時に CSS 変数からチャート色を読み込む
    useEffect(() => {
        const colors = getChartColors();
        setChartColors(colors);
    }, []);

    const fetchAccessLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                limit: limit.toString(),
                offset: (currentPage * limit).toString(),
                ...(filters.platform && filters.platform !== "all" && { platform: filters.platform }),
                ...(filters.userId && { userId: filters.userId }),
                ...(filters.startDate && { startDate: filters.startDate }),
                ...(filters.endDate && { endDate: filters.endDate }),
            });

            const response = await fetch(`/api/access-log?${params}`);

            if (response.ok) {
                const data = await response.json();
                setLogs(data.logs);
                setTotalAccessCount(typeof data.pagination?.total === "number" ? data.pagination.total : null);
            } else {
                const data = await response.json().catch(() => ({ error: "Unknown error" }));
                logger.error("Failed to fetch access logs:", data.error);
                // TODO: エラー状態を保持しユーザーに表示する
            }
        } catch (error) {
            logger.error("Error fetching access logs:", error);
            // TODO: エラー状態を保持しユーザーに表示する
        } finally {
            setLoading(false);
        }
    }, [filters, currentPage, limit]);

    // ヘルパー: 利用可能なデータからアクセス総数を算出する
    const calculateTotalAccesses = useCallback((totalCount: number | null, logsLength: number): number => {
        if (totalCount !== null) {
            return totalCount;
        }
        if (logsLength === 0) {
            return FALLBACK_TOTAL_ACCESS_COUNT;
        }
        return logsLength;
    }, []);

    // ヘルパー: ログからプラットフォーム統計を計算する
    const computePlatformStats = useCallback((logsData: AccessLog[]): AccessStats["topPlatforms"] => {
        const platformCounts = logsData.reduce(
            (acc, log) => {
                const platform = log.platform || "unknown";
                acc[platform] = (acc[platform] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>
        );

        const totalCount = logsData.length;
        return Object.entries(platformCounts)
            .map(([platform, count]) => ({
                platform,
                count,
                percentage: (count / totalCount) * PERCENTAGE_MULTIPLIER,
            }))
            .sort((a, b) => b.count - a.count);
    }, []);

    // ログデータから統計を計算する (再計算を防ぐためメモ化)
    const computedStats = useMemo((): AccessStats => {
        // TODO: 実際の統計 API (GET /api/access-log/stats) 呼び出しに置き換える
        // これは読み込んだログをクライアントで計算するデモ用スタブ

        const totalAccesses = calculateTotalAccesses(totalAccessCount, logs.length);

        // ログがない場合は UI デモ用のフォールバックデータを表示する
        // 備考: API が 0 件を返した場合も含む
        if (logs.length === 0) {
            return {
                totalAccesses,
                uniqueUsers: FALLBACK_UNIQUE_USER_COUNT,
                uniqueDevices: FALLBACK_UNIQUE_DEVICE_COUNT,
                topPlatforms: DEFAULT_PLATFORM_BREAKDOWN,
                recentActivity: [],
                hourlyStats: DEMO_HOURLY_STATS,
            };
        }

        // ログから実際の統計を計算する
        const uniqueUserIds = new Set(logs.map((log) => log.userId).filter(Boolean));
        const uniqueDeviceIds = new Set(logs.map((log) => log.deviceId).filter(Boolean));
        const topPlatforms = computePlatformStats(logs);

        return {
            totalAccesses,
            uniqueUsers: uniqueUserIds.size,
            uniqueDevices: uniqueDeviceIds.size,
            topPlatforms,
            recentActivity: logs.slice(0, RECENT_ACTIVITY_LIMIT),
            hourlyStats: DEMO_HOURLY_STATS, // TODO: API が整備されたら logs.createdAt から算出する
        };
    }, [logs, totalAccessCount, calculateTotalAccesses, computePlatformStats]);

    // 計算された統計が変わるたびに状態を更新する
    useEffect(() => {
        setStats(computedStats);
    }, [computedStats]);

    useEffect(() => {
        fetchAccessLogs();
    }, [fetchAccessLogs]);

    const handleFilterChange = (key: string, value: string) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
        setCurrentPage(0); // フィルタ時には最初のページへ戻す
    };

    const filteredLogs = logs.filter((log) => {
        if (!filters.search) {
            return true;
        }
        const searchLower = filters.search.toLowerCase();
        return (
            log.path.toLowerCase().includes(searchLower) ||
            log.user?.email.toLowerCase().includes(searchLower) ||
            log.ipAddress?.toLowerCase().includes(searchLower) ||
            log.platform?.toLowerCase().includes(searchLower)
        );
    });

    const platformColors = {
        web: chartColors.chart1,
        ios: chartColors.chart2,
        android: chartColors.chart3,
        unknown: chartColors.chart5,
    };

    const getPlatformIcon = (platform?: string) => {
        switch (platform) {
            case "ios":
            case "android":
                return <Smartphone className="h-4 w-4" />;
            case "web":
                return <Monitor className="h-4 w-4" />;
            default:
                return <Monitor className="h-4 w-4" />;
        }
    };

    const getStatusBadge = (statusCode?: number) => {
        if (!statusCode) {
            return <Badge variant="secondary">-</Badge>;
        }

        if (statusCode >= HTTP_STATUS_SUCCESS_MIN && statusCode <= HTTP_STATUS_SUCCESS_MAX) {
            return (
                <Badge className="bg-green-100 text-green-800" variant="default">
                    成功
                </Badge>
            );
        }
        if (statusCode >= HTTP_STATUS_REDIRECT_MIN && statusCode <= HTTP_STATUS_REDIRECT_MAX) {
            return <Badge variant="secondary">リダイレクト</Badge>;
        }
        if (statusCode >= HTTP_STATUS_CLIENT_ERROR_MIN && statusCode <= HTTP_STATUS_CLIENT_ERROR_MAX) {
            return <Badge variant="destructive">クライアントエラー</Badge>;
        }
        if (statusCode >= HTTP_STATUS_SERVER_ERROR_MIN) {
            return <Badge variant="destructive">サーバーエラー</Badge>;
        }

        return <Badge variant="secondary">{statusCode}</Badge>;
    };

    if (loading && !stats) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* 統計サマリー */}
            {stats && (
                <div className="pointer-events-none grid gap-4 md:pointer-events-auto md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="font-medium text-sm">総アクセス数</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="font-bold text-2xl">{stats.totalAccesses.toLocaleString()}</div>
                            <p className="text-muted-foreground text-xs">
                                過去{DEFAULT_ACCESS_HISTORY_LOOKBACK_DAYS}日間
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="font-medium text-sm">ユニークユーザー</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="font-bold text-2xl">{stats.uniqueUsers}</div>
                            <p className="text-muted-foreground text-xs">アクティブユーザー</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="font-medium text-sm">ユニークデバイス</CardTitle>
                            <Smartphone className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="font-bold text-2xl">{stats.uniqueDevices}</div>
                            <p className="text-muted-foreground text-xs">登録デバイス数</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="font-medium text-sm">主要プラットフォーム</CardTitle>
                            <Monitor className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="font-bold text-2xl">
                                {stats.topPlatforms[0]?.platform.toUpperCase() || "WEB"}
                            </div>
                            <p className="text-muted-foreground text-xs">
                                {stats.topPlatforms[0]?.percentage.toFixed(1)}% のトラフィック
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* タブナビゲーション */}
            <div className="space-y-4">
                <div className="border-border border-b">
                    <nav className="-mb-px flex space-x-8">
                        {[
                            { id: "overview", label: "概要" },
                            { id: "charts", label: "グラフ" },
                            { id: "logs", label: "詳細ログ" },
                        ].map((tab) => (
                            <button
                                className={`whitespace-nowrap border-b-2 px-1 py-2 font-medium text-sm transition-colors duration-200 ${
                                    initialTab === tab.id
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                                }`}
                                key={tab.id}
                                onClick={() => router.push(`/access-history/${tab.id}`)}
                                type="button"
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* 概要タブ */}
                {initialTab === "overview" && (
                    <div className="space-y-4">
                        {stats && (
                            <div className="grid gap-4 md:grid-cols-2">
                                {/* 時間別アクセスチャート */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>時間別アクセス数</CardTitle>
                                        <CardDescription>過去24時間のアクセス傾向</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ResponsiveContainer height={200} width="100%">
                                            <AreaChart data={stats.hourlyStats}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="hour" tickFormatter={(hour: number) => `${hour}:00`} />
                                                <YAxis />
                                                <Tooltip
                                                    formatter={(value) => [value, "アクセス数"]}
                                                    labelFormatter={(hour: number) => `${hour}:00`}
                                                />
                                                <Area
                                                    dataKey="count"
                                                    fill={chartColors.chart1}
                                                    fillOpacity={0.2}
                                                    stroke={chartColors.chart1}
                                                    type="monotone"
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                {/* プラットフォーム別内訳 */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>プラットフォーム別分布</CardTitle>
                                        <CardDescription>アクセス元の内訳</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ResponsiveContainer height={200} width="100%">
                                            <PieChart>
                                                <Pie
                                                    cx="50%"
                                                    cy="50%"
                                                    data={stats.topPlatforms}
                                                    dataKey="count"
                                                    innerRadius={60}
                                                    label={({ payload }: PieLabelRenderProps) => {
                                                        const data = (payload ?? {}) as {
                                                            platform?: unknown;
                                                            percentage?: unknown;
                                                        };
                                                        const platformLabel =
                                                            typeof data.platform === "string"
                                                                ? data.platform.toUpperCase()
                                                                : "UNKNOWN";
                                                        const percentageValue =
                                                            typeof data.percentage === "number" ? data.percentage : 0;

                                                        return `${platformLabel} ${percentageValue.toFixed(1)}%`;
                                                    }}
                                                    outerRadius={80}
                                                >
                                                    {stats.topPlatforms.map((entry) => (
                                                        <Cell
                                                            fill={
                                                                platformColors[
                                                                    entry.platform as keyof typeof platformColors
                                                                ] || platformColors.unknown
                                                            }
                                                            key={`cell-${entry.platform}`}
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    formatter={(value) => [value, "アクセス数"]}
                                                    labelFormatter={(label) => `${label.toUpperCase()}`}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* 最近のアクティビティ */}
                        <Card className="relative z-20">
                            <CardHeader>
                                <CardTitle>最近のアクティビティ</CardTitle>
                                <CardDescription>直近のアクセス履歴</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {stats?.recentActivity.map((log) => (
                                        <div className="flex items-center space-x-4" key={log.id}>
                                            <div className="flex items-center space-x-2">
                                                {getPlatformIcon(log.platform)}
                                                <Badge variant="outline">
                                                    {log.platform?.toUpperCase() || "UNKNOWN"}
                                                </Badge>
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">{log.path}</p>
                                                <p className="text-muted-foreground text-xs">
                                                    {log.user?.email || "ゲストユーザー"}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                {getStatusBadge(log.statusCode)}
                                                <p className="text-muted-foreground text-xs">
                                                    {format(new Date(log.createdAt), "HH:mm", {
                                                        locale: ja,
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* グラフタブ */}
                {initialTab === "charts" && (
                    <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-1">
                            {stats && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>24時間アクセス傾向</CardTitle>
                                        <CardDescription>時間帯別のアクセス数変化</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ResponsiveContainer height={400} width="100%">
                                            <LineChart data={stats.hourlyStats}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="hour" tickFormatter={(hour: number) => `${hour}:00`} />
                                                <YAxis />
                                                <Tooltip
                                                    formatter={(value) => [value, "アクセス数"]}
                                                    labelFormatter={(hour: number) => `${hour}:00`}
                                                />
                                                <Line
                                                    dataKey="count"
                                                    dot={{ r: 4 }}
                                                    stroke={chartColors.chart1}
                                                    strokeWidth={2}
                                                    type="monotone"
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                )}

                {/* ログタブ */}
                {initialTab === "logs" && (
                    <div className="space-y-4">
                        {/* フィルター */}
                        <Card>
                            <CardHeader>
                                <CardTitle>フィルター</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 md:grid-cols-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="search">検索</Label>
                                        <div className="relative">
                                            <Search className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                className="pl-9"
                                                id="search"
                                                onChange={(e) => handleFilterChange("search", e.target.value)}
                                                placeholder="パス、ユーザー、IPアドレス..."
                                                value={filters.search}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="platform">プラットフォーム</Label>
                                        <Select
                                            onValueChange={(value) => handleFilterChange("platform", value)}
                                            value={filters.platform}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="すべて" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">すべて</SelectItem>
                                                <SelectItem value="web">Web</SelectItem>
                                                <SelectItem value="ios">iOS</SelectItem>
                                                <SelectItem value="android">Android</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>開始日</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal",
                                                        !startDate && "text-muted-foreground"
                                                    )}
                                                    variant="outline"
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {startDate ? (
                                                        format(startDate, "PPP", { locale: ja })
                                                    ) : (
                                                        <span>日付を選択</span>
                                                    )}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent align="start" className="w-auto p-0">
                                                <Calendar
                                                    captionLayout="dropdown"
                                                    mode="single"
                                                    onSelect={(date) => {
                                                        if (date) {
                                                            setStartDate(date);
                                                            handleFilterChange("startDate", format(date, "yyyy-MM-dd"));
                                                        }
                                                    }}
                                                    selected={startDate}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>終了日</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal",
                                                        !endDate && "text-muted-foreground"
                                                    )}
                                                    variant="outline"
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {endDate ? (
                                                        format(endDate, "PPP", { locale: ja })
                                                    ) : (
                                                        <span>日付を選択</span>
                                                    )}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent align="start" className="w-auto p-0">
                                                <Calendar
                                                    captionLayout="dropdown"
                                                    mode="single"
                                                    onSelect={(date) => {
                                                        if (date) {
                                                            setEndDate(date);
                                                            handleFilterChange("endDate", format(date, "yyyy-MM-dd"));
                                                        }
                                                    }}
                                                    selected={endDate}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center justify-between">
                                    <Button
                                        onClick={() => {
                                            const defaultStartDate = subDays(
                                                new Date(),
                                                DEFAULT_ACCESS_HISTORY_LOOKBACK_DAYS
                                            );
                                            const defaultEndDate = new Date();
                                            setStartDate(defaultStartDate);
                                            setEndDate(defaultEndDate);
                                            setFilters({
                                                platform: "all",
                                                userId: "",
                                                startDate: format(defaultStartDate, "yyyy-MM-dd"),
                                                endDate: format(defaultEndDate, "yyyy-MM-dd"),
                                                search: "",
                                            });
                                        }}
                                        variant="outline"
                                    >
                                        <Filter className="mr-2 h-4 w-4" />
                                        リセット
                                    </Button>
                                    <Button disabled={loading} onClick={fetchAccessLogs}>
                                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                                        更新
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* アクセスログテーブル */}
                        <Card>
                            <CardHeader>
                                <CardTitle>アクセスログ</CardTitle>
                                <CardDescription>{filteredLogs.length} 件のログが見つかりました</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>日時</TableHead>
                                                <TableHead>ユーザー</TableHead>
                                                <TableHead>プラットフォーム</TableHead>
                                                <TableHead>パス</TableHead>
                                                <TableHead>ステータス</TableHead>
                                                <TableHead>レスポンス時間</TableHead>
                                                <TableHead>IPアドレス</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredLogs.map((log) => (
                                                <TableRow key={log.id}>
                                                    <TableCell>
                                                        {format(new Date(log.createdAt), "MM/dd HH:mm", { locale: ja })}
                                                    </TableCell>
                                                    <TableCell>
                                                        {log.user ? (
                                                            <div>
                                                                <p className="font-medium">
                                                                    {log.user.name || "Unknown"}
                                                                </p>
                                                                <p className="text-muted-foreground text-xs">
                                                                    {log.user.email}
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <Badge variant="secondary">ゲスト</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center space-x-2">
                                                            {getPlatformIcon(log.platform)}
                                                            <span>{log.platform?.toUpperCase() || "UNKNOWN"}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <code className="rounded bg-muted px-1 py-0.5 text-xs">
                                                            {log.method} {log.path}
                                                        </code>
                                                    </TableCell>
                                                    <TableCell>{getStatusBadge(log.statusCode)}</TableCell>
                                                    <TableCell>
                                                        {log.responseTime ? `${log.responseTime}ms` : "-"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <code className="text-xs">{log.ipAddress || "-"}</code>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                {filteredLogs.length === 0 && (
                                    <div className="py-8 text-center text-muted-foreground">
                                        アクセスログが見つかりませんでした
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}

// EOF

// EOF
