/**
 * パッケージバージョンヘルパー関数
 * パッケージバージョンの取得と管理用ユーティリティ関数
 */

import { PACKAGE_VERSIONS } from './package-versions.js';

/**
 * 単一パッケージのバージョンを取得
 * @param packageName - バージョンを取得したいパッケージ名
 * @returns 指定されたパッケージのバージョン、存在しない場合は'latest'
 */
export function getPackageVersion(packageName: string): string {
    return PACKAGE_VERSIONS[packageName as keyof typeof PACKAGE_VERSIONS] || 'latest';
}

/**
 * 複数パッケージのバージョンを一括取得
 * @param packages - バージョンを取得したいパッケージ名の配列
 * @returns パッケージ名とバージョンのマップ
 */
export function getPackageVersions(packages: string[]): Record<string, string> {
    return packages.reduce(
        (versions, pkg) => {
            versions[pkg] = getPackageVersion(pkg); // 各パッケージのバージョンを取得
            return versions;
        },
        {} as Record<string, string> // 結果を格納するオブジェクト
    );
}
