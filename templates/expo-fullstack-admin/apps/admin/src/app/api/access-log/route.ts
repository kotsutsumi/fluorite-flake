import { type NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { AccessLogger, type AccessLogData, type DeviceData } from '@/lib/access-logger';
import prisma from '@/lib/db';
import { z } from 'zod';

const accessLogSchema = z.object({
    method: z.string(),
    path: z.string(),
    query: z.string().optional(),
    statusCode: z.number().optional(),
    responseTime: z.number().optional(),
    referrer: z.string().optional(),
    platform: z.string().optional(),
    appVersion: z.string().optional(),
    deviceId: z.string().optional(),
});

const deviceRegisterSchema = z.object({
    deviceId: z.string(),
    platform: z.enum(['ios', 'android', 'web']),
    osVersion: z.string().optional(),
    appVersion: z.string().optional(),
    deviceModel: z.string().optional(),
    deviceName: z.string().optional(),
    pushToken: z.string().optional(),
    timezone: z.string().optional(),
    locale: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

// POST /api/access-log - Log an access event (for mobile apps and authenticated sessions)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (body.type === 'device-register') {
            // Register or update device information
            const deviceData = deviceRegisterSchema.parse(body.device);
            const session = await getSession();

            const deviceInfo: DeviceData = {
                ...deviceData,
                userId: session?.user?.id,
            };

            await AccessLogger.registerOrUpdateDevice(deviceInfo);

            return NextResponse.json({ success: true, message: 'Device registered successfully' });
        }

        if (body.type === 'access-log') {
            // Log access with user context
            const logData = accessLogSchema.parse(body.log);
            const session = await getSession();

            const ipAddress = AccessLogger.getClientIP(request);
            const userAgent = request.headers.get('user-agent') || undefined;

            const accessLogData: AccessLogData = {
                ...logData,
                userId: session?.user?.id,
                sessionId: session?.session?.id,
                ipAddress,
                userAgent,
            };

            await AccessLogger.logAccess(accessLogData);

            return NextResponse.json({ success: true, message: 'Access logged successfully' });
        }

        return NextResponse.json({ error: 'Invalid request type' }, { status: 400 });
    } catch (error) {
        console.error('Access log API error:', error);
        return NextResponse.json({ error: 'Failed to process access log' }, { status: 500 });
    }
}

// GET /api/access-log - Retrieve access logs (admin only)
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user has admin privileges
        if (session.user.role !== 'admin' && session.user.role !== 'org_admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const url = new URL(request.url);
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);
        const offset = parseInt(url.searchParams.get('offset') || '0', 10);
        const platform = url.searchParams.get('platform');
        const userId = url.searchParams.get('userId');
        const startDate = url.searchParams.get('startDate');
        const endDate = url.searchParams.get('endDate');

        interface WhereClause {
            platform?: string;
            userId?: string;
            createdAt?: {
                gte?: Date;
                lte?: Date;
            };
        }

        const where: WhereClause = {};

        if (platform) {
            where.platform = platform;
        }

        if (userId) {
            where.userId = userId;
        }

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = new Date(startDate);
            }
            if (endDate) {
                where.createdAt.lte = new Date(endDate);
            }
        }

        // For org_admin, only show logs from their organization
        // TODO: Implement organization filtering when organization membership is available
        // if (session.user.role === 'org_admin' && session.user.organizationId) {
        //     where.organizationId = session.user.organizationId;
        // }

        const [logs, total] = await Promise.all([
            prisma.accessLog.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    device: {
                        select: {
                            deviceId: true,
                            platform: true,
                            deviceModel: true,
                            appVersion: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma.accessLog.count({ where }),
        ]);

        return NextResponse.json({
            logs,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + limit < total,
            },
        });
    } catch (error) {
        console.error('Failed to fetch access logs:', error);
        return NextResponse.json({ error: 'Failed to fetch access logs' }, { status: 500 });
    }
}
