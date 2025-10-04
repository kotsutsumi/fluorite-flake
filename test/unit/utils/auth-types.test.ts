/**
 * 認可ロール定義と権限判定ユーティリティ (`auth-types`) の整合性を検証するユニットテスト。
 * 役割定数のマッピング、権限セットの取得、ロール文字列のバリデーションが期待どおりに動作するかを確認する。
 */
import { describe, expect, it } from 'vitest';

import { APP_ROLES, getRolePermissions, isValidRole } from '../../../src/utils/auth-types.js';

// ロール定義と権限ユーティリティを検証するテストスイート
describe('auth-types', () => {
    // APP_ROLES 定数が想定どおりのスラッグへマッピングされていることを確認する
    it('maps role constants correctly', () => {
        expect(APP_ROLES.ADMIN).toBe('admin');
        expect(APP_ROLES.ORG_ADMIN).toBe('org_admin');
        expect(APP_ROLES.USER).toBe('user');
    });

    // 各ロールごとの権限セットが期待値どおり返ることを検証する
    it('returns permissions per role', () => {
        expect(getRolePermissions('admin')).toEqual({
            canManageOrganizations: true,
            canManageUsers: true,
            canManageOwnProfile: true,
        });
        expect(getRolePermissions('org_admin')).toMatchObject({
            canManageOrganizations: false,
            canManageUsers: true,
        });
        expect(getRolePermissions('user')).toEqual({
            canManageOrganizations: false,
            canManageUsers: false,
            canManageOwnProfile: true,
        });
    });

    // 有効なロールの判定と不正ロールの除外が機能することを確認する
    it('validates roles', () => {
        expect(isValidRole('admin')).toBe(true);
        expect(isValidRole('invalid')).toBe(false);
    });
});
