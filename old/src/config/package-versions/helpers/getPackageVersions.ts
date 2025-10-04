/**
 * 複数パッケージのバージョンを一括取得するヘルパー関数
 */

import { getPackageVersion } from './getPackageVersion.js';

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
