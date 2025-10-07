import { headers } from 'next/headers';
import type { NextRequest } from 'next/server';

import prisma from '@/lib/db';

export interface AccessLogData {
    userId?: string;
    sessionId?: string;
    deviceId?: string;
    ipAddress?: string;
    userAgent?: string;
    method: string;
    path: string;
    query?: string;
    statusCode?: number;
    responseTime?: number;
    referrer?: string;
    country?: string;
    city?: string;
    platform?: string;
    appVersion?: string;
    organizationId?: string;
}

export interface DeviceData {
    deviceId: string;
    platform: string;
    osVersion?: string;
    appVersion?: string;
    deviceModel?: string;
    deviceName?: string;
    pushToken?: string;
    timezone?: string;
    locale?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
}

export async function logAccess(data: AccessLogData): Promise<void> {
    try {
        await prisma.accessLog.create({
            data: {
                userId: data.userId || null,
                sessionId: data.sessionId || null,
                deviceId: data.deviceId || null,
                ipAddress: data.ipAddress || null,
                userAgent: data.userAgent || null,
                method: data.method,
                path: data.path,
                query: data.query || null,
                statusCode: data.statusCode || null,
                responseTime: data.responseTime || null,
                referrer: data.referrer || null,
                country: data.country || null,
                city: data.city || null,
                platform: data.platform || null,
                appVersion: data.appVersion || null,
                organizationId: data.organizationId || null,
            },
        });
    } catch (error) {
        // Log error but don't throw to avoid breaking the main request
        console.error('Failed to log access:', error);
    }
}

export async function registerOrUpdateDevice(deviceData: DeviceData): Promise<void> {
    try {
        await prisma.deviceInfo.upsert({
            where: { deviceId: deviceData.deviceId },
            update: {
                osVersion: deviceData.osVersion,
                appVersion: deviceData.appVersion,
                deviceModel: deviceData.deviceModel,
                deviceName: deviceData.deviceName,
                pushToken: deviceData.pushToken,
                timezone: deviceData.timezone,
                locale: deviceData.locale,
                userId: deviceData.userId,
                lastSeenAt: new Date(),
                metadata: deviceData.metadata ? JSON.stringify(deviceData.metadata) : null,
            },
            create: {
                deviceId: deviceData.deviceId,
                platform: deviceData.platform,
                osVersion: deviceData.osVersion,
                appVersion: deviceData.appVersion,
                deviceModel: deviceData.deviceModel,
                deviceName: deviceData.deviceName,
                pushToken: deviceData.pushToken,
                timezone: deviceData.timezone,
                locale: deviceData.locale,
                userId: deviceData.userId,
                metadata: deviceData.metadata ? JSON.stringify(deviceData.metadata) : null,
            },
        });
    } catch (error) {
        console.error('Failed to register/update device:', error);
    }
}

export function extractPlatform(userAgent?: string): string {
    if (!userAgent) {
        return 'unknown';
    }

    const ua = userAgent.toLowerCase();

    if (ua.includes('mobile') || ua.includes('android')) {
        return 'android';
    }
    if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) {
        return 'ios';
    }
    if (ua.includes('expo')) {
        return ua.includes('android') ? 'android' : 'ios';
    }

    return 'web';
}

export function extractAppVersion(userAgent?: string): string | undefined {
    if (!userAgent) {
        return undefined;
    }

    // Extract version from Expo app user agent: "Expo/1.0.0 ..."
    const expoMatch = userAgent.match(/Expo\/(\d+\.\d+\.\d+)/);
    if (expoMatch) {
        return expoMatch[1];
    }

    // Extract version from custom app user agent
    const appMatch = userAgent.match(/FluoriteFlake\/(\d+\.\d+\.\d+)/);
    if (appMatch) {
        return appMatch[1];
    }

    return undefined;
}

export function getClientIP(request: NextRequest): string | undefined {
    // Try various headers for IP address
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip');

    if (forwarded) {
        // x-forwarded-for can contain multiple IPs, take the first one
        return forwarded.split(',')[0].trim();
    }

    if (realIP) {
        return realIP;
    }

    if (cfConnectingIP) {
        return cfConnectingIP;
    }

    // NextRequest doesn't have an ip property, return undefined as fallback
    return undefined;
}

export async function getGeoLocation(ip?: string): Promise<{ country?: string; city?: string }> {
    // For now, return empty object. In production, you might want to use a service like:
    // - Vercel's geolocation API
    // - CloudFlare's geolocation
    // - MaxMind GeoIP
    // - ipapi.co

    if (!ip || ip === '127.0.0.1' || ip === '::1') {
        return { country: 'Local', city: 'Local' };
    }

    try {
        // Example with ipapi.co (you might want to add rate limiting and error handling)
        // const response = await fetch(`https://ipapi.co/${ip}/json/`);
        // const data = await response.json();
        // return { country: data.country_name, city: data.city };

        return {};
    } catch {
        return {};
    }
}

export async function logRequestFromHeaders(
    method: string,
    path: string,
    statusCode?: number,
    responseTime?: number,
    additionalData?: Partial<AccessLogData>
): Promise<void> {
    try {
        const headersList = await headers();
        const userAgent = headersList.get('user-agent') || undefined;
        const referrer = headersList.get('referer') || undefined;
        const deviceId = headersList.get('x-device-id') || undefined;
        const _sessionToken = headersList.get('x-session-token') || undefined;

        // Extract IP from Vercel headers
        const forwardedFor = headersList.get('x-forwarded-for');
        const realIP = headersList.get('x-real-ip');
        const cfConnectingIP = headersList.get('cf-connecting-ip');

        const ipAddress = forwardedFor?.split(',')[0].trim() || realIP || cfConnectingIP;

        const platform = extractPlatform(userAgent);
        const appVersion = extractAppVersion(userAgent);
        const geoData = await getGeoLocation(ipAddress || undefined);

        const logData: AccessLogData = {
            method,
            path,
            statusCode,
            responseTime,
            ipAddress: ipAddress || undefined,
            userAgent,
            referrer,
            platform,
            appVersion,
            country: geoData.country,
            city: geoData.city,
            deviceId,
            ...additionalData,
        };

        await logAccess(logData);
    } catch (error) {
        console.error('Failed to log request from headers:', error);
    }
}
// Legacy class wrapper for backward compatibility
export const AccessLogger = {
    logAccess,
    registerOrUpdateDevice,
    extractPlatform,
    extractAppVersion,
    getClientIP,
    getGeoLocation,
    logRequestFromHeaders,
};

export default AccessLogger;
