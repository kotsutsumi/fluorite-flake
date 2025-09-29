/**
 * 組み込み認証システムのための型安全性を強化する型定義
 */

/**
 * ユーザーの役割を表す型
 * - admin: システム管理者
 * - org_admin: 組織管理者
 * - user: 一般ユーザー
 */
export type UserRole = 'admin' | 'org_admin' | 'user';

/**
 * アプリケーションの役割定義インターフェース
 */
export interface AppRoles {
    /** システム管理者 */
    ADMIN: 'admin';
    /** 組織管理者 */
    ORG_ADMIN: 'org_admin';
    /** 一般ユーザー */
    USER: 'user';
}

/**
 * アプリケーションの役割定数
 * 型安全性を確保するためのas constで定義
 */
export const APP_ROLES: AppRoles = {
    ADMIN: 'admin',
    ORG_ADMIN: 'org_admin',
    USER: 'user',
} as const;

/**
 * 役割に応じた権限を表すインターフェース
 */
export interface RolePermissions {
    /** 組織管理権限 */
    canManageOrganizations: boolean;
    /** ユーザー管理権限 */
    canManageUsers: boolean;
    /** 自分のプロフィール管理権限 */
    canManageOwnProfile: boolean;
}

/**
 * ユーザーの役割に応じた権限情報を取得します
 * @param role ユーザーの役割
 * @returns 役割に応じた権限情報
 */
export function getRolePermissions(role: UserRole): RolePermissions {
    switch (role) {
        case APP_ROLES.ADMIN:
            // システム管理者: 全ての権限を持つ
            return {
                canManageOrganizations: true,
                canManageUsers: true,
                canManageOwnProfile: true,
            };
        case APP_ROLES.ORG_ADMIN:
            // 組織管理者: ユーザー管理と自分のプロフィール管理が可能
            return {
                canManageOrganizations: false,
                canManageUsers: true,
                canManageOwnProfile: true,
            };
        case APP_ROLES.USER:
            // 一般ユーザー: 自分のプロフィール管理のみ可能
            return {
                canManageOrganizations: false,
                canManageUsers: false,
                canManageOwnProfile: true,
            };
        default:
            // 未知の役割のフォールバック: 最低限の権限
            return {
                canManageOrganizations: false,
                canManageUsers: false,
                canManageOwnProfile: true,
            };
    }
}

/**
 * 指定された文字列が有効なユーザー役割かどうかをチェックします
 * @param role チェックする役割文字列
 * @returns 有効な役割の場合はtrue、かつ型ガードでUserRole型に絞り込み
 */
export function isValidRole(role: string): role is UserRole {
    return Object.values(APP_ROLES).includes(role as UserRole);
}
