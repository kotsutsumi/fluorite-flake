/**
 * Dashboard service definitions and helpers.
 */

export const SERVICE_ORDER = ["vercel", "turso"] as const;

export type ServiceType = (typeof SERVICE_ORDER)[number];

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
    return typeof value === "string" && (SERVICE_ORDER as readonly string[]).includes(value);
}

/**
 * Return the next service in sequence for simple cycling behaviour.
 */
export function getNextService(current: ServiceType): ServiceType {
    const currentIndex = SERVICE_ORDER.indexOf(current);
    const nextIndex = (currentIndex + 1) % SERVICE_ORDER.length;
    return SERVICE_ORDER[nextIndex];
}

// EOF
