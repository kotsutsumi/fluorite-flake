"use client";
// ユーザー管理 UI を提供するクライアントコンポーネント。
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { Edit, Trash2, UserPlus } from "lucide-react";
import type React from "react";
import { useId, useMemo, useState, useTransition } from "react";

import { APP_ROLES, type AppRole, ROLE_LABELS } from "@/lib/roles";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "An unknown error occurred";
}

type OrganizationOption = {
  id: string;
  name: string;
  slug: string;
};

type UserMembership = {
  id: string;
  role: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
};

type DashboardUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  memberships: UserMembership[];
  createdAt: string;
};

type UsersClientProps = {
  initialUsers: DashboardUser[];
  organizations: OrganizationOption[];
  currentRole: string;
  currentUserId: string;
};

type UserFormProps = {
  isOpen: boolean;
  onClose: () => void;
  form: {
    name: string;
    email: string;
    password: string;
    organizationId: string;
    role: AppRole;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      name: string;
      email: string;
      password: string;
      organizationId: string;
      role: AppRole;
    }>
  >;
  organizations: OrganizationOption[];
  canManageAdmins: boolean;
  isEditMode: boolean;
  isPending: boolean;
  error: string;
  onSubmit: () => void;
};

function UserFormDialog({
  isOpen,
  onClose,
  form,
  setForm,
  organizations,
  canManageAdmins,
  isEditMode,
  isPending,
  error,
  onSubmit,
}: UserFormProps) {
  const userNameId = useId();
  const userEmailId = useId();
  const userPasswordId = useId();

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog onOpenChange={handleDialogChange} open={isOpen}>
      {isOpen && (
        <button
          aria-label="Close dialog"
          className="fixed inset-0 z-50 cursor-default border-0 bg-black/50 p-0"
          onClick={onClose}
          type="button"
        />
      )}
      <DialogContent
        className="sm:max-w-lg"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          display: isOpen ? "flex" : "none",
          flexDirection: "column",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          zIndex: 50,
        }}
      >
        <DialogHeader>
          <DialogTitle>{isEditMode ? "ユーザーを編集" : "ユーザーを追加"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label
              className="font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              htmlFor={userNameId}
            >
              氏名
            </label>
            <Input
              id={userNameId}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="山田 太郎"
              type="text"
              value={form.name}
            />
          </div>
          <div className="space-y-2">
            <label
              className="font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              htmlFor={userEmailId}
            >
              メールアドレス
            </label>
            <Input
              id={userEmailId}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setForm((prev) => ({ ...prev, email: event.target.value }))
              }
              placeholder="user@example.com"
              type="email"
              value={form.email}
            />
          </div>
          <div className="space-y-2">
            <label
              className="font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              htmlFor={userPasswordId}
            >
              {isEditMode ? "パスワード（変更する場合のみ入力）" : "初期パスワード"}
            </label>
            <Input
              id={userPasswordId}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setForm((prev) => ({ ...prev, password: event.target.value }))
              }
              placeholder={isEditMode ? "変更しない場合は空欄" : "TempPass123!"}
              type="password"
              value={form.password}
            />
          </div>
          <div className="space-y-2">
            <label
              className="font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              htmlFor="organization-select"
            >
              所属組織
            </label>
            <Select
              disabled={organizations.length === 0}
              onValueChange={(value: string) =>
                setForm((prev) => ({ ...prev, organizationId: value }))
              }
              value={form.organizationId}
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
              className="font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              htmlFor="role-select"
            >
              ロール
            </label>
            <Select
              onValueChange={(value: string) =>
                setForm((prev) => ({ ...prev, role: value as AppRole }))
              }
              value={form.role}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {canManageAdmins && <SelectItem value={APP_ROLES.ADMIN}>管理ユーザー</SelectItem>}
                <SelectItem value={APP_ROLES.ORG_ADMIN}>組織管理ユーザー</SelectItem>
                <SelectItem value={APP_ROLES.USER}>一般ユーザー</SelectItem>
              </SelectContent>
            </Select>
            {!canManageAdmins && (
              <p className="text-muted-foreground text-xs">
                組織管理ユーザーは一般ユーザーのみ作成できます。
              </p>
            )}
          </div>
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <DialogFooter>
          <Button disabled={isPending} onClick={onClose} size="default" variant="outline">
            キャンセル
          </Button>
          <Button
            disabled={isPending || organizations.length === 0}
            onClick={onSubmit}
            size="default"
            variant="default"
          >
            {isEditMode ? "更新する" : "作成する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UsersClient({
  initialUsers,
  organizations,
  currentRole,
  currentUserId,
}: UsersClientProps) {
  const [users, setUsers] = useState<DashboardUser[]>(initialUsers);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form, setForm] = useState<{
    name: string;
    email: string;
    password: string;
    organizationId: string;
    role: AppRole;
  }>({
    name: "",
    email: "",
    password: "",
    organizationId: organizations[0]?.id ?? "",
    role: APP_ROLES.USER,
  });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [pendingDeletionUser, setPendingDeletionUser] = useState<DashboardUser | null>(null);

  const canManageAdmins = currentRole === APP_ROLES.ADMIN;
  const isEditMode = editingUserId !== null;

  const openDialog = () => {
    setEditingUserId(null);
    setForm({
      name: "",
      email: "",
      password: "TempPass123!",
      organizationId: organizations[0]?.id ?? "",
      role: canManageAdmins ? APP_ROLES.ORG_ADMIN : APP_ROLES.USER,
    });
    setError("");
    setIsDialogOpen(true);
  };

  const openEditDialog = (user: DashboardUser) => {
    setEditingUserId(user.id);
    setForm({
      name: user.name ?? "",
      email: user.email,
      password: "",
      organizationId: user.memberships[0]?.organization.id ?? organizations[0]?.id ?? "",
      role: user.role as AppRole,
    });
    setError("");
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (isEditMode) {
      handleUpdate();
    } else {
      handleCreate();
    }
  };

  const handleCreate = () => {
    startTransition(async () => {
      setError("");
      try {
        const payload = {
          name: form.name,
          email: form.email,
          password: form.password,
          organizationId: form.organizationId,
          role: form.role,
        };

        const response = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include",
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "ユーザー作成に失敗しました");
        }

        const data = await response.json();
        setUsers(data.users as DashboardUser[]);
        setIsDialogOpen(false);
        setEditingUserId(null);
      } catch (err: unknown) {
        setError(getErrorMessage(err) || "ユーザー作成に失敗しました");
      }
    });
  };

  const handleUpdate = () => {
    if (!editingUserId) {
      return;
    }

    startTransition(async () => {
      setError("");
      try {
        const payload: {
          name: string;
          email: string;
          password?: string;
          organizationId: string;
          role: AppRole;
        } = {
          name: form.name,
          email: form.email,
          organizationId: form.organizationId,
          role: form.role,
        };

        // パスワードが入力された場合のみ更新ペイロードに含める
        if (form.password) {
          payload.password = form.password;
        }

        const response = await fetch(`/api/users/${editingUserId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include",
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "ユーザー更新に失敗しました");
        }

        const data = await response.json();
        setUsers(data.users as DashboardUser[]);
        setIsDialogOpen(false);
        setEditingUserId(null);
      } catch (err: unknown) {
        setError(getErrorMessage(err) || "ユーザー更新に失敗しました");
      }
    });
  };

  const requestDelete = (user: DashboardUser) => {
    setPendingDeletionUser(user);
    setError("");
  };

  const confirmDelete = () => {
    if (!pendingDeletionUser) {
      return;
    }

    startTransition(async () => {
      setError("");
      try {
        const res = await fetch(`/api/users/${pendingDeletionUser.id}`, {
          method: "DELETE",
          credentials: "include",
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "削除に失敗しました");
        }

        const data = await res.json();
        setUsers(data.users as DashboardUser[]);
        setPendingDeletionUser(null);
      } catch (err: unknown) {
        setError(getErrorMessage(err));
      }
    });
  };

  const summary = useMemo(
    () => ({
      total: users.length,
      admin: users.filter((user) => user.role === APP_ROLES.ADMIN).length,
      orgAdmin: users.filter((user) => user.role === APP_ROLES.ORG_ADMIN).length,
      general: users.filter((user) => user.role === APP_ROLES.USER).length,
    }),
    [users]
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="mb-3">ユーザー管理</CardTitle>
            <p className="text-muted-foreground text-sm">
              合計 {summary.total} 名 / 管理ユーザー {summary.admin} 名 / 組織管理{" "}
              {summary.orgAdmin} 名 / 一般 {summary.general} 名
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:items-end">
            <Button
              className="w-full md:w-auto"
              disabled={organizations.length === 0}
              onClick={openDialog}
              size="default"
              variant="default"
            >
              <UserPlus className="mr-2 h-4 w-4" /> ユーザーを追加
            </Button>
            {organizations.length === 0 && (
              <p className="text-muted-foreground text-xs">
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
                  <TableCell className="font-medium">{user.name ?? "-"}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] ?? user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.memberships.length > 0
                      ? user.memberships
                          .map(
                            (membership) => `${membership.organization.name} (${membership.role})`
                          )
                          .join(", ")
                      : "未所属"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        disabled={isPending}
                        onClick={() => openEditDialog(user)}
                        size="sm"
                        variant="outline"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        disabled={isPending || user.id === currentUserId}
                        onClick={() => requestDelete(user)}
                        size="sm"
                        variant="outline"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell className="text-center text-muted-foreground text-sm" colSpan={5}>
                    表示できるユーザーがいません。
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {error && <p className="mt-4 text-destructive text-sm">{error}</p>}
        </CardContent>
      </Card>

      <UserFormDialog
        canManageAdmins={canManageAdmins}
        error={error}
        form={form}
        isEditMode={isEditMode}
        isOpen={isDialogOpen}
        isPending={isPending}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingUserId(null);
        }}
        onSubmit={handleSubmit}
        organizations={organizations}
        setForm={setForm}
      />
      <Dialog
        onOpenChange={(open) => !open && setPendingDeletionUser(null)}
        open={!!pendingDeletionUser}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">ユーザー削除の確認</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <p className="text-muted-foreground text-sm">
              「<span className="font-medium">{pendingDeletionUser?.email}</span>」を削除しますか？
            </p>
            <p className="text-muted-foreground text-sm">この操作は取り消すことができません。</p>
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button
              disabled={isPending}
              onClick={() => setPendingDeletionUser(null)}
              type="button"
              variant="outline"
            >
              キャンセル
            </Button>
            <Button
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPending}
              onClick={confirmDelete}
              type="button"
            >
              {isPending ? "削除中..." : "削除する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// EOF
