/**
 * Vercelサービスアダプター型定義
 *
 * Vercelプラットフォーム固有のインターフェース定義
 */

import type { ServiceConfig } from '../../base-service-adapter/index.js';

/**
 * Vercelプロジェクト情報
 */
export interface VercelProject {
    id: string;
    name: string;
    framework: string | null;
    link?: {
        type: string;
        repo: string;
    };
    createdAt: number;
    updatedAt: number;
}

/**
 * Vercelデプロイメント情報
 */
export interface VercelDeployment {
    uid: string;
    url: string;
    name: string;
    state: 'BUILDING' | 'ERROR' | 'INITIALIZING' | 'QUEUED' | 'READY' | 'CANCELED';
    type: 'LAMBDAS';
    creator: {
        uid: string;
        email: string;
        username: string;
    };
    createdAt: number;
    ready: number;
    buildingAt?: number;
}

/**
 * Vercelドメイン情報
 */
export interface VercelDomain {
    name: string;
    verified: boolean;
    nameservers: string[];
    intendedNameservers: string[];
    createdAt: number;
}

/**
 * Vercelアナリティクス情報
 */
export interface VercelAnalytics {
    devices: Array<{ device: string; visitors: number }>;
    topPages: Array<{ page: string; views: number }>;
    topReferrers: Array<{ referrer: string; visits: number }>;
    countries: Array<{ country: string; visitors: number }>;
}

/**
 * Vercel関数情報
 */
export interface VercelFunction {
    name: string;
    runtime: string;
    memory: number;
    maxDuration: number;
    regions: string[];
}

/**
 * Vercel設定
 */
export interface VercelConfig extends ServiceConfig {
    /** Vercelチーム/組織ID */
    team?: string;
    /** デフォルトプロジェクトID */
    project?: string;
    /** ミリ秒単位のCLIタイムアウト */
    timeout?: number;
}
