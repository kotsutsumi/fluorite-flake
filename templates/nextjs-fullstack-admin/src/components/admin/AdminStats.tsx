'use client';

import { useState, useEffect, useCallback } from 'react';

interface AdminStatsData {
    totalUsers: number;
    Members: number;
    Sponsors: number;
    totalFacilities: number;
    pendingFacilities: number;
    totalVideoContent: number;
    publishedVideoContent: number;
    recentRegistrations: number;
}

export function AdminStats() {
    const [stats, setStats] = useState<AdminStatsData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        try {
            const response = await fetch('/api/admin/stats');
            if (response.ok) {
                const data = await response.json();
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

    const statCards = [
        {
            title: '総ユーザー数',
            value: stats.totalUsers,
            icon: '👥',
            color: 'bg-blue-500',
        },
        {
            title: '会員',
            value: stats.Members,
            icon: '⭐',
            color: 'bg-green-500',
        },
        {
            title: 'スポンサー',
            value: stats.Sponsors,
            icon: '🏢',
            color: 'bg-purple-500',
        },
        {
            title: '総施設数',
            value: stats.totalFacilities,
            icon: '🏪',
            color: 'bg-orange-500',
        },
        {
            title: '承認待ち施設',
            value: stats.pendingFacilities,
            icon: '⏳',
            color: 'bg-yellow-500',
        },
        {
            title: '総動画コンテンツ',
            value: stats.totalVideoContent,
            icon: '📹',
            color: 'bg-red-500',
        },
        {
            title: '公開中動画',
            value: stats.publishedVideoContent,
            icon: '📺',
            color: 'bg-indigo-500',
        },
        {
            title: '今月の新規登録',
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
                    {statCards.map((card, index) => (
                        <div
                            key={`stat-${card.title}-${index}`}
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
                {/* ユーザー構成 */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">ユーザー構成</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">一般ユーザー</span>
                            <span className="font-medium">
                                {(
                                    stats.totalUsers -
                                    stats.Members -
                                    stats.Sponsors
                                ).toLocaleString()}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">会員</span>
                            <span className="font-medium text-green-600">
                                {stats.Members.toLocaleString()}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">スポンサー</span>
                            <span className="font-medium text-purple-600">
                                {stats.Sponsors.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* コンテンツ状況 */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">コンテンツ状況</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">公開中動画</span>
                            <span className="font-medium text-green-600">
                                {stats.publishedVideoContent.toLocaleString()}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">未公開動画</span>
                            <span className="font-medium text-yellow-600">
                                {(
                                    stats.totalVideoContent - stats.publishedVideoContent
                                ).toLocaleString()}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">承認待ち施設</span>
                            <span className="font-medium text-orange-600">
                                {stats.pendingFacilities.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">管理タスク</h3>
                <div className="space-y-3">
                    {stats.pendingFacilities > 0 && (
                        <div className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-center">
                                <span className="text-yellow-500 mr-3">⚠️</span>
                                <span className="text-yellow-800">
                                    {stats.pendingFacilities}件の施設が承認待ちです
                                </span>
                            </div>
                            <button
                                type="button"
                                className="text-yellow-700 hover:text-yellow-900 font-medium"
                            >
                                確認する →
                            </button>
                        </div>
                    )}
                    {stats.totalVideoContent - stats.publishedVideoContent > 0 && (
                        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center">
                                <span className="text-blue-500 mr-3">📹</span>
                                <span className="text-blue-800">
                                    {stats.totalVideoContent - stats.publishedVideoContent}
                                    件の動画が未公開です
                                </span>
                            </div>
                            <button
                                type="button"
                                className="text-blue-700 hover:text-blue-900 font-medium"
                            >
                                確認する →
                            </button>
                        </div>
                    )}
                    {stats.pendingFacilities === 0 &&
                        stats.totalVideoContent - stats.publishedVideoContent === 0 && (
                            <div className="text-center text-gray-500 py-8">
                                ✅ 現在、対応が必要なタスクはありません
                            </div>
                        )}
                </div>
            </div>
        </div>
    );
}
