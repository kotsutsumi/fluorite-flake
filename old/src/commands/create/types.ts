export interface ProjectConfig {
    projectName: string;
    projectPath: string;
    framework: 'nextjs' | 'expo' | 'tauri' | 'flutter';
    database: 'none' | 'turso' | 'supabase';
    orm?: 'prisma' | 'drizzle';
    deployment: boolean;
    storage: 'none' | 'vercel-blob' | 'cloudflare-r2' | 'aws-s3' | 'supabase-storage';
    auth: boolean;
    storybook?: boolean;
    packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun';
    mode?: 'full' | 'minimal';
    // Monorepo specific fields
    isMonorepo?: boolean;
    workspaceTool?: 'turborepo' | 'nx' | 'pnpm-workspace';
    includeBackend?: boolean;
    frontendFramework?: 'expo' | 'flutter' | 'tauri';
    backendConfig?: Omit<
        ProjectConfig,
        | 'isMonorepo'
        | 'workspaceTool'
        | 'includeBackend'
        | 'frontendFramework'
        | 'backendConfig'
        | 'frontendConfig'
    >;
    frontendConfig?: Omit<
        ProjectConfig,
        | 'isMonorepo'
        | 'workspaceTool'
        | 'includeBackend'
        | 'frontendFramework'
        | 'backendConfig'
        | 'frontendConfig'
    >;
    isMonorepoChild?: boolean; // Flag to indicate this is a child project in a monorepo
}
