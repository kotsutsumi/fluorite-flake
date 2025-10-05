'use client';

import { useState } from 'react';
import { UserManagement } from './UserManagement';
import { NBCMemberManagement } from './NBCMemberManagement';
import { SponsorContentManagement } from './SponsorContentManagement';
import { AdminStats } from './AdminStats';

interface User {
    id: string;
    email: string;
    name?: string;
    role: string;
}

interface AdminDashboardProps {
    user: User;
}

type TabType = 'overview' | 'users' | 'nbc-members' | 'sponsors' | 'content';

export function AdminDashboard({ user }: AdminDashboardProps) {
    const [activeTab, setActiveTab] = useState<TabType>('overview');

    const tabs = [
        { id: 'overview' as const, label: '概要', icon: '📊' },
        { id: 'users' as const, label: 'ユーザー管理', icon: '👥' },
        { id: 'nbc-members' as const, label: 'NBC会員', icon: '⭐' },
        { id: 'sponsors' as const, label: 'スポンサー', icon: '🏢' },
        { id: 'content' as const, label: 'コンテンツ管理', icon: '📺' },
    ];

    const canAccessTab = (tabId: TabType) => {
        if (user.role === 'admin') {
            return true;
        }
        if (user.role === 'org_admin') {
            return ['overview', 'nbc-members', 'sponsors', 'content'].includes(tabId);
        }
        return false;
    };

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <div className="w-64 bg-white shadow-md">
                <div className="p-6">
                    <h1 className="text-xl font-bold text-gray-800">NBC管理画面</h1>
                    <p className="text-sm text-gray-600 mt-1">{user.name || user.email}</p>
                    <p className="text-xs text-gray-500">
                        権限: {user.role === 'admin' ? '管理者' : '組織管理者'}
                    </p>
                </div>

                <nav className="mt-6">
                    {tabs.map((tab) => {
                        const isAccessible = canAccessTab(tab.id);
                        const isActive = activeTab === tab.id;

                        return (
                            <button
                                type="button"
                                key={tab.id}
                                onClick={() => isAccessible && setActiveTab(tab.id)}
                                disabled={!isAccessible}
                                className={`w-full flex items-center px-6 py-3 text-left transition-colors ${
                                    isActive
                                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                                        : isAccessible
                                          ? 'text-gray-700 hover:bg-gray-50'
                                          : 'text-gray-400 cursor-not-allowed'
                                }`}
                            >
                                <span className="mr-3">{tab.icon}</span>
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>

                <div className="absolute bottom-6 left-6">
                    <button type="button" className="text-red-600 hover:text-red-800 text-sm">
                        ログアウト
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                <div className="p-8">
                    {activeTab === 'overview' && <AdminStats />}
                    {activeTab === 'users' && <UserManagement />}
                    {activeTab === 'nbc-members' && <NBCMemberManagement />}
                    {activeTab === 'sponsors' && <SponsorContentManagement />}
                    {activeTab === 'content' && (
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-xl font-semibold mb-4">コンテンツ管理</h2>
                            <p className="text-gray-600">
                                動画コンテンツと施設情報の管理機能を実装予定
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
