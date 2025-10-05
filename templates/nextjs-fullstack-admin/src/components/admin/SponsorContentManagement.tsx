'use client';

import { useState, useEffect, useCallback } from 'react';

interface User {
    id: string;
    email: string;
    name?: string;
    role: string;
}

interface Sponsor {
    id: string;
    email: string;
    name?: string;
    role: string;
    sponsorInfo?: string;
    isActive: boolean;
    createdAt: string;
}

interface Facility {
    id: string;
    name: string;
    category: string;
    address?: string;
    isPublished: boolean;
    isFeatured: boolean;
    owner: {
        id: string;
        name?: string;
        email: string;
    };
    createdAt: string;
}

export function SponsorContentManagement() {
    const [sponsors, setSponsors] = useState<Sponsor[]>([]);
    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'sponsors' | 'facilities'>('sponsors');
    const [_selectedUser, _setSelectedUser] = useState<User | null>(null);
    const [_showSponsorModal, setShowSponsorModal] = useState(false);

    const fetchSponsors = useCallback(async () => {
        try {
            const response = await fetch('/api/admin/nbc-sponsors');
            if (response.ok) {
                const data = await response.json();
                setSponsors(data);
            }
        } catch (error) {
            console.error('Failed to fetch sponsors:', error);
        }
    }, []);

    const fetchFacilities = useCallback(async () => {
        try {
            const response = await fetch('/api/admin/facilities');
            if (response.ok) {
                const data = await response.json();
                setFacilities(data);
            }
        } catch (error) {
            console.error('Failed to fetch facilities:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSponsors();
        fetchFacilities();
    }, [fetchFacilities, fetchSponsors]);

    const _assignSponsorRole = async (userId: string, sponsorInfo: string) => {
        try {
            const response = await fetch('/api/admin/assign-sponsor', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    role: 'nbc_sponsor',
                    sponsorInfo,
                }),
            });

            if (response.ok) {
                fetchSponsors();
                alert('スポンサー権限を割り当てました');
            } else {
                const data = await response.json();
                alert(data.message || 'エラーが発生しました');
            }
        } catch (_error) {
            alert('ネットワークエラーが発生しました');
        }
    };

    const toggleFacilityStatus = async (facilityId: string, isPublished: boolean) => {
        const action = isPublished ? '非公開' : '公開';
        if (!confirm(`この施設を${action}にしますか？`)) {
            return;
        }

        try {
            const response = await fetch('/api/admin/toggle-facility', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    facilityId,
                    isPublished: !isPublished,
                }),
            });

            if (response.ok) {
                fetchFacilities();
                alert(`施設を${action}にしました`);
            } else {
                const data = await response.json();
                alert(data.message || 'エラーが発生しました');
            }
        } catch (_error) {
            alert('ネットワークエラーが発生しました');
        }
    };

    const toggleFeatured = async (facilityId: string, isFeatured: boolean) => {
        try {
            const response = await fetch('/api/admin/toggle-featured', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    facilityId,
                    isFeatured: !isFeatured,
                }),
            });

            if (response.ok) {
                fetchFacilities();
                alert(`注目施設の設定を変更しました`);
            } else {
                const data = await response.json();
                alert(data.message || 'エラーが発生しました');
            }
        } catch (_error) {
            alert('ネットワークエラーが発生しました');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">読み込み中...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-800">
                        スポンサー・コンテンツ管理
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                        NBCスポンサーの管理と施設情報の承認・管理
                    </p>
                </div>

                {/* タブナビゲーション */}
                <div className="border-b border-gray-200">
                    <nav className="flex">
                        <button
                            type="button"
                            onClick={() => setActiveTab('sponsors')}
                            className={`px-6 py-3 text-sm font-medium border-b-2 ${
                                activeTab === 'sponsors'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            NBCスポンサー ({sponsors.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('facilities')}
                            className={`px-6 py-3 text-sm font-medium border-b-2 ${
                                activeTab === 'facilities'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            施設情報 ({facilities.length})
                        </button>
                    </nav>
                </div>

                <div className="p-6">
                    {activeTab === 'sponsors' && (
                        <div>
                            <div className="mb-4">
                                <button
                                    type="button"
                                    onClick={() => setShowSponsorModal(true)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    新規スポンサー追加
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                スポンサー
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                スポンサー情報
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                ステータス
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                登録日
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                操作
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {sponsors.map((sponsor) => (
                                            <tr key={sponsor.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {sponsor.name || sponsor.email}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {sponsor.email}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {sponsor.sponsorInfo || '未設定'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span
                                                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                            sponsor.isActive
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-red-100 text-red-800'
                                                        }`}
                                                    >
                                                        {sponsor.isActive ? '有効' : '無効'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {new Date(sponsor.createdAt).toLocaleDateString(
                                                        'ja-JP'
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <button
                                                        type="button"
                                                        className="text-blue-600 hover:text-blue-900 mr-3"
                                                    >
                                                        編集
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        無効化
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {sponsors.length === 0 && (
                                    <div className="text-center text-gray-500 py-8">
                                        NBCスポンサーがいません
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'facilities' && (
                        <div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                施設名
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                カテゴリー
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                所有者
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                ステータス
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                注目施設
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                操作
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {facilities.map((facility) => (
                                            <tr key={facility.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {facility.name}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {facility.address}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {facility.category}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {facility.owner.name || facility.owner.email}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span
                                                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                            facility.isPublished
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-yellow-100 text-yellow-800'
                                                        }`}
                                                    >
                                                        {facility.isPublished
                                                            ? '公開中'
                                                            : '承認待ち'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            toggleFeatured(
                                                                facility.id,
                                                                facility.isFeatured
                                                            )
                                                        }
                                                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                            facility.isFeatured
                                                                ? 'bg-purple-100 text-purple-800'
                                                                : 'bg-gray-100 text-gray-800'
                                                        }`}
                                                    >
                                                        {facility.isFeatured
                                                            ? '注目施設'
                                                            : '通常施設'}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            toggleFacilityStatus(
                                                                facility.id,
                                                                facility.isPublished
                                                            )
                                                        }
                                                        className={`mr-3 ${
                                                            facility.isPublished
                                                                ? 'text-red-600 hover:text-red-900'
                                                                : 'text-green-600 hover:text-green-900'
                                                        }`}
                                                    >
                                                        {facility.isPublished
                                                            ? '非公開'
                                                            : '承認・公開'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="text-blue-600 hover:text-blue-900"
                                                    >
                                                        詳細
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {facilities.length === 0 && (
                                    <div className="text-center text-gray-500 py-8">
                                        施設情報がありません
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
