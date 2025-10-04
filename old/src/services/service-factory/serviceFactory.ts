/**
 * デフォルトサービスファクトリーインスタンス
 * アプリケーション全体で使用される共有のファクトリーインスタンス
 */

import { DefaultServiceFactory } from './DefaultServiceFactory.js';

// デフォルトファクトリーインスタンスをエクスポート
export const serviceFactory = new DefaultServiceFactory();
