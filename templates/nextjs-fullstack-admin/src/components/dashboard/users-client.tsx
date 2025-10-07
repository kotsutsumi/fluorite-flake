'use client';

import { Badge } from '@/components/ui/badge';
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
import { APP_ROLES, type AppRole, ROLE_LABELS } from '@/lib/roles';
import { Trash2, UserPlus } from 'lucide-react';
import type React from 'react';
import { useId, useMemo, useState, useTransition } from 'react';

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

interface OrganizationOption {
    id: string;
    name: string;
    slug: string;
}

interface UserMembership {
    id: string;
    role: string;
    organization: {
        id: string;
        name: string;
        slug: string;
    };
}

interface DashboardUser {
    id: string;
    email: string;
    name: string | null;
    role: string;
    memberships: UserMembership[];
    createdAt: string;
}

interface UsersClientProps {
    initialUsers: DashboardUser[];
    organizations: OrganizationOption[];
    currentRole: string;
    currentUserId: string;
}

export function UsersClient({
    initialUsers,
    organizations,
    currentRole,
    currentUserId,
}: UsersClientProps) {
    const [users, setUsers] = useState<DashboardUser[]>(initialUsers);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [form, setForm] = useState<{
        name: string;
        email: string;
        password: string;
        organizationId: string;
        role: AppRole;
    }>({
        name: '',
        email: '',
        password: '',
        organizationId: organizations[0]?.id ?? '',
        role: APP_ROLES.USER,
    });
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState('');
    const userNameId = useId();
    const userEmailId = useId();
    const userPasswordId = useId();

    const canManageAdmins = currentRole === APP_ROLES.ADMIN;

    const openDialog = () => {
        setForm({
            name: '',
            email: '',
            password: 'TempPass123!',
            organizationId: organizations[0]?.id ?? '',
            role: canManageAdmins ? APP_ROLES.ORG_ADMIN : APP_ROLES.USER,
        });
        setError('');
        setIsDialogOpen(true);
    };

    const handleCreate = () => {
        startTransition(async () => {
            setError('');
            try {
                const payload = {
                    name: form.name,
                    email: form.email,
                    password: form.password,
                    organizationId: form.organizationId,
                    role: form.role,
                };

                const response = await fetch('/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    credentials: 'include',
                });

                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data.error || 'ユーザー作成に失敗しました');
                }

                const data = await response.json();
                setUsers(data.users as DashboardUser[]);
                setIsDialogOpen(false);
            } catch (err: unknown) {
                setError(getErrorMessage(err) || 'ユーザー作成に失敗しました');
            }
        });
    };

    const handleDelete = (user: DashboardUser) => {
        if (!window.confirm(`${user.email} を削除しますか？`)) {
            return;
        }

        startTransition(async () => {
            setError('');
            try {
                const res = await fetch(`/api/users/${user.id}`, {
                    method: 'DELETE',
                    credentials: 'include',
                });

                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.error || '削除に失敗しました');
                }

                const data = await res.json();
                setUsers(data.users as DashboardUser[]);
            } catch (err: unknown) {
                setError(getErrorMessage(err));
            }
        });
    };

    const summary = useMemo(() => {
        return {
            total: users.length,
            admin: users.filter((user) => user.role === APP_ROLES.ADMIN).length,
            orgAdmin: users.filter((user) => user.role === APP_ROLES.ORG_ADMIN).length,
            general: users.filter((user) => user.role === APP_ROLES.USER).length,
        };
    }, [users]);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <CardTitle>ユーザー管理</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            合計 {summary.total} 名 / 管理ユーザー {summary.admin} 名 / 組織管理{' '}
                            {summary.orgAdmin} 名 / 一般 {summary.general} 名
                        </p>
                    </div>
                    <div className="flex w-full flex-col gap-2 md:w-auto md:items-end">
                        <Button
                            onClick={openDialog}
                            className="w-full md:w-auto"
                            disabled={organizations.length === 0}
                            variant="default"
                            size="default"
                        >
                            <UserPlus className="mr-2 h-4 w-4" /> ユーザーを追加
                        </Button>
                        {organizations.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                                利用可能な組織がありません。先に組織を作成してください。
                            </p>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>氏名</TableHead>
                                <TableHead>メールアドレス</TableHead>
                                <TableHead>ロール</TableHead>
                                <TableHead>所属組織</TableHead>
                                <TableHead className="w-[120px]">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">
                                        {user.name ?? '-'}
                                    </TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">
                                            {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] ??
                                                user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {user.memberships.length > 0
                                            ? user.memberships
                                                  .map(
                                                      (membership) =>
                                                          `${membership.organization.name} (${membership.role})`
                                                  )
                                                  .join(', ')
                                            : '未所属'}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handleDelete(user)}
                                            disabled={isPending || user.id === currentUserId}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {users.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={5}
                                        className="text-center text-sm text-muted-foreground"
                                    >
                                        表示できるユーザーがいません。
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
                    <DialogHeader>
                        <DialogTitle>ユーザーを追加</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label
                                htmlFor={userNameId}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                氏名
                            </label>
                            <Input
                                id={userNameId}
                                type="text"
                                value={form.name}
                                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                    setForm((prev) => ({ ...prev, name: event.target.value }))
                                }
                                placeholder="山田 太郎"
                            />
                        </div>
                        <div className="space-y-2">
                            <label
                                htmlFor={userEmailId}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                メールアドレス
                            </label>
                            <Input
                                id={userEmailId}
                                type="email"
                                value={form.email}
                                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                    setForm((prev) => ({ ...prev, email: event.target.value }))
                                }
                                placeholder="user@example.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <label
                                htmlFor={userPasswordId}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                初期パスワード
                            </label>
                            <Input
                                id={userPasswordId}
                                type="password"
                                value={form.password}
                                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                    setForm((prev) => ({ ...prev, password: event.target.value }))
                                }
                                placeholder="TempPass123!"
                            />
                        </div>
                        <div className="space-y-2">
                            <label
                                htmlFor="organization-select"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                所属組織
                            </label>
                            <Select
                                value={form.organizationId}
                                onValueChange={(value: string) =>
                                    setForm((prev) => ({ ...prev, organizationId: value }))
                                }
                                disabled={organizations.length === 0}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="所属組織を選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    {organizations.map((organization) => (
                                        <SelectItem key={organization.id} value={organization.id}>
                                            {organization.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label
                                htmlFor="role-select"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                ロール
                            </label>
                            <Select
                                value={form.role}
                                onValueChange={(value: string) =>
                                    setForm((prev) => ({ ...prev, role: value as AppRole }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {canManageAdmins && (
                                        <SelectItem value={APP_ROLES.ADMIN}>
                                            管理ユーザー
                                        </SelectItem>
                                    )}
                                    <SelectItem value={APP_ROLES.ORG_ADMIN}>
                                        組織管理ユーザー
                                    </SelectItem>
                                    <SelectItem value={APP_ROLES.USER}>一般ユーザー</SelectItem>
                                </SelectContent>
                            </Select>
                            {!canManageAdmins && (
                                <p className="text-xs text-muted-foreground">
                                    組織管理ユーザーは一般ユーザーのみ作成できます。
                                </p>
                            )}
                        </div>
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsDialogOpen(false)}
                            disabled={isPending}
                            size="default"
                        >
                            キャンセル
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={isPending || organizations.length === 0}
                            variant="default"
                            size="default"
                        >
                            作成する
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
