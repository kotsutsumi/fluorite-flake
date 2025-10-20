// メールアドレスを用いたユーザー登録処理をまとめる。
import { Prisma } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { logger } from "@/lib/logger";
import { APP_ROLES } from "@/lib/roles";
import { isManualApprovalEnabled, USER_APPROVAL_STATUS } from "@/lib/user-approval";

type RegisterUserParams = {
  email: string;
  password: string;
  name?: string;
  headers?: Headers;
  autoCreateSession?: boolean;
};

export type RegisterUserResult = {
  status: "pending" | "approved";
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    approvalStatus: string;
    isActive: boolean;
  };
  session?: {
    token: string;
    expiresAt?: Date;
  };
};

/**
 * Registration 用の User レコードを作成するヘルパー。
 * - Better Auth の credentials プロバイダーと整合するよう accounts テーブルも作成
 * - 承認が必要な環境では PENDING ステータスで非アクティブ状態にする
 */
function createUserRecord({
  email,
  name,
  hashedPassword,
  approvalRequired,
}: {
  email: string;
  name: string;
  hashedPassword: string;
  approvalRequired: boolean;
}) {
  return prisma.user.create({
    data: {
      email,
      name: name || null,
      role: APP_ROLES.USER,
      approvalStatus: approvalRequired
        ? USER_APPROVAL_STATUS.PENDING
        : USER_APPROVAL_STATUS.APPROVED,
      approvalStatusUpdatedAt: approvalRequired ? null : new Date(),
      approvalStatusUpdatedBy: approvalRequired ? null : "system",
      isActive: !approvalRequired,
      accounts: {
        create: {
          providerId: "credential",
          accountId: email,
          password: hashedPassword,
        },
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      approvalStatus: true,
      isActive: true,
    },
  });
}

/**
 * 登録直後に自動ログインする場合に使用するセッション生成関数。
 * - Better Auth の email サインイン API を呼び出し、トークンを取得
 * - Prisma の session テーブルから有効期限を取得して返却
 */
async function createSessionForUser(
  email: string,
  password: string,
  headers?: Headers
): Promise<{ token: string; expiresAt?: Date } | undefined> {
  const sessionResult = await auth.api.signInEmail({
    body: { email, password },
    headers: headers ?? new Headers(),
  });

  if (!sessionResult?.token) {
    return;
  }

  const sessionRecord = await prisma.session.findUnique({
    where: { token: sessionResult.token },
    select: { expiresAt: true },
  });

  return {
    token: sessionResult.token,
    expiresAt: sessionRecord?.expiresAt ?? undefined,
  };
}

export async function registerUserWithEmail({
  email,
  password,
  name,
  headers,
  autoCreateSession = false,
}: RegisterUserParams): Promise<RegisterUserResult> {
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedName = name?.trim() ?? "";

  if (!trimmedEmail) {
    throw new Error("Email is required");
  }

  const approvalRequired = isManualApprovalEnabled;

  try {
    // Better Auth と同じハッシュ方式でパスワードを暗号化
    const hashedPassword = await hashPassword(password);

    const user = await createUserRecord({
      email: trimmedEmail,
      name: trimmedName,
      hashedPassword,
      approvalRequired,
    });

    if (approvalRequired || !autoCreateSession) {
      // 承認待ち環境ではセッション発行をスキップし、管理者からの承認を待つ
      return {
        status: approvalRequired ? "pending" : "approved",
        user,
      };
    }

    const session = await createSessionForUser(trimmedEmail, password, headers);

    return {
      status: "approved",
      user,
      session,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("既に同じメールアドレスで登録済みです。");
    }

    logger.error("Failed to register user", error);
    throw new Error("ユーザー登録に失敗しました。");
  }
}

// EOF
