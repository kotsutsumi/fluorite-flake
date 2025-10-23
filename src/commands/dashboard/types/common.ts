/**
 * ダッシュボードで扱うサービス識別子と関連ユーティリティをまとめたモジュール。
 */

export const PRIMARY_SERVICES = ["vercel", "turso"] as const;

export type PrimaryService = (typeof PRIMARY_SERVICES)[number];

export type ServiceType = PrimaryService | "logs";

export const SERVICE_ORDER: readonly PrimaryService[] = PRIMARY_SERVICES;

/**
 * 文字列から既知のサービス名に正規化して返す。
 */
export function parseService(value: string | undefined): ServiceType | undefined {
    if (!value) {
        return;
    }

    const normalized = value.trim().toLowerCase();
    return isServiceType(normalized) ? normalized : undefined;
}

/**
 * ダッシュボードで許可しているサービス名かどうかを判定する。
 */
export function isServiceType(value: unknown): value is ServiceType {
    return typeof value === "string" && (value === "logs" || (PRIMARY_SERVICES as readonly string[]).includes(value));
}

// メインサービス（logs を除く）かどうかを判定するガード。
export function isPrimaryService(value: unknown): value is PrimaryService {
    return typeof value === "string" && (PRIMARY_SERVICES as readonly string[]).includes(value);
}

/**
 * サービスの巡回順序に沿って次のサービス識別子を返す。
 */
export function getNextService(current: PrimaryService): PrimaryService {
    const currentIndex = SERVICE_ORDER.indexOf(current);
    const nextIndex = (currentIndex + 1) % SERVICE_ORDER.length;
    return SERVICE_ORDER[nextIndex];
}

// EOF
