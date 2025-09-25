import { PACKAGE_VERSIONS } from './package-versions.js';

export function getPackageVersion(packageName: string): string {
    return PACKAGE_VERSIONS[packageName as keyof typeof PACKAGE_VERSIONS] || 'latest';
}

export function getPackageVersions(packages: string[]): Record<string, string> {
    return packages.reduce(
        (versions, pkg) => {
            versions[pkg] = getPackageVersion(pkg);
            return versions;
        },
        {} as Record<string, string>
    );
}
