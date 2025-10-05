import { GraphQLError } from 'graphql';
import { GraphQLScalarType, Kind } from 'graphql';
import prisma from '@/lib/db';
import { auth } from '@/lib/auth';
import { AccessLogger } from '@/lib/access-logger';
import { APP_ROLES, ROLE_PERMISSIONS } from '@/lib/roles';
import bcrypt from 'bcryptjs';

// Custom DateTime scalar
const DateTimeScalar = new GraphQLScalarType({
    name: 'DateTime',
    description: 'Date custom scalar type',
    serialize(value: unknown) {
        if (value instanceof Date) {
            return value.toISOString();
        }
        throw Error('GraphQL Date Scalar serializer expected a `Date` object');
    },
    parseValue(value: unknown) {
        if (typeof value === 'string') {
            return new Date(value);
        }
        throw new Error('GraphQL Date Scalar parser expected a `string`');
    },
    parseLiteral(ast) {
        if (ast.kind === Kind.STRING) {
            return new Date(ast.value);
        }
        throw new Error('GraphQL Date Scalar parser expected a `string`');
    },
});

interface Context {
    req: Request;
    user?: {
        id: string;
        email: string;
        name?: string;
        role: string;
        organizationId?: string;
    };
    session?: {
        id: string;
        token: string;
        expiresAt: Date;
    };
}

interface DeviceInfo {
    osVersion?: string;
    appVersion?: string;
    deviceModel?: string;
    deviceName?: string;
    pushToken?: string;
    timezone?: string;
    locale?: string;
    metadata?: Record<string, unknown>;
}

interface AccessLogInput {
    method: string;
    path: string;
    query?: string;
    statusCode?: number;
    responseTime?: number;
    referrer?: string;
    platform?: string;
    appVersion?: string;
    deviceId?: string;
}

interface VideoContentInput {
    title: string;
    description?: string;
    contentType?: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    isPublished?: boolean;
}

interface FacilityInput {
    name: string;
    category: string;
    address?: string;
    description?: string;
    imageUrl?: string;
    isFeatured?: boolean;
    isPublished?: boolean;
}

interface UserUpdateData {
    role: string;
    MemberId?: string;
    memberSince?: Date;
    sponsorInfo?: string;
}

// Helper function to check user permissions
function hasPermission(
    user: Context['user'],
    permission: keyof (typeof ROLE_PERMISSIONS)[keyof typeof ROLE_PERMISSIONS]
): boolean {
    if (!user) {
        return false;
    }
    const rolePermissions = ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS];
    if (!rolePermissions) {
        return false;
    }
    return rolePermissions[permission] === true;
}

// Helper function to require authentication
function requireAuth(
    context: Context
): asserts context is Context & { user: NonNullable<Context['user']> } {
    if (!context.user) {
        throw new GraphQLError('Not authenticated', {
            extensions: { code: 'UNAUTHENTICATED' },
        });
    }
}

// Helper function to require specific permission
function requirePermission(
    context: Context,
    permission: keyof (typeof ROLE_PERMISSIONS)[keyof typeof ROLE_PERMISSIONS]
) {
    requireAuth(context);
    if (!hasPermission(context.user, permission)) {
        throw new GraphQLError('Insufficient permissions', {
            extensions: { code: 'FORBIDDEN' },
        });
    }
}

