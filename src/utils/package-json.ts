import path from 'node:path';
// fs import removed as it's unused
import type { ProjectConfig } from '../commands/create/types.js';
import {
    PACKAGE_CATEGORIES,
    getPackageVersion,
    getPackageVersions,
} from '../config/package-versions/index.js';
import { writeConfigFile } from './file-generation.js';

export async function generatePackageJson(config: ProjectConfig) {
    // Only generate package.json for Next.js - other frameworks handle this in their own generators
    if (config.framework !== 'nextjs') {
        return;
    }

    const packageJson: {
        name: string;
        version: string;
        private: boolean;
        type: string;
        scripts: Record<string, string>;
        dependencies: Record<string, string>;
        devDependencies: Record<string, string>;
    } = {
        name: config.projectName,
        version: '0.1.0',
        private: true,
        type: 'module',
        scripts: {
            dev: 'next dev',
            build: 'next build',
            start: 'next start',
            lint: 'biome lint .',
            'lint:fix': 'biome lint --fix .',
            format: 'biome format --write .',
            'format:check': 'biome format .',
            check: 'biome check .',
            'check:fix': 'biome check --fix .',
            'env:encrypt': 'tsx scripts/env-tools.ts encrypt',
            'env:decrypt': 'tsx scripts/env-tools.ts decrypt',
            prepare: 'husky',
        },
        dependencies: getPackageVersions([
            ...PACKAGE_CATEGORIES.nextjs.dependencies,
            ...PACKAGE_CATEGORIES.ui,
            'jotai',
            'next-themes',
        ]),
        devDependencies: getPackageVersions([
            ...PACKAGE_CATEGORIES.nextjs.devDependencies,
            'tailwindcss',
            '@tailwindcss/postcss',
            'tailwindcss-animate',
            'husky',
            '@biomejs/biome',
            'tsx',
        ]),
    };

    // Add database dependencies
    if (config.database === 'turso') {
        Object.assign(
            packageJson.dependencies,
            getPackageVersions([...PACKAGE_CATEGORIES.database.turso])
        );
        if (config.orm === 'prisma') {
            Object.assign(
                packageJson.dependencies,
                getPackageVersions([...PACKAGE_CATEGORIES.database.prisma])
            );
            Object.assign(packageJson.devDependencies, getPackageVersions(['prisma', 'tsx']));
        } else if (config.orm === 'drizzle') {
            Object.assign(packageJson.dependencies, getPackageVersions(['drizzle-orm']));
            Object.assign(packageJson.devDependencies, getPackageVersions(['drizzle-kit', 'tsx']));
        }
    } else if (config.database === 'supabase') {
        Object.assign(
            packageJson.dependencies,
            getPackageVersions([...PACKAGE_CATEGORIES.database.supabase])
        );
        if (config.orm === 'prisma') {
            Object.assign(
                packageJson.dependencies,
                getPackageVersions([...PACKAGE_CATEGORIES.database.prisma])
            );
            Object.assign(packageJson.devDependencies, getPackageVersions(['prisma', 'tsx']));
        } else if (config.orm === 'drizzle') {
            Object.assign(packageJson.dependencies, getPackageVersions(['drizzle-orm']));
            Object.assign(packageJson.devDependencies, getPackageVersions(['drizzle-kit', 'tsx']));
        }
    }

    // Add deployment dependencies
    if (config.deployment) {
        packageJson.dependencies['@vercel/analytics'] = getPackageVersion('@vercel/analytics');
        packageJson.dependencies['@vercel/speed-insights'] =
            getPackageVersion('@vercel/speed-insights');
    }

    // Add storage dependencies
    if (config.storage !== 'none') {
        const storageDeps =
            PACKAGE_CATEGORIES.storage[config.storage as keyof typeof PACKAGE_CATEGORIES.storage];
        if (storageDeps) {
            Object.assign(packageJson.dependencies, getPackageVersions([...storageDeps]));
        }
    }

    // Add auth dependencies
    if (config.auth) {
        Object.assign(packageJson.dependencies, getPackageVersions([...PACKAGE_CATEGORIES.auth]));
    }

    // Sort dependencies and devDependencies
    packageJson.dependencies = sortObject(packageJson.dependencies);
    packageJson.devDependencies = sortObject(packageJson.devDependencies);

    // Write package.json using the shared utility
    await writeConfigFile(path.join(config.projectPath, 'package.json'), packageJson, {
        sortKeys: true,
    });
}

function sortObject(obj: Record<string, string>): Record<string, string> {
    return Object.keys(obj)
        .sort()
        .reduce((result: Record<string, string>, key: string) => {
            result[key] = obj[key];
            return result;
        }, {});
}
