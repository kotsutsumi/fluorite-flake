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
}