export const resolvers = {
    DateTime: DateTimeScalar,

    Query: {
        me: async (_: unknown, __: unknown, context: Context) => {
            if (!context.user) {
                throw new GraphQLError('Not authenticated', {
                    extensions: { code: 'UNAUTHENTICATED' },
                });
            }

            return await prisma.user.findUnique({
                where: { id: context.user.id },
            });
        },

        myDevices: async (_: unknown, __: unknown, context: Context) => {
            if (!context.user) {
                throw new GraphQLError('Not authenticated', {
                    extensions: { code: 'UNAUTHENTICATED' },
                });
            }

            return await prisma.deviceInfo.findMany({
                where: { userId: context.user.id },
                orderBy: { lastSeenAt: 'desc' },
            });
        },

        accessLogs: async (
            _: unknown,
            args: {
                limit?: number;
                offset?: number;
                platform?: string;
                userId?: string;
                startDate?: Date;
                endDate?: Date;
            },
            context: Context
        ) => {
            if (!context.user) {
                throw new GraphQLError('Not authenticated', {
                    extensions: { code: 'UNAUTHENTICATED' },
                });
            }

            // Only admin and org_admin can view access logs
            if (context.user.role !== 'admin' && context.user.role !== 'org_admin') {
                throw new GraphQLError('Insufficient permissions', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }

            const { limit = 50, offset = 0, platform, userId, startDate, endDate } = args;

            interface AccessLogWhere {
                platform?: string;
                userId?: string;
                organizationId?: string;
                createdAt?: {
                    gte?: Date;
                    lte?: Date;
                };
            }

            const where: AccessLogWhere = {};

            if (platform) {
                where.platform = platform;
            }

            if (userId) {
                where.userId = userId;
            }

            if (startDate || endDate) {
                where.createdAt = {};
                if (startDate) {
                    where.createdAt.gte = startDate;
                }
                if (endDate) {
                    where.createdAt.lte = endDate;
                }
            }

            // For org_admin, only show logs from their organization
            if (context.user.role === 'org_admin' && context.user.organizationId) {
                where.organizationId = context.user.organizationId;
            }

            const [logs, totalCount] = await Promise.all([
                prisma.accessLog.findMany({
                    where,
                    include: {
                        user: true,
                        device: true,
                    },
                    orderBy: { createdAt: 'desc' },
                    take: Math.min(limit, 100),
                    skip: offset,
                }),
                prisma.accessLog.count({ where }),
            ]);

            return {
                logs,
                totalCount,
                hasNextPage: offset + limit < totalCount,
            };
        },

        accessStats: async (_: unknown, __: unknown, context: Context) => {
            if (!context.user) {
                throw new GraphQLError('Not authenticated', {
                    extensions: { code: 'UNAUTHENTICATED' },
                });
            }

            if (context.user.role !== 'admin' && context.user.role !== 'org_admin') {
                throw new GraphQLError('Insufficient permissions', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }

            interface StatsWhere {
                organizationId?: string;
            }

            const whereClause: StatsWhere = {};

            // For org_admin, only show stats from their organization
            if (context.user.role === 'org_admin' && context.user.organizationId) {
                whereClause.organizationId = context.user.organizationId;
            }

            const [
                totalAccesses,
                uniqueUsers,
                uniqueDevices,
                platformStats,
                recentActivity,
                hourlyStats,
            ] = await Promise.all([
                prisma.accessLog.count({ where: whereClause }),
                prisma.accessLog
                    .groupBy({
                        by: ['userId'],
                        where: { ...whereClause, userId: { not: null } },
                        _count: true,
                    })
                    .then((result) => result.length),
                prisma.accessLog
                    .groupBy({
                        by: ['deviceId'],
                        where: { ...whereClause, deviceId: { not: null } },
                        _count: true,
                    })
                    .then((result) => result.length),
                prisma.accessLog.groupBy({
                    by: ['platform'],
                    where: { ...whereClause, platform: { not: null } },
                    _count: { platform: true },
                }),
                prisma.accessLog.findMany({
                    where: whereClause,
                    include: { user: true, device: true },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                }),
                prisma.$queryRaw<{ hour: number; count: number }[]>`
                    SELECT
                        CAST(strftime('%H', createdAt) AS INTEGER) as hour,
                        COUNT(*) as count
                    FROM AccessLog
                    WHERE createdAt >= datetime('now', '-24 hours')
                    ${
                        context.user.role === 'org_admin' && context.user.organizationId
                            ? prisma.$queryRaw`AND organizationId = ${context.user.organizationId}`
                            : prisma.$queryRaw``
                    }
                    GROUP BY hour
                    ORDER BY hour
                `,
            ]);

            const totalPlatformCount = platformStats.reduce(
                (sum, stat) => sum + stat._count.platform,
                0
            );

            const topPlatforms = platformStats.map((stat) => ({
                platform: stat.platform || 'unknown',
                count: stat._count.platform,
                percentage:
                    totalPlatformCount > 0 ? (stat._count.platform / totalPlatformCount) * 100 : 0,
            }));

            return {
                totalAccesses,
                uniqueUsers,
                uniqueDevices,
                topPlatforms,
                recentActivity,
                hourlyStats,
            };
        },

        //  Video Content Queries
        videoContent: async (
            _: unknown,
            args: {
                filter?: {
                    contentType?: string;
                    authorId?: string;
                    isPublished?: boolean;
                    limit?: number;
                    offset?: number;
                };
            },
            context: Context
        ) => {
            const {
                contentType,
                authorId,
                isPublished,
                limit = 20,
                offset = 0,
            } = args.filter || {};

            interface VideoContentWhere {
                contentType?: string;
                authorId?: string;
                isPublished?: boolean;
            }

            const where: VideoContentWhere = {};

            if (contentType) {
                where.contentType = contentType;
            }

            if (authorId) {
                where.authorId = authorId;
            }

            // Only show published content unless user is admin or content owner
            if (isPublished !== undefined) {
                where.isPublished = isPublished;
            } else if (!context.user || !hasPermission(context.user, 'canViewAllContent')) {
                where.isPublished = true;
            }

            return await prisma.videoContent.findMany({
                where,
                include: { author: true },
                orderBy: { createdAt: 'desc' },
                take: Math.min(limit, 50),
                skip: offset,
            });
        },

        videoContentById: async (_: unknown, args: { id: string }, context: Context) => {
            const videoContent = await prisma.videoContent.findUnique({
                where: { id: args.id },
                include: { author: true },
            });

            if (!videoContent) {
                return null;
            }

            // Check if user can view this content
            if (
                !videoContent.isPublished &&
                (!context.user ||
                    (videoContent.authorId !== context.user.id &&
                        !hasPermission(context.user, 'canViewAllContent')))
            ) {
                return null;
            }

            return videoContent;
        },

        //  Facilities Queries
        facilities: async (
            _: unknown,
            args: {
                filter?: {
                    category?: string;
                    ownerId?: string;
                    isPublished?: boolean;
                    isFeatured?: boolean;
                    limit?: number;
                    offset?: number;
                };
            },
            context: Context
        ) => {
            const {
                category,
                ownerId,
                isPublished,
                isFeatured,
                limit = 20,
                offset = 0,
            } = args.filter || {};

            interface FacilityWhere {
                category?: string;
                ownerId?: string;
                isPublished?: boolean;
                isFeatured?: boolean;
            }

            const where: FacilityWhere = {};

            if (category) {
                where.category = category;
            }

            if (ownerId) {
                where.ownerId = ownerId;
            }

            if (isFeatured !== undefined) {
                where.isFeatured = isFeatured;
            }

            // Only show published facilities unless user is admin or facility owner
            if (isPublished !== undefined) {
                where.isPublished = isPublished;
            } else if (!context.user || !hasPermission(context.user, 'canManageSponsorContent')) {
                where.isPublished = true;
            }

            return await prisma.facility.findMany({
                where,
                include: { owner: true },
                orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
                take: Math.min(limit, 50),
                skip: offset,
            });
        },

        facilityById: async (_: unknown, args: { id: string }, context: Context) => {
            const facility = await prisma.facility.findUnique({
                where: { id: args.id },
                include: { owner: true },
            });

            if (!facility) {
                return null;
            }

            // Check if user can view this facility
            if (
                !facility.isPublished &&
                (!context.user ||
                    (facility.ownerId !== context.user.id &&
                        !hasPermission(context.user, 'canManageSponsorContent')))
            ) {
                return null;
            }

            return facility;
        },

        //  Member Management Queries (Admin only)
        Members: async (
            _: unknown,
            args: { limit?: number; offset?: number },
            context: Context
        ) => {
            requirePermission(context, 'canManageMembers');

            const { limit = 50, offset = 0 } = args;

            return await prisma.user.findMany({
                where: {
                    role: APP_ROLES._MEMBER,
                    isActive: true,
                },
                orderBy: { memberSince: 'desc' },
                take: Math.min(limit, 100),
                skip: offset,
            });
        },

        Sponsors: async (
            _: unknown,
            args: { limit?: number; offset?: number },
            context: Context
        ) => {
            requirePermission(context, 'canManageSponsorContent');

            const { limit = 50, offset = 0 } = args;

            return await prisma.user.findMany({
                where: {
                    role: APP_ROLES._SPONSOR,
                    isActive: true,
                },
                orderBy: { createdAt: 'desc' },
                take: Math.min(limit, 100),
                skip: offset,
            });
        },
    },

    User: {
        memberships: async (parent: { id: string }) => {
            const memberships = await prisma.member.findMany({
                where: { userId: parent.id },
                include: { organization: true },
            });

            return memberships.map((membership) => ({
                id: membership.id,
                role: membership.role,
                organization: membership.organization
                    ? {
                          id: membership.organization.id,
                          name: membership.organization.name,
                      }
                    : null,
            }));
        },
    },

    Mutation: {
        login: async (
            _: unknown,
            args: {
                input: {
                    email: string;
                    password: string;
                    deviceId?: string;
                    platform?: string;
                    deviceInfo?: DeviceInfo;
                };
            },
            context: Context
        ) => {
            const { email, password, deviceId, platform, deviceInfo } = args.input;

            // Find user by email
            const user = await prisma.user.findUnique({
                where: { email },
                include: { accounts: true },
            });

            if (!user) {
                throw new GraphQLError('Invalid credentials', {
                    extensions: { code: 'UNAUTHENTICATED' },
                });
            }

            // Verify password using BetterAuth
            const account = user.accounts.find((acc) => acc.providerId === 'credential');
            if (!account?.password) {
                throw new GraphQLError('Invalid credentials', {
                    extensions: { code: 'UNAUTHENTICATED' },
                });
            }

            const isValid = await bcrypt.compare(password, account.password);
            if (!isValid) {
                throw new GraphQLError('Invalid credentials', {
                    extensions: { code: 'UNAUTHENTICATED' },
                });
            }

            // Create session using BetterAuth
            const sessionResult = await auth.api.signInEmail({
                body: { email, password },
                // BetterAuth expects Headers but type system sees Next.js Headers
                headers: context.req.headers,
            });

            if (!sessionResult) {
                throw new GraphQLError('Failed to create session', {
                    extensions: { code: 'UNAUTHENTICATED' },
                });
            }

            // Register device if provided
            if (deviceId && platform && deviceInfo) {
                await AccessLogger.registerOrUpdateDevice({
                    deviceId,
                    platform,
                    userId: user.id,
                    ...deviceInfo,
                });
            }

            // Log the login access
            await AccessLogger.logAccess({
                method: 'POST',
                path: '/graphql/login',
                platform: platform || 'unknown',
                userId: user.id,
                deviceId,
            });

            return {
                token: sessionResult.token,
                user,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            };
        },

        register: async (
            _: unknown,
            args: {
                input: {
                    email: string;
                    password: string;
                    name?: string;
                    deviceId?: string;
                    platform?: string;
                    deviceInfo?: DeviceInfo;
                };
            },
            context: Context
        ) => {
            const { email, password, name, deviceId, platform, deviceInfo } = args.input;

            // Check if user already exists
            const existingUser = await prisma.user.findUnique({
                where: { email },
            });

            if (existingUser) {
                throw new GraphQLError('User already exists', {
                    extensions: { code: 'BAD_USER_INPUT' },
                });
            }

            // Create user using BetterAuth
            const result = await auth.api.signUpEmail({
                body: { email, password, name: name || '' },
                // BetterAuth expects Headers but type system sees Next.js Headers
                headers: context.req.headers,
            });

            if (!result) {
                throw new Error('Failed to create user');
            }

            // Register device if provided
            if (deviceId && platform && deviceInfo) {
                await AccessLogger.registerOrUpdateDevice({
                    deviceId,
                    platform,
                    userId: result.user.id,
                    ...deviceInfo,
                });
            }

            // Log the registration access
            await AccessLogger.logAccess({
                method: 'POST',
                path: '/graphql/register',
                platform: platform || 'unknown',
                userId: result.user.id,
                deviceId,
            });

            return {
                token: result.token,
                user: result.user,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            };
        },

        logout: async (_: unknown, __: unknown, context: Context) => {
            if (!context.session) {
                return true;
            }

            await auth.api.signOut({
                // BetterAuth expects Headers but type system sees Next.js Headers
                headers: context.req.headers,
            });

            return true;
        },

        registerDevice: async (
            _: unknown,
            args: {
                deviceInfo: DeviceInfo;
                deviceId: string;
                platform: string;
            },
            context: Context
        ) => {
            await AccessLogger.registerOrUpdateDevice({
                deviceId: args.deviceId,
                platform: args.platform,
                userId: context.user?.id,
                ...args.deviceInfo,
            });

            return await prisma.deviceInfo.findUnique({
                where: { deviceId: args.deviceId },
            });
        },

        updateDevice: async (
            _: unknown,
            args: {
                deviceId: string;
                deviceInfo: DeviceInfo;
            },
            context: Context
        ) => {
            const device = await prisma.deviceInfo.findUnique({
                where: { deviceId: args.deviceId },
            });

            if (!device) {
                throw new GraphQLError('Device not found', {
                    extensions: { code: 'BAD_USER_INPUT' },
                });
            }

            if (device.userId !== context.user?.id && context.user?.role !== 'admin') {
                throw new GraphQLError('Not authorized to update this device', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }

            return await prisma.deviceInfo.update({
                where: { deviceId: args.deviceId },
                data: {
                    ...args.deviceInfo,
                    lastSeenAt: new Date(),
                },
            });
        },

        updatePushToken: async (
            _: unknown,
            args: {
                deviceId: string;
                pushToken: string;
            },
            _context: Context
        ) => {
            return await prisma.deviceInfo.update({
                where: { deviceId: args.deviceId },
                data: {
                    pushToken: args.pushToken,
                    lastSeenAt: new Date(),
                },
            });
        },

        logAccess: async (_: unknown, args: { input: AccessLogInput }, context: Context) => {
            await AccessLogger.logAccess({
                ...args.input,
                userId: context.user?.id,
                sessionId: context.session?.id,
            });

            return true;
        },

        //  Member Management (Admin only)
        assignMember: async (
            _: unknown,
            args: { input: { userId: string; MemberId: string; memberSince?: Date } },
            context: Context
        ) => {
            requirePermission(context, 'canManageMembers');

            const { userId, MemberId, memberSince } = args.input;

            // Check if  member ID is already assigned
            const existingMember = await prisma.user.findUnique({
                where: { MemberId },
            });

            if (existingMember && existingMember.id !== userId) {
                throw new GraphQLError(' Member ID already assigned to another user', {
                    extensions: { code: 'BAD_USER_INPUT' },
                });
            }

            return await prisma.user.update({
                where: { id: userId },
                data: {
                    role: APP_ROLES._MEMBER,
                    MemberId,
                    memberSince: memberSince || new Date(),
                },
            });
        },

        updateUserRole: async (
            _: unknown,
            args: {
                input: { userId: string; role: string; MemberId?: string; sponsorInfo?: string };
            },
            context: Context
        ) => {
            requirePermission(context, 'canManageUsers');

            const { userId, role, MemberId, sponsorInfo } = args.input;

            // Validate role
            if (!Object.values(APP_ROLES).includes(role as keyof typeof APP_ROLES)) {
                throw new GraphQLError('Invalid role', {
                    extensions: { code: 'BAD_USER_INPUT' },
                });
            }

            const updateData: UserUpdateData = { role };

            if (role === APP_ROLES._MEMBER && MemberId) {
                updateData.MemberId = MemberId;
                updateData.memberSince = new Date();
            }

            if (role === APP_ROLES._SPONSOR && sponsorInfo) {
                updateData.sponsorInfo = sponsorInfo;
            }

            return await prisma.user.update({
                where: { id: userId },
                data: updateData,
            });
        },

        deactivateUser: async (_: unknown, args: { userId: string }, context: Context) => {
            requirePermission(context, 'canManageUsers');

            return await prisma.user.update({
                where: { id: args.userId },
                data: { isActive: false },
            });
        },

        reactivateUser: async (_: unknown, args: { userId: string }, context: Context) => {
            requirePermission(context, 'canManageUsers');

            return await prisma.user.update({
                where: { id: args.userId },
                data: { isActive: true },
            });
        },

        // Video Content Management
        createVideoContent: async (
            _: unknown,
            args: { input: VideoContentInput },
            context: Context
        ) => {
            requireAuth(context);

            // Check if user can post content
            if (!hasPermission(context.user, 'canPostContent')) {
                throw new GraphQLError('Not authorized to post content', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }

            return await prisma.videoContent.create({
                data: {
                    ...args.input,
                    authorId: context.user.id,
                },
                include: { author: true },
            });
        },

        updateVideoContent: async (
            _: unknown,
            args: { id: string; input: VideoContentInput },
            context: Context
        ) => {
            requireAuth(context);

            const videoContent = await prisma.videoContent.findUnique({
                where: { id: args.id },
            });

            if (!videoContent) {
                throw new GraphQLError('Video content not found', {
                    extensions: { code: 'NOT_FOUND' },
                });
            }

            // Check ownership or admin permission
            if (
                videoContent.authorId !== context.user.id &&
                !hasPermission(context.user, 'canViewAllContent')
            ) {
                throw new GraphQLError('Not authorized to update this content', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }

            return await prisma.videoContent.update({
                where: { id: args.id },
                data: args.input,
                include: { author: true },
            });
        },

        publishVideoContent: async (
            _: unknown,
            args: { id: string; published: boolean },
            context: Context
        ) => {
            requireAuth(context);

            const videoContent = await prisma.videoContent.findUnique({
                where: { id: args.id },
            });

            if (!videoContent) {
                throw new GraphQLError('Video content not found', {
                    extensions: { code: 'NOT_FOUND' },
                });
            }

            // Check ownership or admin permission
            if (
                videoContent.authorId !== context.user.id &&
                !hasPermission(context.user, 'canViewAllContent')
            ) {
                throw new GraphQLError('Not authorized to publish this content', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }

            return await prisma.videoContent.update({
                where: { id: args.id },
                data: {
                    isPublished: args.published,
                    publishedAt: args.published ? new Date() : null,
                },
                include: { author: true },
            });
        },

        deleteVideoContent: async (_: unknown, args: { id: string }, context: Context) => {
            requireAuth(context);

            const videoContent = await prisma.videoContent.findUnique({
                where: { id: args.id },
            });

            if (!videoContent) {
                throw new GraphQLError('Video content not found', {
                    extensions: { code: 'NOT_FOUND' },
                });
            }

            // Check ownership or admin permission
            if (
                videoContent.authorId !== context.user.id &&
                !hasPermission(context.user, 'canViewAllContent')
            ) {
                throw new GraphQLError('Not authorized to delete this content', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }

            await prisma.videoContent.delete({
                where: { id: args.id },
            });

            return true;
        },

        // Facility Management
        createFacility: async (_: unknown, args: { input: FacilityInput }, context: Context) => {
            requireAuth(context);

            // Check if user can manage facilities
            if (!hasPermission(context.user, 'canManageFacilities')) {
                throw new GraphQLError('Not authorized to create facilities', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }

            return await prisma.facility.create({
                data: {
                    ...args.input,
                    ownerId: context.user.id,
                },
                include: { owner: true },
            });
        },

        updateFacility: async (
            _: unknown,
            args: { id: string; input: FacilityInput },
            context: Context
        ) => {
            requireAuth(context);

            const facility = await prisma.facility.findUnique({
                where: { id: args.id },
            });

            if (!facility) {
                throw new GraphQLError('Facility not found', {
                    extensions: { code: 'NOT_FOUND' },
                });
            }

            // Check ownership or admin permission
            if (
                facility.ownerId !== context.user.id &&
                !hasPermission(context.user, 'canManageSponsorContent')
            ) {
                throw new GraphQLError('Not authorized to update this facility', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }

            return await prisma.facility.update({
                where: { id: args.id },
                data: args.input,
                include: { owner: true },
            });
        },

        publishFacility: async (
            _: unknown,
            args: { id: string; published: boolean },
            context: Context
        ) => {
            requireAuth(context);

            const facility = await prisma.facility.findUnique({
                where: { id: args.id },
            });

            if (!facility) {
                throw new GraphQLError('Facility not found', {
                    extensions: { code: 'NOT_FOUND' },
                });
            }

            // Check ownership or admin permission
            if (
                facility.ownerId !== context.user.id &&
                !hasPermission(context.user, 'canManageSponsorContent')
            ) {
                throw new GraphQLError('Not authorized to publish this facility', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }

            return await prisma.facility.update({
                where: { id: args.id },
                data: {
                    isPublished: args.published,
                    publishedAt: args.published ? new Date() : null,
                },
                include: { owner: true },
            });
        },

        deleteFacility: async (_: unknown, args: { id: string }, context: Context) => {
            requireAuth(context);

            const facility = await prisma.facility.findUnique({
                where: { id: args.id },
            });

            if (!facility) {
                throw new GraphQLError('Facility not found', {
                    extensions: { code: 'NOT_FOUND' },
                });
            }

            // Check ownership or admin permission
            if (
                facility.ownerId !== context.user.id &&
                !hasPermission(context.user, 'canManageSponsorContent')
            ) {
                throw new GraphQLError('Not authorized to delete this facility', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }

            await prisma.facility.delete({
                where: { id: args.id },
            });

            return true;
        },
    },

    // New resolvers for VideoContent and Facility types
    VideoContent: {
        author: async (parent: { authorId: string }) => {
            return await prisma.user.findUnique({
                where: { id: parent.authorId },
            });
        },
    },

    Facility: {
        owner: async (parent: { ownerId: string }) => {
            return await prisma.user.findUnique({
                where: { id: parent.ownerId },
            });
        },
    },
};
