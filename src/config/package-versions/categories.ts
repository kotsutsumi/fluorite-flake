/**
 * パッケージカテゴリ定義
 * フレームワークや機能別にパッケージを分類したカテゴリマップ
 */
export const PACKAGE_CATEGORIES = {
    // Next.js フレームワーク関連パッケージ
    nextjs: {
        dependencies: ['next', 'react', 'react-dom'], // Next.jsコア依存関係
        devDependencies: [
            // 開発時に必要な型定義
            'typescript', // TypeScriptコンパイラ
            '@types/node', // Node.js型定義
            '@types/react', // React型定義
            '@types/react-dom', // React DOM型定義
            '@types/color', // Colorライブラリ型定義
            '@types/lodash.throttle', // Lodash throttle型定義
            '@types/qrcode', // QRCodeライブラリ型定義
            '@types/culori', // Culoriカラーライブラリ型定義
        ],
    },
    // Expo フレームワーク関連パッケージ
    expo: {
        dependencies: [
            // Expoコア依存関係
            'expo', // Expo SDK
            'react', // Reactライブラリ
            'react-native', // React Native
            'expo-router', // Expoナビゲーション
            '@expo/vector-icons', // Expoアイコンセット
        ],
        devDependencies: ['typescript', '@types/react'], // 開発時依存関係
    },
    // Tauri フレームワーク関連パッケージ
    tauri: {
        dependencies: [
            // Tauriコア依存関係
            '@tauri-apps/api', // Tauri API
            '@tauri-apps/plugin-shell', // Tauri Shellプラグイン
            'react', // Reactライブラリ
            'react-dom', // React DOMレンダリング
        ],
        devDependencies: [
            // 開発時依存関係
            'vite', // Viteビルドツール
            '@vitejs/plugin-react', // Vite Reactプラグイン
            'typescript', // TypeScriptコンパイラ
            '@types/react', // React型定義
            '@types/react-dom', // React DOM型定義
        ],
    },
    // データベース関連パッケージ
    database: {
        prisma: ['prisma', '@prisma/client'], // Prisma ORMコアパッケージ
        drizzle: ['drizzle-orm', 'drizzle-kit'], // Drizzle ORMコアパッケージ
        turso: ['@libsql/client', '@prisma/adapter-libsql'], // Tursoデータベースクライアント
        supabase: ['@supabase/supabase-js', 'postgres'], // Supabaseクライアント
    },
    // 認証関連パッケージ
    auth: [
        'better-auth', // モダン認証ライブラリ
        'bcryptjs', // パスワードハッシュ化
        'zod', // スキーマ検証
        '@types/bcryptjs', // bcryptjs型定義
    ],
    // ストレージ関連パッケージ
    storage: {
        'vercel-blob': ['@vercel/blob'], // Vercel Blobストレージ
        'aws-s3': ['@aws-sdk/client-s3'], // AWS S3クライアント
        'cloudflare-r2': ['@aws-sdk/client-s3'], // Cloudflare R2 は AWS SDK S3 クライアントを再利用
        'supabase-storage': ['@supabase/supabase-js'], // Supabaseストレージ
    },
    // UI関連パッケージ - コンポーネント、アイコン、ユーティリティの包括的セット
    ui: [
        'lucide-react',
        'react-icons',
        '@radix-ui/react-accordion',
        '@radix-ui/react-alert-dialog',
        '@radix-ui/react-aspect-ratio',
        '@radix-ui/react-avatar',
        '@radix-ui/react-checkbox',
        '@radix-ui/react-collapsible',
        '@radix-ui/react-context-menu',
        '@radix-ui/react-dialog',
        '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-hover-card',
        '@radix-ui/react-icons',
        '@radix-ui/react-label',
        '@radix-ui/react-menubar',
        '@radix-ui/react-navigation-menu',
        '@radix-ui/react-popover',
        '@radix-ui/react-progress',
        '@radix-ui/react-radio-group',
        '@radix-ui/react-scroll-area',
        '@radix-ui/react-select',
        '@radix-ui/react-separator',
        '@radix-ui/react-slider',
        '@radix-ui/react-slot',
        '@radix-ui/react-switch',
        '@radix-ui/react-tabs',
        '@radix-ui/react-toast',
        '@radix-ui/react-toggle',
        '@radix-ui/react-toggle-group',
        '@radix-ui/react-tooltip',
        '@radix-ui/react-use-controllable-state',
        'class-variance-authority',
        'clsx',
        'tailwind-merge',
        'react-hook-form',
        '@hookform/resolvers',
        'embla-carousel-react',
        'react-day-picker',
        'react-resizable-panels',
        'input-otp',
        'cmdk',
        'sonner',
        'recharts',
        'vaul',
        'motion',
        '@tanstack/react-table',
        '@tiptap/react',
        '@tiptap/starter-kit',
        '@tiptap/pm',
        '@uidotdev/usehooks',
        '@dnd-kit/core',
        '@dnd-kit/sortable',
        '@dnd-kit/utilities',
        '@dnd-kit/modifiers',
        'date-fns',
        'fuse.js',
        'color',
        'culori',
        'react-use-measure',
        'qrcode.react',
        'react-svg-credit-card-payment-icons',
        'shiki',
        '@shikijs/transformers',
        'lowlight',
        '@codesandbox/sandpack-react',
        '@tiptap/extension-code-block-lowlight',
        '@tiptap/extension-list',
        '@tiptap/extension-subscript',
        '@tiptap/extension-superscript',
        '@tiptap/extension-table',
        '@tiptap/extension-text-style',
        '@tiptap/extension-typography',
        '@tiptap/extensions',
        '@tiptap/suggestion',
        '@tiptap/core',
        'react-dropzone',
        'tippy.js',
        'lodash.throttle',
        'react-image-crop',
        'react-medium-image-zoom',
        'tunnel-rat',
        'ts-key-enum',
        'react-fast-marquee',
        'qrcode',
        'media-chrome',
    ],
    // スタイリング関連パッケージ
    styling: [
        'tailwindcss', // Tailwind CSSフレームワーク
        '@tailwindcss/typography', // Tailwindタイポグラフィプラグイン
    ],
} as const;
