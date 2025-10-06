'use client';

import { useState, useEffect, useCallback } from 'react';

interface AdminStatsData {
    totalUsers: number;
    Members: number;
    totalOrganizations: number;
    activeSessions: number;
    deviceCount: number;
    accessLogsLastMonth: number;
    recentRegistrations: number;
}

export function AdminStats() {
    const [stats, setStats] = useState<AdminStatsData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        try {
            const response = await fetch('/api/admin/stats');
            if (response.ok) {
                const data = (await response.json()) as AdminStatsData;
                setStats(data);
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">読み込み中...</div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="text-red-600">統計データの取得に失敗しました</div>
            </div>
        );
    }

    const generalUsers = Math.max(stats.totalUsers - stats.Members, 0);

    const statCards = [
        { title: '総ユーザー数', value: stats.totalUsers, icon: '👥', color: 'bg-blue-500' },
        { title: '会員', value: stats.Members, icon: '⭐', color: 'bg-green-500' },
        {
            title: '組織数',
            value: stats.totalOrganizations,
            icon: '🏢',
            color: 'bg-purple-500',
        },
        {
            title: 'アクティブセッション',
            value: stats.activeSessions,
            icon: '🔐',
            color: 'bg-indigo-500',
        },
        {
            title: 'アクティブデバイス',
            value: stats.deviceCount,
            icon: '📱',
            color: 'bg-orange-500',
        },
        {
            title: '直近30日のアクセス',
            value: stats.accessLogsLastMonth,
            icon: '📊',
            color: 'bg-pink-500',
        },
        {
            title: '直近30日の新規登録',
            value: stats.recentRegistrations,
            icon: '📈',
            color: 'bg-teal-500',
        },
    ];

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">システム概要</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {statCards.map((card) => (
                        <div
                            key={card.title}
                            className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm"
                        >
                            <div className="flex items-center">
                                <div className={`${card.color} rounded-lg p-3 mr-4`}>
                                    <span className="text-white text-xl">{card.icon}</span>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">{card.title}</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {card.value.toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">ユーザー構成</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">一般ユーザー</span>
                            <span className="font-medium">{generalUsers.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">会員</span>
                            <span className="font-medium text-green-600">
                                {stats.Members.toLocaleString()}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">直近30日の新規登録</span>
                            <span className="font-medium text-teal-600">
                                {stats.recentRegistrations.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">システム状況</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">アクティブセッション</span>
                            <span className="font-medium text-indigo-600">
                                {stats.activeSessions.toLocaleString()}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">アクティブデバイス</span>
                            <span className="font-medium text-orange-600">
                                {stats.deviceCount.toLocaleString()}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">直近30日のアクセス</span>
                            <span className="font-medium text-pink-600">
                                {stats.accessLogsLastMonth.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">管理メモ</h3>
                <div className="space-y-3">
                    {stats.recentRegistrations > 0 && (
                        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center">
                                <span className="text-blue-500 mr-3">📝</span>
                                <span className="text-blue-800">
                                    直近30日で {stats.recentRegistrations.toLocaleString()}{' '}
                                    件の新規登録がありました
                                </span>
                            </div>
                        </div>
                    )}
                    {stats.activeSessions === 0 && (
                        <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center">
                                <span className="text-gray-500 mr-3">ℹ️</span>
                                <span className="text-gray-700">
                                    現在アクティブなセッションはありません
                                </span>
                            </div>
                        </div>
                    )}
                    {stats.accessLogsLastMonth === 0 && (
                        <div className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-center">
                                <span className="text-yellow-500 mr-3">⚠️</span>
                                <span className="text-yellow-800">
                                    直近30日のアクセス記録が見つかりません
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// EOF
