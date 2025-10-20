// ユーザー承認の状態や表示ラベルを管理するユーティリティ。
export const USER_APPROVAL_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export type UserApprovalStatus = (typeof USER_APPROVAL_STATUS)[keyof typeof USER_APPROVAL_STATUS];

export const USER_APPROVAL_LABELS: Record<UserApprovalStatus, string> = {
  [USER_APPROVAL_STATUS.PENDING]: "承認待ち",
  [USER_APPROVAL_STATUS.APPROVED]: "承認済み",
  [USER_APPROVAL_STATUS.REJECTED]: "拒否済み",
};

export const USER_APPROVAL_BADGE_COLORS: Record<UserApprovalStatus, string> = {
  [USER_APPROVAL_STATUS.PENDING]: "bg-yellow-100 text-yellow-800",
  [USER_APPROVAL_STATUS.APPROVED]: "bg-green-100 text-green-800",
  [USER_APPROVAL_STATUS.REJECTED]: "bg-red-100 text-red-800",
};

/**
 * 環境変数から承認フローを有効化するか判定する。
 * デフォルトは true (承認必須) とし、`AUTH_REQUIRE_ADMIN_APPROVAL` が `"false"`
 * または `NEXT_PUBLIC_REQUIRE_ADMIN_APPROVAL` が `"false"` の場合のみ無効化する。
 */
export const isManualApprovalEnabled = (() => {
  const raw =
    process.env.AUTH_REQUIRE_ADMIN_APPROVAL ?? process.env.NEXT_PUBLIC_REQUIRE_ADMIN_APPROVAL;

  if (typeof raw === "string") {
    return raw.trim().toLowerCase() !== "false";
  }

  return true;
})();

export const canUserLogin = (status: UserApprovalStatus, isActive: boolean) =>
  // 承認済みかつアカウントがアクティブであればログイン許可
  status === USER_APPROVAL_STATUS.APPROVED && isActive;

// EOF
