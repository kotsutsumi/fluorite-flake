/**
 * 単一パッケージのバージョンを取得するヘルパー関数
 */

import { PACKAGE_VERSIONS } from '../package-versions.js';

/**
 * 単一パッケージのバージョンを取得
 * @param packageName - バージョンを取得したいパッケージ名
 * @returns 指定されたパッケージのバージョン、存在しない場合は'latest'
 */
export function getPackageVersion(packageName: string): string {
    return PACKAGE_VERSIONS[packageName as keyof typeof PACKAGE_VERSIONS] || 'latest';
}
