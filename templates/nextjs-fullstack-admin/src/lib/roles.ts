export const APP_ROLES = {
    ADMIN: 'admin',
    ORG_ADMIN: 'org_admin',
    USER: 'user',
    _MEMBER: '_member',
    _SPONSOR: '_sponsor',
} as const;

export type AppRole = (typeof APP_ROLES)[keyof typeof APP_ROLES];

export const ROLE_LABELS: Record<AppRole, string> = {
    [APP_ROLES.ADMIN]: '管理ユーザー',
    [APP_ROLES.ORG_ADMIN]: '組織管理ユーザー',
    [APP_ROLES.USER]: '一般ユーザー',
    [APP_ROLES._MEMBER]: '会員',
    [APP_ROLES._SPONSOR]: 'スポンサー',
};

// User permissions by role
export const ROLE_PERMISSIONS = {
    [APP_ROLES.ADMIN]: {
        canManageUsers: true,
        canManageOrganizations: true,
        canViewAllContent: true,
        canManageMembers: true,
        canManageSponsorContent: true,
        canAccessAnalytics: true,
        canPostContent: true,
        canAccessProfile: true,
        canPostCommercialContent: true,
        canManageFacilities: true,
    },
    [APP_ROLES.ORG_ADMIN]: {
        canManageUsers: false,
        canManageOrganizations: true,
        canViewAllContent: false,
        canManageMembers: true,
        canManageSponsorContent: true,
        canAccessAnalytics: true,
        canPostContent: true,
        canAccessProfile: true,
        canPostCommercialContent: false,
        canManageFacilities: false,
    },
    [APP_ROLES.USER]: {
        canManageUsers: false,
        canManageOrganizations: false,
        canViewAllContent: false,
        canManageMembers: false,
        canManageSponsorContent: false,
        canAccessAnalytics: false,
        canPostContent: false,
        canAccessProfile: false,
        canPostCommercialContent: false,
        canManageFacilities: false,
    },
    [APP_ROLES._MEMBER]: {
        canManageUsers: false,
        canManageOrganizations: false,
        canViewAllContent: false,
        canManageMembers: false,
        canManageSponsorContent: false,
        canAccessAnalytics: false,
        canPostContent: true,
        canAccessProfile: true,
        canPostCommercialContent: false,
        canManageFacilities: false,
    },
    [APP_ROLES._SPONSOR]: {
        canManageUsers: false,
        canManageOrganizations: false,
        canViewAllContent: false,
        canManageMembers: false,
        canManageSponsorContent: false,
        canAccessAnalytics: false,
        canPostContent: true,
        canAccessProfile: true,
        canPostCommercialContent: true,
        canManageFacilities: true,
    },
} as const;

// Guest user capabilities (no authentication required)
export const GUEST_PERMISSIONS = {
    canViewFeed: true,
    canViewMap: true,
    canSearch: true,
    canPostContent: false,
    canAccessProfile: false,
} as const;
