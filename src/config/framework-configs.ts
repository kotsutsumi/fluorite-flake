/**
 * Centralized configuration management for all frameworks
 */

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

export const FRAMEWORK_CONFIGS: Record<FrameworkType, FrameworkConfig> = {
  nextjs: {
    name: 'nextjs',
    displayName: 'Next.js',
    defaultName: 'my-next-app',
    description: 'React framework for production-ready web applications',
    supportedFeatures: {
      database: true,
      auth: true,
      storage: true,
      deployment: true,
      packageManager: true,
    },
    supportedDatabases: ['none', 'turso', 'supabase'],
    supportedOrms: ['prisma', 'drizzle'],
    supportedStorage: ['none', 'vercel-blob', 'cloudflare-r2', 'aws-s3', 'supabase-storage'],
    versions: {
      next: '15.1.3',
      react: '19.0.0',
      'react-dom': '19.0.0',
      typescript: '^5.6.0',
      tailwindcss: '^3.4.15',
      '@types/node': '^22.0.0',
      '@types/react': '^19.0.0',
      '@types/react-dom': '^19.0.0',
    },
    requiredDependencies: ['next', 'react', 'react-dom'],
    devDependencies: ['typescript', '@types/node', '@types/react', '@types/react-dom'],
  },
  expo: {
    name: 'expo',
    displayName: 'Expo',
    defaultName: 'my-expo-app',
    description: 'React Native framework for mobile applications',
    supportedFeatures: {
      database: true,
      auth: true,
      storage: true,
      deployment: false,
      packageManager: true,
    },
    supportedDatabases: ['none', 'turso', 'supabase'],
    supportedOrms: ['prisma', 'drizzle'],
    supportedStorage: ['none', 'cloudflare-r2', 'aws-s3', 'supabase-storage'],
    versions: {
      expo: '~52.0.0',
      react: '18.3.1',
      'react-native': '0.76.5',
      typescript: '^5.3.0',
      '@types/react': '~18.3.0',
      '@expo/vector-icons': '^14.0.0',
      'expo-router': '~4.0.0',
    },
    requiredDependencies: ['expo', 'react', 'react-native', 'expo-router', '@expo/vector-icons'],
    devDependencies: ['typescript', '@types/react'],
  },
  tauri: {
    name: 'tauri',
    displayName: 'Tauri',
    defaultName: 'my-tauri-app',
    description: 'Desktop applications with Rust backend and web frontend',
    supportedFeatures: {
      database: false,
      auth: false,
      storage: false,
      deployment: true,
      packageManager: true,
    },
    supportedDatabases: ['none'],
    supportedOrms: [],
    supportedStorage: ['none'],
    versions: {
      '@tauri-apps/api': '^2.1.1',
      '@tauri-apps/plugin-shell': '^2.0.1',
      vite: '^6.0.0',
      react: '^18.3.0',
      'react-dom': '^18.3.0',
      typescript: '^5.6.0',
      '@types/react': '^18.3.0',
      '@types/react-dom': '^18.3.0',
      '@vitejs/plugin-react': '^4.3.0',
    },
    requiredDependencies: ['@tauri-apps/api', '@tauri-apps/plugin-shell', 'react', 'react-dom'],
    devDependencies: [
      'vite',
      '@vitejs/plugin-react',
      'typescript',
      '@types/react',
      '@types/react-dom',
    ],
  },
  flutter: {
    name: 'flutter',
    displayName: 'Flutter',
    defaultName: 'my_flutter_app',
    description: 'Cross-platform apps with Dart',
    supportedFeatures: {
      database: false,
      auth: false,
      storage: false,
      deployment: true,
      packageManager: false,
    },
    supportedDatabases: ['none'],
    supportedOrms: [],
    supportedStorage: ['none'],
    versions: {
      flutter: '>=3.24.0',
      dart: '>=3.5.0 <4.0.0',
    },
    requiredDependencies: [],
    devDependencies: [],
  },
};

export const DATABASE_CONFIGS = {
  turso: {
    name: 'Turso',
    description: 'SQLite at the edge with libSQL',
    envVars: ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN', 'DATABASE_URL'],
    supportedOrms: ['prisma', 'drizzle'],
  },
  supabase: {
    name: 'Supabase',
    description: 'PostgreSQL with built-in auth',
    envVars: [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'DATABASE_URL',
    ],
    supportedOrms: ['prisma', 'drizzle'],
  },
} as const;

export const STORAGE_CONFIGS = {
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
} as const;

/**
 * Get framework configuration by type
 */
export function getFrameworkConfig(framework: FrameworkType): FrameworkConfig {
  return FRAMEWORK_CONFIGS[framework];
}

/**
 * Check if framework supports a specific feature
 */
export function supportsFeature(
  framework: FrameworkType,
  feature: keyof FrameworkFeatures
): boolean {
  return FRAMEWORK_CONFIGS[framework].supportedFeatures[feature];
}

/**
 * Get supported databases for a framework
 */
export function getSupportedDatabases(framework: FrameworkType): DatabaseType[] {
  return FRAMEWORK_CONFIGS[framework].supportedDatabases;
}

/**
 * Get supported storage providers for a framework
 */
export function getSupportedStorage(framework: FrameworkType): StorageType[] {
  return FRAMEWORK_CONFIGS[framework].supportedStorage;
}

/**
 * Validate configuration combination
 */
export function validateConfiguration(config: {
  framework: FrameworkType;
  database: DatabaseType;
  orm?: OrmType;
  storage: StorageType;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const frameworkConfig = getFrameworkConfig(config.framework);

  // Check database support
  if (config.database !== 'none' && !frameworkConfig.supportedDatabases.includes(config.database)) {
    errors.push(`${frameworkConfig.displayName} does not support ${config.database} database`);
  }

  // Check ORM compatibility
  if (config.orm && config.database !== 'none') {
    const dbConfig = DATABASE_CONFIGS[config.database as keyof typeof DATABASE_CONFIGS];
    if (dbConfig && !dbConfig.supportedOrms.includes(config.orm)) {
      errors.push(`${config.database} does not support ${config.orm} ORM`);
    }
  }

  // Check storage support
  if (config.storage !== 'none' && !frameworkConfig.supportedStorage.includes(config.storage)) {
    errors.push(`${frameworkConfig.displayName} does not support ${config.storage} storage`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
