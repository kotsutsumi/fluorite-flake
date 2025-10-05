'use client';

import { useState, useEffect, useCallback } from 'react';

interface User {
    id: string;
    email: string;
    name?: string;
    role: string;
    nbcMemberId?: string;
    isActive: boolean;
    createdAt: string;
}

export function UserManagement() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [newRole, setNewRole] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showRoleModal, setShowRoleModal] = useState(false);

    const fetchUsers = useCallback(async () => {
        try {
            const response = await fetch('/api/admin/users');
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const updateUserRole = async () => {
        if (!selectedUser || !newRole) {
            return;
        }

        try {
            const response = await fetch('/api/admin/update-user-role', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: selectedUser.id,
                    role: newRole,
                }),
            });

            if (response.ok) {
                setShowRoleModal(false);
                setSelectedUser(null);
                setNewRole('');
                fetchUsers();
                alert('ユーザーロールを正常に更新しました');
            } else {
                const data = await response.json();
                alert(data.message || 'エラーが発生しました');
            }
        } catch (_error) {
            alert('ネットワークエラーが発生しました');
        }
    };

    const toggleUserStatus = async (userId: string, isActive: boolean) => {
        const action = isActive ? '無効化' : '有効化';
        if (!confirm(`このユーザーを${action}しますか？`)) {
            return;
        }

        try {
            const response = await fetch(
                `/api/admin/${isActive ? 'deactivate' : 'reactivate'}-user`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ userId }),
                }
            );

            if (response.ok) {
                fetchUsers();
                alert(`ユーザーを${action}しました`);
            } else {
                const data = await response.json();
                alert(data.message || 'エラーが発生しました');
            }
        } catch (_error) {
            alert('ネットワークエラーが発生しました');
        }
    };

    const getRoleLabel = (role: string) => {
        const labels: Record<string, string> = {
            admin: '管理者',
            org_admin: '組織管理者',
            user: '一般ユーザー',
            nbc_member: 'NBC会員',
            nbc_sponsor: 'NBCスポンサー',
        };
        return labels[role] || role;
    };

    const getRoleBadgeColor = (role: string) => {
        const colors: Record<string, string> = {
            admin: 'bg-red-100 text-red-800',
            org_admin: 'bg-orange-100 text-orange-800',
            user: 'bg-gray-100 text-gray-800',
            nbc_member: 'bg-green-100 text-green-800',
            nbc_sponsor: 'bg-blue-100 text-blue-800',
        };
        return colors[role] || 'bg-gray-100 text-gray-800';
    };

    const filteredUsers = users.filter(
        (user) =>
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                    <h2 className="text-xl font-semibold text-gray-800">ユーザー管理</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        全ユーザーの管理、ロール変更、アカウント状態の管理
                    </p>
                </div>

                <div className="p-6">
                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder="ユーザーを検索..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        ユーザー
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        ロール
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        NBC会員ID
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
                                {filteredUsers.map((user) => (
                                    <tr
                                        key={user.id}
                                        className={!user.isActive ? 'bg-gray-50' : ''}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {user.name || 'なし'}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {user.email}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}
                                            >
                                                {getRoleLabel(user.role)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {user.nbcMemberId || '未設定'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    user.isActive
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-100 text-red-800'
                                                }`}
                                            >
                                                {user.isActive ? '有効' : '無効'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {new Date(user.createdAt).toLocaleDateString('ja-JP')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex space-x-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setNewRole(user.role);
                                                        setShowRoleModal(true);
                                                    }}
                                                    className="text-blue-600 hover:text-blue-900"
                                                >
                                                    ロール変更
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        toggleUserStatus(user.id, user.isActive)
                                                    }
                                                    className={
                                                        user.isActive
                                                            ? 'text-red-600 hover:text-red-900'
                                                            : 'text-green-600 hover:text-green-900'
                                                    }
                                                >
                                                    {user.isActive ? '無効化' : '有効化'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredUsers.length === 0 && (
                            <div className="text-center text-gray-500 py-8">
                                該当するユーザーがいません
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ロール変更モーダル */}
            {showRoleModal && selectedUser && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                            ユーザーロール変更
                        </h3>
                        <div className="mb-4">
                            <div className="text-sm text-gray-600 mb-2">対象ユーザー:</div>
                            <div className="font-medium">
                                {selectedUser.name || selectedUser.email}
                            </div>
                            <div className="text-sm text-gray-500">{selectedUser.email}</div>
                        </div>
                        <div className="mb-4">
                            <label
                                htmlFor="role"
                                className="block text-sm font-medium text-gray-700 mb-2"
                            >
                                新しいロール
                            </label>
                            <select
                                id="role"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                value={newRole}
                                onChange={(e) => setNewRole(e.target.value)}
                            >
                                <option value="user">一般ユーザー</option>
                                <option value="nbc_member">NBC会員</option>
                                <option value="nbc_sponsor">NBCスポンサー</option>
                                <option value="org_admin">組織管理者</option>
                                <option value="admin">管理者</option>
                            </select>
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowRoleModal(false);
                                    setSelectedUser(null);
                                    setNewRole('');
                                }}
                                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                            >
                                キャンセル
                            </button>
                            <button
                                type="button"
                                onClick={updateUserRole}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                更新
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
