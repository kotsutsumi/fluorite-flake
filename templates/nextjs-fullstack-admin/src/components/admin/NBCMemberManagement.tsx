'use client';

import { useState, useEffect, useCallback } from 'react';

interface User {
    id: string;
    email: string;
    name?: string;
    role: string;
    nbcMemberId?: string;
    memberSince?: string;
    isActive: boolean;
    createdAt: string;
}

export function NBCMemberManagement() {
    const [users, setUsers] = useState<User[]>([]);
    const [nbcMembers, setNbcMembers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [newMemberId, setNewMemberId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showAssignModal, setShowAssignModal] = useState(false);

    const fetchUsers = useCallback(async () => {
        try {
            const response = await fetch('/api/admin/users');
            if (response.ok) {
                const data = await response.json();
                setUsers(data.filter((user: User) => !['admin', 'org_admin'].includes(user.role)));
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
    }, []);

    const fetchNBCMembers = useCallback(async () => {
        try {
            const response = await fetch('/api/admin/nbc-members');
            if (response.ok) {
                const data = await response.json();
                setNbcMembers(data);
            }
        } catch (error) {
            console.error('Failed to fetch NBC members:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
        fetchNBCMembers();
    }, [fetchNBCMembers, fetchUsers]);

    const assignNBCMember = async () => {
        if (!selectedUser || !newMemberId.trim()) {
            return;
        }

        try {
            const response = await fetch('/api/admin/assign-nbc-member', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: selectedUser.id,
                    nbcMemberId: newMemberId.trim(),
                }),
            });

            if (response.ok) {
                setShowAssignModal(false);
                setSelectedUser(null);
                setNewMemberId('');
                fetchUsers();
                fetchNBCMembers();
                alert('NBC会員IDを正常に割り当てました');
            } else {
                const data = await response.json();
                alert(data.message || 'エラーが発生しました');
            }
        } catch (_error) {
            alert('ネットワークエラーが発生しました');
        }
    };

    const removeNBCMember = async (userId: string) => {
        if (!confirm('この会員のNBC会員資格を取り消しますか？')) {
            return;
        }

        try {
            const response = await fetch('/api/admin/remove-nbc-member', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId }),
            });

            if (response.ok) {
                fetchUsers();
                fetchNBCMembers();
                alert('NBC会員資格を取り消しました');
            } else {
                const data = await response.json();
                alert(data.message || 'エラーが発生しました');
            }
        } catch (_error) {
            alert('ネットワークエラーが発生しました');
        }
    };

    const filteredUsers = users.filter(
        (user) =>
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredNBCMembers = nbcMembers.filter(
        (member) =>
            member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.nbcMemberId?.toLowerCase().includes(searchTerm.toLowerCase())
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
                    <h2 className="text-xl font-semibold text-gray-800">NBC会員管理</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        一般ユーザーにNBC会員IDを割り当てて、NBC会員に昇格させることができます
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

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* 一般ユーザー一覧 */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                一般ユーザー ({filteredUsers.length})
                            </h3>
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {filteredUsers.map((user) => (
                                    <div
                                        key={user.id}
                                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                                    >
                                        <div>
                                            <div className="font-medium text-gray-900">
                                                {user.name || user.email}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {user.email}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                登録:{' '}
                                                {new Date(user.createdAt).toLocaleDateString(
                                                    'ja-JP'
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedUser(user);
                                                setShowAssignModal(true);
                                            }}
                                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                        >
                                            NBC会員に昇格
                                        </button>
                                    </div>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <div className="text-center text-gray-500 py-8">
                                        該当するユーザーがいません
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* NBC会員一覧 */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                NBC会員 ({filteredNBCMembers.length})
                            </h3>
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {filteredNBCMembers.map((member) => (
                                    <div
                                        key={member.id}
                                        className="flex items-center justify-between p-3 border border-green-200 rounded-lg bg-green-50"
                                    >
                                        <div>
                                            <div className="font-medium text-gray-900">
                                                {member.name || member.email}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {member.email}
                                            </div>
                                            <div className="text-sm font-medium text-green-700">
                                                NBC会員ID: {member.nbcMemberId}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                会員登録:{' '}
                                                {member.memberSince
                                                    ? new Date(
                                                          member.memberSince
                                                      ).toLocaleDateString('ja-JP')
                                                    : '不明'}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeNBCMember(member.id)}
                                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                                        >
                                            資格取消
                                        </button>
                                    </div>
                                ))}
                                {filteredNBCMembers.length === 0 && (
                                    <div className="text-center text-gray-500 py-8">
                                        該当するNBC会員がいません
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* NBC会員ID割り当てモーダル */}
            {showAssignModal && selectedUser && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                            NBC会員ID割り当て
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
                                htmlFor="memberId"
                                className="block text-sm font-medium text-gray-700 mb-2"
                            >
                                NBC会員ID
                            </label>
                            <input
                                type="text"
                                id="memberId"
                                placeholder="例: NBC-2024-001"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                value={newMemberId}
                                onChange={(e) => setNewMemberId(e.target.value)}
                            />
                            <div className="text-xs text-gray-500 mt-1">
                                一意のNBC会員IDを入力してください
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAssignModal(false);
                                    setSelectedUser(null);
                                    setNewMemberId('');
                                }}
                                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                            >
                                キャンセル
                            </button>
                            <button
                                type="button"
                                onClick={assignNBCMember}
                                disabled={!newMemberId.trim()}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                割り当て
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
