'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Filter, RefreshCw, Search, TrendingUp, Users, Smartphone, Monitor } from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area,
} from 'recharts';
import { format, subDays } from 'date-fns';
import { ja } from 'date-fns/locale';

interface AccessLog {
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
}

interface AccessStats {
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
}

interface AccessHistoryContentProps {
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
    };
    initialTab: string;
}

const PLATFORM_COLORS = {
    web: '#3b82f6',
    ios: '#ef4444',
    android: '#22c55e',
    unknown: '#6b7280',
} as const;

export function AccessHistoryContent({ user: _user, initialTab }: AccessHistoryContentProps) {
    const router = useRouter();
    const [logs, setLogs] = useState<AccessLog[]>([]);
    const [stats, setStats] = useState<AccessStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        platform: 'all',
        userId: '',
        startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
        search: '',
    });
    const [currentPage, setCurrentPage] = useState(0);
    const [limit] = useState(50);

    const fetchAccessLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                limit: limit.toString(),
                offset: (currentPage * limit).toString(),
                ...(filters.platform &&
                    filters.platform !== 'all' && { platform: filters.platform }),
                ...(filters.userId && { userId: filters.userId }),
                ...(filters.startDate && { startDate: filters.startDate }),
                ...(filters.endDate && { endDate: filters.endDate }),
            });

            const response = await fetch(`/api/access-log?${params}`);
            const data = await response.json();

            if (response.ok) {
                setLogs(data.logs);
            } else {
                console.error('Failed to fetch access logs:', data.error);
            }
        } catch (error) {
            console.error('Error fetching access logs:', error);
        } finally {
            setLoading(false);
        }
    }, [filters, currentPage, limit]);

    const fetchStats = useCallback(async () => {
        try {
            // For demo purposes, we'll generate some mock stats
            // In a real implementation, you'd call a stats API endpoint
            const mockStats: AccessStats = {
                totalAccesses: logs.length || 1247,
                uniqueUsers: 45,
                uniqueDevices: 78,
                topPlatforms: [
                    { platform: 'web', count: 623, percentage: 49.9 },
                    { platform: 'ios', count: 374, percentage: 30.0 },
                    { platform: 'android', count: 250, percentage: 20.1 },
                ],
                recentActivity: logs.slice(0, 5),
                hourlyStats: Array.from({ length: 24 }, (_, i) => ({
                    hour: i,
                    count: Math.floor(Math.random() * 50) + 5,
                })),
            };
            setStats(mockStats);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    }, [logs]);

    useEffect(() => {
        fetchAccessLogs();
    }, [fetchAccessLogs]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const handleFilterChange = (key: string, value: string) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
        setCurrentPage(0); // Reset to first page when filtering
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

    const getPlatformIcon = (platform?: string) => {
        switch (platform) {
            case 'ios':
            case 'android':
                return <Smartphone className="h-4 w-4" />;
            case 'web':
                return <Monitor className="h-4 w-4" />;
            default:
                return <Monitor className="h-4 w-4" />;
        }
    };

    const getStatusBadge = (statusCode?: number) => {
        if (!statusCode) {
            return <Badge variant="secondary">-</Badge>;
        }

        if (statusCode >= 200 && statusCode < 300) {
            return (
                <Badge variant="default" className="bg-green-100 text-green-800">
                    成功
                </Badge>
            );
        } else if (statusCode >= 300 && statusCode < 400) {
            return <Badge variant="secondary">リダイレクト</Badge>;
        } else if (statusCode >= 400 && statusCode < 500) {
            return <Badge variant="destructive">クライアントエラー</Badge>;
        } else if (statusCode >= 500) {
            return <Badge variant="destructive">サーバーエラー</Badge>;
        }

        return <Badge variant="secondary">{statusCode}</Badge>;
    };

    if (loading && !stats) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            {stats && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">総アクセス数</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {stats.totalAccesses.toLocaleString()}
                            </div>
                            <p className="text-xs text-muted-foreground">過去7日間</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">ユニークユーザー</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.uniqueUsers}</div>
                            <p className="text-xs text-muted-foreground">アクティブユーザー</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">ユニークデバイス</CardTitle>
                            <Smartphone className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.uniqueDevices}</div>
                            <p className="text-xs text-muted-foreground">登録デバイス数</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                主要プラットフォーム
                            </CardTitle>
                            <Monitor className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {stats.topPlatforms[0]?.platform.toUpperCase() || 'WEB'}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {stats.topPlatforms[0]?.percentage.toFixed(1)}% のトラフィック
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="space-y-4">
                <div className="border-b border-border">
                    <nav className="-mb-px flex space-x-8">
                        {[
                            { id: 'overview', label: '概要' },
                            { id: 'charts', label: 'グラフ' },
                            { id: 'logs', label: '詳細ログ' },
                        ].map((tab) => (
                            <button
                                type="button"
                                key={tab.id}
                                onClick={() => router.push(`/access-history/${tab.id}`)}
                                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                                    initialTab === tab.id
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Overview Tab */}
                {initialTab === 'overview' && (
                    <div className="space-y-4">
                        {stats && (
                            <div className="grid gap-4 md:grid-cols-2">
                                {/* Hourly Activity Chart */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>時間別アクセス数</CardTitle>
                                        <CardDescription>過去24時間のアクセス傾向</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ResponsiveContainer width="100%" height={200}>
                                            <AreaChart data={stats.hourlyStats}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis
                                                    dataKey="hour"
                                                    tickFormatter={(hour) => `${hour}:00`}
                                                />
                                                <YAxis />
                                                <Tooltip
                                                    labelFormatter={(hour) => `${hour}:00`}
                                                    formatter={(value) => [value, 'アクセス数']}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="count"
                                                    stroke="#3b82f6"
                                                    fill="#3b82f6"
                                                    fillOpacity={0.2}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                {/* Platform Distribution */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>プラットフォーム別分布</CardTitle>
                                        <CardDescription>アクセス元の内訳</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ResponsiveContainer width="100%" height={200}>
                                            <PieChart>
                                                <Pie
                                                    data={stats.topPlatforms}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    dataKey="count"
                                                    label={({ platform, percentage }) =>
                                                        `${platform.toUpperCase()} ${percentage.toFixed(1)}%`
                                                    }
                                                >
                                                    {stats.topPlatforms.map((entry) => (
                                                        <Cell
                                                            key={`cell-${entry.platform}`}
                                                            fill={
                                                                PLATFORM_COLORS[
                                                                    entry.platform as keyof typeof PLATFORM_COLORS
                                                                ] || PLATFORM_COLORS.unknown
                                                            }
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    formatter={(value) => [value, 'アクセス数']}
                                                    labelFormatter={(label) =>
                                                        `${label.toUpperCase()}`
                                                    }
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Recent Activity */}
                        <Card>
                            <CardHeader>
                                <CardTitle>最近のアクティビティ</CardTitle>
                                <CardDescription>直近のアクセス履歴</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {stats?.recentActivity.map((log) => (
                                        <div key={log.id} className="flex items-center space-x-4">
                                            <div className="flex items-center space-x-2">
                                                {getPlatformIcon(log.platform)}
                                                <Badge variant="outline">
                                                    {log.platform?.toUpperCase() || 'UNKNOWN'}
                                                </Badge>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">{log.path}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {log.user?.email || 'ゲストユーザー'}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                {getStatusBadge(log.statusCode)}
                                                <p className="text-xs text-muted-foreground">
                                                    {format(new Date(log.createdAt), 'HH:mm', {
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

                {/* Charts Tab */}
                {initialTab === 'charts' && (
                    <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-1">
                            {stats && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>24時間アクセス傾向</CardTitle>
                                        <CardDescription>時間帯別のアクセス数変化</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ResponsiveContainer width="100%" height={400}>
                                            <LineChart data={stats.hourlyStats}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis
                                                    dataKey="hour"
                                                    tickFormatter={(hour) => `${hour}:00`}
                                                />
                                                <YAxis />
                                                <Tooltip
                                                    labelFormatter={(hour) => `${hour}:00`}
                                                    formatter={(value) => [value, 'アクセス数']}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="count"
                                                    stroke="#3b82f6"
                                                    strokeWidth={2}
                                                    dot={{ r: 4 }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                )}

                {/* Logs Tab */}
                {initialTab === 'logs' && (
                    <div className="space-y-4">
                        {/* Filters */}
                        <Card>
                            <CardHeader>
                                <CardTitle>フィルター</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 md:grid-cols-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="search">検索</Label>
                                        <div className="relative">
                                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="search"
                                                placeholder="パス、ユーザー、IPアドレス..."
                                                value={filters.search}
                                                onChange={(e) =>
                                                    handleFilterChange('search', e.target.value)
                                                }
                                                className="pl-8"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="platform">プラットフォーム</Label>
                                        <Select
                                            value={filters.platform}
                                            onValueChange={(value) =>
                                                handleFilterChange('platform', value)
                                            }
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
                                        <Label htmlFor="startDate">開始日</Label>
                                        <Input
                                            id="startDate"
                                            type="date"
                                            value={filters.startDate}
                                            onChange={(e) =>
                                                handleFilterChange('startDate', e.target.value)
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="endDate">終了日</Label>
                                        <Input
                                            id="endDate"
                                            type="date"
                                            value={filters.endDate}
                                            onChange={(e) =>
                                                handleFilterChange('endDate', e.target.value)
                                            }
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-between items-center mt-4">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setFilters({
                                                platform: 'all',
                                                userId: '',
                                                startDate: format(
                                                    subDays(new Date(), 7),
                                                    'yyyy-MM-dd'
                                                ),
                                                endDate: format(new Date(), 'yyyy-MM-dd'),
                                                search: '',
                                            });
                                        }}
                                    >
                                        <Filter className="h-4 w-4 mr-2" />
                                        リセット
                                    </Button>
                                    <Button onClick={fetchAccessLogs} disabled={loading}>
                                        <RefreshCw
                                            className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
                                        />
                                        更新
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Access Logs Table */}
                        <Card>
                            <CardHeader>
                                <CardTitle>アクセスログ</CardTitle>
                                <CardDescription>
                                    {filteredLogs.length} 件のログが見つかりました
                                </CardDescription>
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
                                                        {format(
                                                            new Date(log.createdAt),
                                                            'MM/dd HH:mm',
                                                            { locale: ja }
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {log.user ? (
                                                            <div>
                                                                <p className="font-medium">
                                                                    {log.user.name || 'Unknown'}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {log.user.email}
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <Badge variant="secondary">
                                                                ゲスト
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center space-x-2">
                                                            {getPlatformIcon(log.platform)}
                                                            <span>
                                                                {log.platform?.toUpperCase() ||
                                                                    'UNKNOWN'}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                                            {log.method} {log.path}
                                                        </code>
                                                    </TableCell>
                                                    <TableCell>
                                                        {getStatusBadge(log.statusCode)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {log.responseTime
                                                            ? `${log.responseTime}ms`
                                                            : '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <code className="text-xs">
                                                            {log.ipAddress || '-'}
                                                        </code>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                {filteredLogs.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
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
