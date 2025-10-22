/**
 * Dashboard service definitions and helpers.
 */

export const PRIMARY_SERVICES = ["vercel", "turso"] as const;

export type PrimaryService = (typeof PRIMARY_SERVICES)[number];

export type ServiceType = PrimaryService | "logs";

export const SERVICE_ORDER: readonly PrimaryService[] = PRIMARY_SERVICES;

/**
 * Narrow a string into a known service identifier.
 */
export function parseService(value: string | undefined): ServiceType | undefined {
    if (!value) {
        return;
    }

    const normalized = value.trim().toLowerCase();
    return isServiceType(normalized) ? normalized : undefined;
}

/**
 * Type guard for dashboard services.
 */
export function isServiceType(value: unknown): value is ServiceType {
    return typeof value === "string" && (value === "logs" || (PRIMARY_SERVICES as readonly string[]).includes(value));
}

export function isPrimaryService(value: unknown): value is PrimaryService {
    return typeof value === "string" && (PRIMARY_SERVICES as readonly string[]).includes(value);
}

/**
 * Return the next service in sequence for simple cycling behaviour.
 */
export function getNextService(current: PrimaryService): PrimaryService {
    const currentIndex = SERVICE_ORDER.indexOf(current);
    const nextIndex = (currentIndex + 1) % SERVICE_ORDER.length;
    return SERVICE_ORDER[nextIndex];
}

// EOF
