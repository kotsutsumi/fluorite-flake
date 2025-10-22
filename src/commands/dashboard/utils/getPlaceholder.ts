import type { ServiceType } from "../types/common.js";

export function getPlaceholder(service: ServiceType, placeholders: Record<ServiceType, string>): string {
    return placeholders[service];
}

// EOF
