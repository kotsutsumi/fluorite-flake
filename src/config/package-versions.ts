/**
 * Centralized package version management
 */

export const PACKAGE_VERSIONS = {
  // Core frameworks
  next: '15.1.3',
  react: '19.0.0',
  'react-dom': '19.0.0',
  expo: '~52.0.0',
  'react-native': '0.76.5',
  '@tauri-apps/api': '^2.1.1',

  // TypeScript and types
  typescript: '^5.6.0',
  '@types/node': '^22.0.0',
  '@types/react': '^19.0.0',
  '@types/react-dom': '^19.0.0',
  '@types/bcryptjs': '^2.4.6',

  // Styling
  tailwindcss: '^3.4.15',
  '@tailwindcss/typography': '^0.5.15',
  'tailwindcss-animate': '^1.0.7',
  autoprefixer: '^10.4.20',
  postcss: '^8.5.0',
  '@tailwindcss/postcss': '4.0.0-beta.6',

  // Database and ORM
  prisma: '^5.22.0',
  '@prisma/client': '^5.22.0',
  '@prisma/adapter-libsql': '^5.22.0',
  'drizzle-orm': '^0.36.4',
  'drizzle-kit': '^0.28.1',
  '@libsql/client': '^0.14.0',
  '@supabase/supabase-js': '^2.46.1',

  // Authentication
  'better-auth': '^1.2.3',
  bcryptjs: '^2.4.3',
  zod: '^3.23.8',

  // Storage
  '@vercel/blob': '^0.27.0',
  '@aws-sdk/client-s3': '^3.687.0',

  // Deployment
  '@vercel/analytics': '^1.5.0',
  '@vercel/speed-insights': '^1.1.0',

  // UI Components
  'lucide-react': '^0.460.0',
  '@radix-ui/react-dialog': '^1.1.2',
  '@radix-ui/react-dropdown-menu': '^2.1.2',
  '@radix-ui/react-label': '^2.1.0',
  '@radix-ui/react-slot': '^1.1.0',
  '@radix-ui/react-toast': '^1.2.2',
  'class-variance-authority': '^0.7.0',
  clsx: '^2.1.1',
  'tailwind-merge': '^2.5.4',

  // Development tools
  vite: '^6.0.0',
  '@vitejs/plugin-react': '^4.3.0',
  '@biomejs/biome': '^1.9.4',

  // Testing
  vitest: '^2.1.5',
  '@vitest/ui': '^2.1.5',
  'happy-dom': '^15.11.6',

  // Build tools
  tsx: '^4.19.2',

  // Expo specific
  '@expo/vector-icons': '^14.0.0',
  'expo-router': '~4.0.0',

  // Tauri specific
  '@tauri-apps/plugin-shell': '^2.0.1',
} as const;

/**
 * Get version for a package
 */
export function getPackageVersion(packageName: string): string {
  return PACKAGE_VERSIONS[packageName as keyof typeof PACKAGE_VERSIONS] || 'latest';
}

/**
 * Get multiple package versions
 */
export function getPackageVersions(packages: string[]): Record<string, string> {
  return packages.reduce(
    (versions, pkg) => {
      versions[pkg] = getPackageVersion(pkg);
      return versions;
    },
    {} as Record<string, string>
  );
}

/**
 * Package categories for easier management
 */
export const PACKAGE_CATEGORIES = {
  nextjs: {
    dependencies: ['next', 'react', 'react-dom'],
    devDependencies: ['typescript', '@types/node', '@types/react', '@types/react-dom'],
  },
  expo: {
    dependencies: ['expo', 'react', 'react-native', 'expo-router', '@expo/vector-icons'],
    devDependencies: ['typescript', '@types/react'],
  },
  tauri: {
    dependencies: ['@tauri-apps/api', '@tauri-apps/plugin-shell', 'react', 'react-dom'],
    devDependencies: [
      'vite',
      '@vitejs/plugin-react',
      'typescript',
      '@types/react',
      '@types/react-dom',
    ],
  },
  database: {
    prisma: ['prisma', '@prisma/client'],
    drizzle: ['drizzle-orm', 'drizzle-kit'],
    turso: ['@libsql/client'],
    supabase: ['@supabase/supabase-js'],
  },
  auth: ['better-auth', 'bcryptjs', 'zod', '@types/bcryptjs'],
  storage: {
    'vercel-blob': ['@vercel/blob'],
    'aws-s3': ['@aws-sdk/client-s3'],
    'supabase-storage': ['@supabase/supabase-js'],
  },
  ui: [
    'lucide-react',
    '@radix-ui/react-dialog',
    '@radix-ui/react-dropdown-menu',
    '@radix-ui/react-label',
    '@radix-ui/react-slot',
    '@radix-ui/react-toast',
    'class-variance-authority',
    'clsx',
    'tailwind-merge',
  ],
  styling: ['tailwindcss', '@tailwindcss/typography'],
} as const;
