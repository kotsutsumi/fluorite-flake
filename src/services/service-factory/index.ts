/**
 * サービスファクトリーモジュールのエクスポート
 * サービス作成および管理機能を統合して提供する
 */

// クラス定義
export { DefaultServiceFactory } from './DefaultServiceFactory.js';
export { ServiceRegistry } from './ServiceRegistry.js';

// ファクトリーインスタンス
export { serviceFactory } from './serviceFactory.js';

// 定数と型
export { SERVICE_INFO, SERVICE_MODULES, type SupportedService } from './constants.js';
