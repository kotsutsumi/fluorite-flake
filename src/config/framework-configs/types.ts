export type FrameworkType = 'nextjs' | 'expo' | 'tauri' | 'flutter';
export type DatabaseType = 'none' | 'turso' | 'supabase';
export type OrmType = 'prisma' | 'drizzle';
export type StorageType = 'none' | 'vercel-blob' | 'cloudflare-r2' | 'aws-s3' | 'supabase-storage';
export type PackageManagerType = 'npm' | 'pnpm' | 'yarn' | 'bun';

export interface FrameworkFeatures {
    database: boolean;
    auth: boolean;
    storage: boolean;
    deployment: boolean;
    packageManager: boolean;
}

export interface FrameworkVersions {
    [key: string]: string;
}

export interface FrameworkConfig {
    name: string;
    displayName: string;
    defaultName: string;
    description: string;
    supportedFeatures: FrameworkFeatures;
    supportedDatabases: DatabaseType[];
    supportedOrms: OrmType[];
    supportedStorage: StorageType[];
    versions: FrameworkVersions;
    requiredDependencies: string[];
    devDependencies: string[];
}
