// アプリケーションで使用するロールと権限に関する定義。
export const APP_ROLES = {
    ADMIN: "admin",
    ORG_ADMIN: "org_admin",
    USER: "user",
    _MEMBER: "_member",
    _SPONSOR: "_sponsor",
} as const;

export type AppRole = (typeof APP_ROLES)[keyof typeof APP_ROLES];

export const ROLE_LABELS: Record<AppRole, string> = {
    [APP_ROLES.ADMIN]: "管理ユーザー",
    [APP_ROLES.ORG_ADMIN]: "組織管理ユーザー",
    [APP_ROLES.USER]: "一般ユーザー",
    [APP_ROLES._MEMBER]: "会員",
    [APP_ROLES._SPONSOR]: "スポンサー",
};

// ロールごとの権限設定
export const ROLE_PERMISSIONS = {
    [APP_ROLES.ADMIN]: {
        canManageUsers: true,
        canManageOrganizations: true,
        canViewAllContent: true,
        canManageMembers: true,
        canAccessAnalytics: true,
        canPostContent: true,
        canAccessProfile: true,
    },
    [APP_ROLES.ORG_ADMIN]: {
        canManageUsers: false,
        canManageOrganizations: true,
        canViewAllContent: false,
        canManageMembers: true,
        canAccessAnalytics: true,
        canPostContent: true,
        canAccessProfile: true,
    },
    [APP_ROLES.USER]: {
        canManageUsers: false,
        canManageOrganizations: false,
        canViewAllContent: false,
        canManageMembers: false,
        canAccessAnalytics: false,
        canPostContent: false,
        canAccessProfile: false,
    },
    [APP_ROLES._MEMBER]: {
        canManageUsers: false,
        canManageOrganizations: false,
        canViewAllContent: false,
        canManageMembers: false,
        canAccessAnalytics: false,
        canPostContent: true,
        canAccessProfile: true,
    },
    [APP_ROLES._SPONSOR]: {
        canManageUsers: false,
        canManageOrganizations: false,
        canViewAllContent: false,
        canManageMembers: false,
        canAccessAnalytics: false,
        canPostContent: false,
        canAccessProfile: true,
    },
} as const;

// 未認証のゲストユーザーが利用できる機能
export const GUEST_PERMISSIONS = {
    canViewFeed: true,
    canViewMap: true,
    canSearch: true,
    canPostContent: false,
    canAccessProfile: false,
} as const;

// EOF

// EOF
