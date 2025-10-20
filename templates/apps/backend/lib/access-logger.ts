/**
 * アクセスログ記録やデバイス登録に関するユーティリティ群。
 * - REST / GraphQL から呼び出してユーザーアクセスを永続化
 * - Expo/ネイティブアプリ用のデバイス情報を upsert
 * - User-Agent からプラットフォーム / バージョンを推測
 */
import { headers } from "next/headers";
import type { NextRequest } from "next/server";

import prisma from "@/lib/db";
import { logger } from "@/lib/logger";

const EXPO_VERSION_REGEX = /Expo\/(\d+\.\d+\.\d+)/;
const FLUORITE_VERSION_REGEX = /FluoriteFlake\/(\d+\.\d+\.\d+)/;

export type AccessLogData = {
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
};

export type DeviceData = {
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
};

/**
 * アクセス情報を `accessLog` テーブルに記録する。
 * 失敗しても呼び出し元の処理を止めないよう、catch ではログのみ残す。
 */
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
    // メインのリクエスト処理を壊さないようエラーを記録するだけにとどめる
    logger.error("Failed to log access:", error);
  }
}

/**
 * DeviceInfo テーブルにデバイス情報を登録 (存在すれば更新) する。
 * - Expo アプリから送信された pushToken や OS バージョンを保持
 * - 同一 deviceId の場合は lastSeenAt を更新し、最新情報を反映
 */
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
    logger.error("Failed to register/update device:", error);
  }
}

/**
 * User-Agent 文字列から推定されるプラットフォーム (ios / android / web / unknown) を返す。
 */
export function extractPlatform(userAgent?: string): string {
  if (!userAgent) {
    return "unknown";
  }

  const ua = userAgent.toLowerCase();

  if (ua.includes("mobile") || ua.includes("android")) {
    return "android";
  }
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ios")) {
    return "ios";
  }
  if (ua.includes("expo")) {
    return ua.includes("android") ? "android" : "ios";
  }

  return "web";
}

/**
 * Expo またはカスタムクライアントの User-Agent からアプリバージョンを抽出する。
 */
export function extractAppVersion(userAgent?: string): string | undefined {
  if (!userAgent) {
    return;
  }

  // Expo アプリのユーザーエージェント (例: "Expo/1.0.0 ...") からバージョンを抽出する
  const expoMatch = userAgent.match(EXPO_VERSION_REGEX);
  if (expoMatch) {
    return expoMatch[1];
  }

  // カスタムアプリのユーザーエージェントからバージョンを抽出する
  const appMatch = userAgent.match(FLUORITE_VERSION_REGEX);
  if (appMatch) {
    return appMatch[1];
  }

  return;
}

/**
 * Next.js のリクエストヘッダーからクライアント IP を推定する。
 * - 先頭の x-forwarded-for を優先
 * - Cloudflare / Vercel の既定ヘッダーもフォールバックとして利用
 */
export function getClientIP(request: NextRequest): string | undefined {
  // IP アドレスを取得するために複数のヘッダーを確認する
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  const cfConnectingIP = request.headers.get("cf-connecting-ip");

  if (forwarded) {
    // x-forwarded-for には複数の IP が含まれるため、最初の空でない値を採用する
    const [rawFirst] = forwarded.split(",");
    const trimmed = rawFirst?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  if (realIP) {
    return realIP;
  }

  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // NextRequest には ip プロパティがないため、フォールバックとして undefined を返す
  return;
}

/**
 * 簡易的なジオロケーション情報を返す。
 * 実運用ではサードパーティ API を利用する前提で、ここではローカル IP を示すのみ。
 */
export function getGeoLocation(ip?: string): { country?: string; city?: string } {
  // ひとまず空データを返す。実運用では以下のようなサービスの利用を検討する:
  // - Vercel の Geolocation API
  // - CloudFlare の Geolocation
  // - MaxMind GeoIP
  // - ipapi.co

  if (!ip || ip === "127.0.0.1" || ip === "::1") {
    return { country: "Local", city: "Local" };
  }

  // プレースホルダー実装として空データを返す。
  // 実際のジオロケーションが必要ならここを置き換える。
  return {};
}

type RequestHeaderLog = {
  method: string;
  path: string;
  statusCode?: number;
  responseTime?: number;
  additionalData?: Partial<AccessLogData>;
};

/**
 * Next.js の `headers()` API から取得できるメタ情報を基にアクセスログを作成する。
 * API Route / Route Handler などで呼び出すことを想定。
 */
export async function logRequestFromHeaders({
  method,
  path,
  statusCode,
  responseTime,
  additionalData,
}: RequestHeaderLog): Promise<void> {
  try {
    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || undefined;
    const referrer = headersList.get("referer") || undefined;
    const deviceId = headersList.get("x-device-id") || undefined;
    const _sessionToken = headersList.get("x-session-token") || undefined;

    // Extract IP from Vercel headers
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIP = headersList.get("x-real-ip") ?? undefined;
    const cfConnectingIP = headersList.get("cf-connecting-ip") ?? undefined;

    // Forwarded ヘッダーには複数 IP が入る場合があるため、最初に見つかった有効な値を採用
    const forwardedIp = forwardedFor
      ? forwardedFor
          .split(",")
          .map((value) => value.trim())
          .find((value) => value.length > 0)
      : undefined;

    const ipAddress = forwardedIp ?? realIP ?? cfConnectingIP;

    const platform = extractPlatform(userAgent);
    const appVersion = extractAppVersion(userAgent);
    const geoData = getGeoLocation(ipAddress || undefined);

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
    logger.error("Failed to log request from headers:", error);
  }
}
// 既存コードとの互換性のためにクラス風インターフェースを維持する
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

// EOF
