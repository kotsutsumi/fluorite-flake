/**
 * データベースとORMバージョン
 * データベースクライアント、ORM、アダプターパッケージ
 */
export const DATABASE_AND_ORM_VERSIONS = {
    prisma: '^6.16.2',
    '@prisma/client': '^6.16.2',
    '@prisma/adapter-libsql': '^6.16.2',
    'drizzle-orm': '^0.36.4',
    'drizzle-kit': '^0.28.1',
    '@libsql/client': '^0.14.0',
    '@supabase/supabase-js': '^2.46.1',
} as const;
