import type { ServiceType } from "../types/common.js";

export function getServiceLabel(service: ServiceType, labels: Record<ServiceType, string>): string {
    return labels[service];
}

