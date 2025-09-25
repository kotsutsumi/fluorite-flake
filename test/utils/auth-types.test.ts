import { describe, expect, it } from 'vitest';

import { APP_ROLES, getRolePermissions, isValidRole } from '../../src/utils/auth-types.js';

describe('auth-types', () => {
    it('maps role constants correctly', () => {
        expect(APP_ROLES.ADMIN).toBe('admin');
        expect(APP_ROLES.ORG_ADMIN).toBe('org_admin');
        expect(APP_ROLES.USER).toBe('user');
    });

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

    it('validates roles', () => {
        expect(isValidRole('admin')).toBe(true);
        expect(isValidRole('invalid')).toBe(false);
    });
});
