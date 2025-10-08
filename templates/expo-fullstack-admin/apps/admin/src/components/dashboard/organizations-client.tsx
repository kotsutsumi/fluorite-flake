'use client';
import React from 'react';
import { useEffect, useId, useMemo, useState, useTransition } from 'react';
import { Edit, Plus, Trash2, UserMinus, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { toSlug } from '@/lib/to-slug';

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
        return String((error as { message: unknown }).message);
    }
    return 'An unknown error occurred';
}

interface OrganizationMember {
    id: string;
    role: string;
    user: {
        id: string;
        email: string;
        name: string | null;
        role: string;
    };
}

interface Organization {
    id: string;
    name: string;
    slug: string;
    metadata: string | null;
    members: OrganizationMember[];
}

interface User {
    id: string;
    email: string;
    name: string | null;
    role: string;
    memberships: Array<{
        id: string;
        role: string;
        organization: {
            id: string;
            name: string;
            slug: string;
        };
    }>;
}

interface OrganizationsClientProps {
    initialOrganizations: Organization[];
}

export function OrganizationsClient({ initialOrganizations }: OrganizationsClientProps) {
    const [organizations, setOrganizations] = useState<Organization[]>(initialOrganizations);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Organization | null>(null);
    const [isSlugTouched, setIsSlugTouched] = useState(false);
    const [form, setForm] = useState({
        name: '',
        slug: '',
        metadata: '{}',
    });
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState('');

    // Member management state
    const [users, setUsers] = useState<User[]>([]);
    const [_isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
    const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedRole, setSelectedRole] = useState('member');
    const [expandedOrganizations, setExpandedOrganizations] = useState<Set<string>>(new Set());

    // Delete confirmation dialog state
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [organizationToDelete, setOrganizationToDelete] = useState<Organization | null>(null);

    // Member delete confirmation dialog state
    const [isMemberDeleteDialogOpen, setIsMemberDeleteDialogOpen] = useState(false);
    const [memberToDelete, setMemberToDelete] = useState<{
        organizationId: string;
        userId: string;
        userName: string;
    } | null>(null);

    // Cannot delete organization dialog state
    const [isCannotDeleteDialogOpen, setIsCannotDeleteDialogOpen] = useState(false);
    const [organizationWithMembers, setOrganizationWithMembers] = useState<Organization | null>(
        null
    );

    const organizationNameId = useId();
    const organizationSlugId = useId();
    const organizationMetadataId = useId();

    const organizationSummary = useMemo(() => {
        const memberTotal = organizations.reduce(
            (total, organization) => total + organization.members.length,
            0
        );

        return {
            count: organizations.length,
            members: memberTotal,
        };
    }, [organizations]);

    // Fetch users when component mounts
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch('/api/users', { credentials: 'include' });
                if (response.ok) {
                    const data = await response.json();
                    setUsers(data.users);
                }
            } catch (error) {
                console.error('Failed to fetch users:', error);
            }
        };
        fetchUsers();
    }, []);

    // Get available users for an organization (users not already members)
    const _getAvailableUsers = (organizationId: string) => {
        const organization = organizations.find((org) => org.id === organizationId);
        if (!organization) {
            return [];
        }

        const memberUserIds = new Set(organization.members.map((member) => member.user.id));
        return users.filter((user) => !memberUserIds.has(user.id));
    };

    const openCreateDialog = () => {
        setEditing(null);
        setForm({ name: '', slug: '', metadata: '{}' });
        setIsSlugTouched(false);
        setError('');
        setIsDialogOpen(true);
    };

    const openEditDialog = (organization: Organization) => {
        setEditing(organization);
        setForm({
            name: organization.name,
            slug: organization.slug,
            metadata: organization.metadata ?? '{}',
        });
        setIsSlugTouched(true);
        setError('');
        setIsDialogOpen(true);
    };

    const handleNameChange = (value: string) => {
        setForm((prev) => ({
            ...prev,
            name: value,
            slug: isSlugTouched ? prev.slug : toSlug(value),
        }));
    };

    const handleSlugChange = (value: string) => {
        setIsSlugTouched(true);
        setForm((prev) => ({ ...prev, slug: value }));
    };

    const handleMetadataChange = (value: string) => {
        setForm((prev) => ({ ...prev, metadata: value }));
    };

    // Member management functions
    const _openMemberDialog = (organization: Organization) => {
        setSelectedOrganization(organization);
        setSelectedUserId('');
        setSelectedRole('member');
        setError('');
        setIsMemberDialogOpen(true);
    };

    const toggleOrganizationExpanded = (orgId: string) => {
        const newExpanded = new Set(expandedOrganizations);
        if (newExpanded.has(orgId)) {
            newExpanded.delete(orgId);
        } else {
            newExpanded.add(orgId);
        }
        setExpandedOrganizations(newExpanded);
    };

    const _handleAddMember = () => {
        if (!selectedOrganization || !selectedUserId) {
            return;
        }

        startTransition(async () => {
            setError('');
            try {
                const response = await fetch(
                    `/api/organizations/${selectedOrganization.id}/members`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: selectedUserId, role: selectedRole }),
                        credentials: 'include',
                    }
                );

                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data.error || 'メンバーの追加に失敗しました');
                }

                const data = await response.json();
                // Update the organization in the list
                setOrganizations((prev) =>
                    prev.map((org) =>
                        org.id === selectedOrganization.id ? data.organization : org
                    )
                );
                setIsMemberDialogOpen(false);
            } catch (err: unknown) {
                setError(getErrorMessage(err));
            }
        });
    };

    const handleRemoveMember = (organizationId: string, userId: string, userName: string) => {
        setMemberToDelete({ organizationId, userId, userName });
        setIsMemberDeleteDialogOpen(true);
    };

    const confirmRemoveMember = () => {
        if (!memberToDelete) {
            return;
        }

        startTransition(async () => {
            setError('');
            try {
                const response = await fetch(
                    `/api/organizations/${memberToDelete.organizationId}/members/${memberToDelete.userId}`,
                    {
                        method: 'DELETE',
                        credentials: 'include',
                    }
                );

                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data.error || 'メンバーの削除に失敗しました');
                }

                const data = await response.json();
                // Update the organization in the list
                setOrganizations((prev) =>
                    prev.map((org) =>
                        org.id === memberToDelete.organizationId ? data.organization : org
                    )
                );
                setIsMemberDeleteDialogOpen(false);
                setMemberToDelete(null);
            } catch (err: unknown) {
                setError(getErrorMessage(err));
            }
        });
    };

    const handleSubmit = () => {
        startTransition(async () => {
            setError('');
            try {
                const trimmedName = form.name.trim();
                const trimmedSlug = form.slug.trim();

                if (!trimmedName || !trimmedSlug) {
                    throw new Error('組織名とスラッグは必須です。');
                }

                let metadata: unknown;
                if (form.metadata?.trim()) {
                    try {
                        metadata = JSON.parse(form.metadata);
                    } catch (_parseError) {
                        throw new Error('メタデータは有効な JSON 形式で入力してください。');
                    }
                }

                const payload = {
                    name: trimmedName,
                    slug: trimmedSlug,
                    metadata,
                };

                const endpoint = editing
                    ? `/api/organizations/${editing.id}`
                    : '/api/organizations';
                const method = editing ? 'PUT' : 'POST';

                const response = await fetch(endpoint, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    credentials: 'include',
                });

                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data.error || '組織情報の更新に失敗しました');
                }

                const data = await response.json();
                setOrganizations(data.organizations as Organization[]);
                setIsDialogOpen(false);
            } catch (err: unknown) {
                setError(getErrorMessage(err));
            }
        });
    };

    const handleDelete = (organization: Organization) => {
        // Check if organization has members
        if (organization.members.length > 0) {
            setOrganizationWithMembers(organization);
            setIsCannotDeleteDialogOpen(true);
            return;
        }

        setOrganizationToDelete(organization);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (!organizationToDelete) {
            return;
        }

        startTransition(async () => {
            setError('');
            try {
                const response = await fetch(`/api/organizations/${organizationToDelete.id}`, {
                    method: 'DELETE',
                    credentials: 'include',
                });

                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data.error || '削除に失敗しました');
                }

                const data = await response.json();
                setOrganizations(data.organizations as Organization[]);
                setIsDeleteDialogOpen(false);
                setOrganizationToDelete(null);
            } catch (err: unknown) {
                setError(getErrorMessage(err));
            }
        });
    };

    return (
        <div className="space-y-6">
            <Card className="">
                <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <CardTitle className="mb-3">組織一覧</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            全組織 {organizationSummary.count} 件 / メンバー総数{' '}
                            {organizationSummary.members} 名
                        </p>
                    </div>
                    <Button
                        onClick={openCreateDialog}
                        className="w-full md:w-auto"
                        variant="default"
                        size="default"
                    >
                        <Plus className="mr-2 h-4 w-4" /> 組織を追加
                    </Button>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <Table className="">
                        <TableHeader className="">
                            <TableRow className="">
                                <TableHead className="">組織名</TableHead>
                                <TableHead className="">スラッグ</TableHead>
                                <TableHead className="">メンバー数</TableHead>
                                <TableHead className="">メタデータ</TableHead>
                                <TableHead className="w-[200px]">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="">
                            {organizations.map((organization) => (
                                <React.Fragment key={organization.id}>
                                    <TableRow className="">
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        toggleOrganizationExpanded(organization.id)
                                                    }
                                                    className="p-1 h-6 w-6"
                                                >
                                                    <Users className="h-4 w-4" />
                                                </Button>
                                                {organization.name}
                                            </div>
                                        </TableCell>
                                        <TableCell className="">{organization.slug}</TableCell>
                                        <TableCell className="">
                                            {organization.members.length}
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                                            {organization.metadata ?? '-'}
                                        </TableCell>
                                        <TableCell className="flex gap-1" aria-label="操作">
                                            <Button
                                                onClick={() => openEditDialog(organization)}
                                                disabled={isPending}
                                                aria-label={`${organization.name} を編集`}
                                                variant="outline"
                                                size="sm"
                                                className=""
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                onClick={() => handleDelete(organization)}
                                                disabled={isPending}
                                                aria-label={`${organization.name} を削除`}
                                                variant="outline"
                                                size="sm"
                                                className=""
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                    {expandedOrganizations.has(organization.id) && (
                                        <TableRow className="">
                                            <TableCell
                                                colSpan={5}
                                                className="py-2 px-4 bg-muted/30"
                                            >
                                                <div className="space-y-2">
                                                    <h4 className="text-sm font-medium">
                                                        メンバー一覧
                                                    </h4>
                                                    {organization.members.length === 0 ? (
                                                        <p className="text-sm text-muted-foreground">
                                                            メンバーがいません
                                                        </p>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            {organization.members.map((member) => (
                                                                <div
                                                                    key={member.id}
                                                                    className="flex items-center justify-between p-2 rounded border bg-background"
                                                                >
                                                                    <div className="flex flex-col">
                                                                        <span className="text-sm font-medium">
                                                                            {member.user.name ||
                                                                                member.user.email}
                                                                        </span>
                                                                        <span className="text-xs text-muted-foreground">
                                                                            {member.user.email} •{' '}
                                                                            {member.role}
                                                                        </span>
                                                                    </div>
                                                                    <Button
                                                                        onClick={() =>
                                                                            handleRemoveMember(
                                                                                organization.id,
                                                                                member.user.id,
                                                                                member.user.name ||
                                                                                    member.user
                                                                                        .email
                                                                            )
                                                                        }
                                                                        disabled={isPending}
                                                                        aria-label={`${member.user.name || member.user.email} を削除`}
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="text-destructive hover:text-destructive"
                                                                    >
                                                                        <UserMinus className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </React.Fragment>
                            ))}
                            {organizations.length === 0 && (
                                <TableRow className="">
                                    <TableCell
                                        colSpan={5}
                                        className="text-center text-sm text-muted-foreground"
                                    >
                                        表示できる組織がありません。
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="">
                            {editing ? '組織を編集' : '組織を追加'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label
                                htmlFor={organizationNameId}
                                className="text-sm font-medium mb-3 block"
                            >
                                組織名
                            </label>
                            <Input
                                id={organizationNameId}
                                value={form.name}
                                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                    handleNameChange(event.target.value)
                                }
                                placeholder="組織名"
                                className=""
                                type="text"
                            />
                        </div>
                        <div className="space-y-2">
                            <label
                                htmlFor={organizationSlugId}
                                className="text-sm font-medium mb-3 block"
                            >
                                スラッグ
                            </label>
                            <Input
                                id={organizationSlugId}
                                value={form.slug}
                                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                    handleSlugChange(event.target.value)
                                }
                                placeholder="fishing"
                                className=""
                                type="text"
                            />
                            <p className="text-xs text-muted-foreground">
                                URL 等で利用される識別子です。英数字とハイフンのみ推奨。
                            </p>
                        </div>
                        <div className="space-y-2">
                            <label
                                htmlFor={organizationMetadataId}
                                className="text-sm font-medium mb-3 block"
                            >
                                メタデータ (JSON)
                            </label>
                            <textarea
                                id={organizationMetadataId}
                                value={form.metadata}
                                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                                    handleMetadataChange(event.target.value)
                                }
                                className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                                placeholder='{"tier":"gold"}'
                            />
                        </div>
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <DialogFooter className="">
                        <Button
                            variant="outline"
                            onClick={() => setIsDialogOpen(false)}
                            disabled={isPending}
                            className=""
                            size="default"
                        >
                            キャンセル
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isPending}
                            className=""
                            variant="default"
                            size="default"
                        >
                            {editing ? '更新する' : '登録する'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete confirmation dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-destructive">組織を削除</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            「<span className="font-medium">{organizationToDelete?.name}</span>
                            」を削除しますか？
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                            この操作は取り消すことができません。
                        </p>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsDeleteDialogOpen(false);
                                setOrganizationToDelete(null);
                            }}
                            disabled={isPending}
                        >
                            キャンセル
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={isPending}>
                            削除する
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Member delete confirmation dialog */}
            <Dialog open={isMemberDeleteDialogOpen} onOpenChange={setIsMemberDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-destructive">メンバーを削除</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            「<span className="font-medium">{memberToDelete?.userName}</span>
                            」を組織から削除しますか？
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                            この操作は取り消すことができません。
                        </p>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsMemberDeleteDialogOpen(false);
                                setMemberToDelete(null);
                            }}
                            disabled={isPending}
                        >
                            キャンセル
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmRemoveMember}
                            disabled={isPending}
                        >
                            削除する
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Cannot delete organization dialog */}
            <Dialog open={isCannotDeleteDialogOpen} onOpenChange={setIsCannotDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-amber-600">組織を削除できません</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-3">
                        <p className="text-sm text-muted-foreground">
                            「<span className="font-medium">{organizationWithMembers?.name}</span>
                            」には
                            <span className="font-medium text-foreground">
                                {' '}
                                {organizationWithMembers?.members.length}名
                            </span>
                            のメンバーが存在するため削除できません。
                        </p>
                        <p className="text-sm text-muted-foreground">
                            組織を削除するには、まず全てのメンバーを削除してください。
                        </p>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="default"
                            onClick={() => {
                                setIsCannotDeleteDialogOpen(false);
                                setOrganizationWithMembers(null);
                            }}
                        >
                            OK
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
