import type { ServiceType } from "../types/common.js";

// サービス名と表示ラベルのマッピングから該当ラベルを取得する。
export function getServiceLabel(service: ServiceType, labels: Record<ServiceType, string>): string {
    return labels[service];
}

// EOF
