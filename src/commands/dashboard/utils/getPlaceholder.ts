import type { ServiceType } from "../types/common.js";

// サービス種別に応じたプレースホルダー文言を取り出す小さなヘルパー。
export function getPlaceholder(service: ServiceType, placeholders: Record<ServiceType, string>): string {
    return placeholders[service];
}

// EOF
