/**
 * Enhanced auth types for better type safety
 */

export type UserRole = 'admin' | 'org_admin' | 'user';

export interface AppRoles {
    ADMIN: 'admin';
    ORG_ADMIN: 'org_admin';
    USER: 'user';
}

export const APP_ROLES: AppRoles = {
    ADMIN: 'admin',
    ORG_ADMIN: 'org_admin',
    USER: 'user',
} as const;

export interface RolePermissions {
    canManageOrganizations: boolean;
    canManageUsers: boolean;
    canManageOwnProfile: boolean;
}

export function getRolePermissions(role: UserRole): RolePermissions {
    switch (role) {
        case APP_ROLES.ADMIN:
            return {
                canManageOrganizations: true,
                canManageUsers: true,
                canManageOwnProfile: true,
            };
        case APP_ROLES.ORG_ADMIN:
            return {
                canManageOrganizations: false,
                canManageUsers: true,
                canManageOwnProfile: true,
            };
        case APP_ROLES.USER:
            return {
                canManageOrganizations: false,
                canManageUsers: false,
                canManageOwnProfile: true,
            };
        default:
            // Fallback for unknown roles
            return {
                canManageOrganizations: false,
                canManageUsers: false,
                canManageOwnProfile: true,
            };
    }
}

export function isValidRole(role: string): role is UserRole {
    return Object.values(APP_ROLES).includes(role as UserRole);
}
