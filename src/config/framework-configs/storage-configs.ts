import type { FrameworkType, StorageType } from './types.js';

interface StorageConfig {
    name: string;
    description: string;
    envVars: string[];
    supportedFrameworks: FrameworkType[];
}

export const STORAGE_CONFIGS: Record<Exclude<StorageType, 'none'>, StorageConfig> = {
    'vercel-blob': {
        name: 'Vercel Blob',
        description: 'Simple file storage with CDN',
        envVars: ['BLOB_READ_WRITE_TOKEN'],
        supportedFrameworks: ['nextjs'],
    },
    'cloudflare-r2': {
        name: 'Cloudflare R2',
        description: 'S3-compatible object storage',
        envVars: [
            'CLOUDFLARE_R2_ACCOUNT_ID',
            'CLOUDFLARE_R2_ACCESS_KEY_ID',
            'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
            'CLOUDFLARE_R2_BUCKET_NAME',
        ],
        supportedFrameworks: ['nextjs', 'expo'],
    },
    'aws-s3': {
        name: 'AWS S3',
        description: 'Industry-standard object storage',
        envVars: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'AWS_BUCKET_NAME'],
        supportedFrameworks: ['nextjs', 'expo'],
    },
    'supabase-storage': {
        name: 'Supabase Storage',
        description: 'Integrated with Supabase auth/database',
        envVars: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
        supportedFrameworks: ['nextjs', 'expo'],
    },
};
