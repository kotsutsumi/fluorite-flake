export const CORE_FRAMEWORK_VERSIONS = {
    next: '15.5.4',
    react: '19.0.0',
    'react-dom': '19.0.0',
    expo: '~52.0.0',
    'react-native': '0.76.5',
    '@tauri-apps/api': '^2.1.1',
} as const;

export const TYPESCRIPT_AND_TYPES_VERSIONS = {
    typescript: '^5.6.0',
    '@types/node': '^22.0.0',
    '@types/react': '^19.0.0',
    '@types/react-dom': '^19.0.0',
    '@types/bcryptjs': '^2.4.6',
    '@types/color': '^3.0.6',
} as const;

export const STYLING_VERSIONS = {
    tailwindcss: '^4',
    '@tailwindcss/postcss': '^4',
    'tailwindcss-animate': '^1.0.7',
} as const;

export const DATABASE_AND_ORM_VERSIONS = {
    prisma: '^5.22.0',
    '@prisma/client': '^5.22.0',
    '@prisma/adapter-libsql': '^5.22.0',
    'drizzle-orm': '^0.36.4',
    'drizzle-kit': '^0.28.1',
    '@libsql/client': '^0.14.0',
    '@supabase/supabase-js': '^2.46.1',
} as const;

export const AUTH_VERSIONS = {
    'better-auth': '^1.2.3',
    bcryptjs: '^2.4.3',
    zod: '^3.23.8',
} as const;

export const STORAGE_VERSIONS = {
    '@vercel/blob': '^0.27.0',
    '@aws-sdk/client-s3': '^3.687.0',
} as const;

export const DEPLOYMENT_VERSIONS = {
    '@vercel/analytics': '^1.5.0',
    '@vercel/speed-insights': '^1.1.0',
} as const;

export const STATE_THEME_VERSIONS = {
    jotai: '^2.10.4',
    'next-themes': '^0.4.4',
} as const;

export const UI_COMPONENT_VERSIONS = {
    'lucide-react': '^0.460.0',
    'react-icons': '^5.4.0',
    '@radix-ui/react-accordion': '^1.2.1',
    '@radix-ui/react-alert-dialog': '^1.1.2',
    '@radix-ui/react-aspect-ratio': '^1.1.0',
    '@radix-ui/react-avatar': '^1.1.1',
    '@radix-ui/react-checkbox': '^1.1.2',
    '@radix-ui/react-collapsible': '^1.1.1',
    '@radix-ui/react-context-menu': '^2.2.2',
    '@radix-ui/react-dialog': '^1.1.2',
    '@radix-ui/react-dropdown-menu': '^2.1.2',
    '@radix-ui/react-hover-card': '^1.1.2',
    '@radix-ui/react-icons': '^1.3.2',
    '@radix-ui/react-label': '^2.1.0',
    '@radix-ui/react-menubar': '^1.1.2',
    '@radix-ui/react-navigation-menu': '^1.2.1',
    '@radix-ui/react-popover': '^1.1.2',
    '@radix-ui/react-progress': '^1.1.0',
    '@radix-ui/react-radio-group': '^1.2.1',
    '@radix-ui/react-scroll-area': '^1.2.1',
    '@radix-ui/react-select': '^2.1.2',
    '@radix-ui/react-separator': '^1.1.0',
    '@radix-ui/react-slider': '^1.2.1',
    '@radix-ui/react-slot': '^1.1.0',
    '@radix-ui/react-switch': '^1.1.1',
    '@radix-ui/react-tabs': '^1.1.1',
    '@radix-ui/react-toast': '^1.2.2',
    '@radix-ui/react-toggle': '^1.1.0',
    '@radix-ui/react-toggle-group': '^1.1.0',
    '@radix-ui/react-tooltip': '^1.1.4',
    '@radix-ui/react-use-controllable-state': '^1.1.0',
    'class-variance-authority': '^0.7.0',
    clsx: '^2.1.1',
    'tailwind-merge': '^2.5.4',
} as const;

export const FORM_AND_INPUT_VERSIONS = {
    'react-hook-form': '^7.54.2',
    '@hookform/resolvers': '^3.9.1',
} as const;

export const UI_LIBRARY_VERSIONS = {
    'embla-carousel-react': '^8.5.2',
    'react-day-picker': '^9.4.5',
    'react-resizable-panels': '^2.1.8',
    'input-otp': '^1.4.2',
    cmdk: '^1.0.4',
    sonner: '^1.7.2',
    recharts: '^2.14.1',
    vaul: '^1.1.2',
} as const;

export const ANIMATION_VERSIONS = {
    motion: '^11.15.0',
} as const;

export const KIBO_UI_VERSIONS = {
    '@tanstack/react-table': '^8.20.5',
    '@tiptap/react': '^3.5.0',
    '@tiptap/starter-kit': '^3.5.0',
    '@tiptap/pm': '^3.5.0',
    '@uidotdev/usehooks': '^2.4.1',
    '@dnd-kit/core': '^6.3.1',
    '@dnd-kit/sortable': '^10.0.0',
    '@dnd-kit/utilities': '^3.2.2',
    '@dnd-kit/modifiers': '^8.0.0',
    'date-fns': '^4.1.0',
    'fuse.js': '^7.0.0',
    color: '^4.2.3',
    culori: '^4.0.1',
    'react-use-measure': '^2.1.7',
    'qrcode.react': '^4.2.0',
    'react-svg-credit-card-payment-icons': '^4.1.0',
    shiki: '^1.24.2',
    '@shikijs/transformers': '^1.24.2',
    lowlight: '^3.3.0',
    '@codesandbox/sandpack-react': '^2.20.0',
    '@tiptap/extension-code-block-lowlight': '^3.5.0',
    '@tiptap/extension-list': '^3.5.0',
    '@tiptap/extension-subscript': '^3.5.0',
    '@tiptap/extension-superscript': '^3.5.0',
    '@tiptap/extension-table': '^3.5.0',
    '@tiptap/extension-text-style': '^3.5.0',
    '@tiptap/extension-typography': '^3.5.0',
    '@tiptap/extensions': '^3.5.0',
    '@tiptap/suggestion': '^3.5.0',
    '@tiptap/core': '^3.5.0',
} as const;

export const KIBO_ADDITIONAL_VERSIONS = {
    'react-dropzone': '^14.3.5',
    'tippy.js': '^6.3.7',
    'lodash.throttle': '^4.1.1',
    'react-image-crop': '^11.0.9',
    'react-medium-image-zoom': '^5.2.13',
    'tunnel-rat': '^0.1.2',
    'ts-key-enum': '^2.0.12',
    'react-fast-marquee': '^1.6.5',
    qrcode: '^1.5.4',
    'media-chrome': '^4.13.1',
    '@types/lodash.throttle': '^4.1.9',
    '@types/qrcode': '^1.5.5',
    '@types/culori': '^2.1.1',
} as const;

export const DEV_TOOL_VERSIONS = {
    vite: '^6.0.0',
    '@vitejs/plugin-react': '^4.3.0',
    '@biomejs/biome': '^1.9.4',
    husky: '^9.1.7',
} as const;

export const TESTING_VERSIONS = {
    vitest: '^2.1.5',
    '@vitest/ui': '^2.1.5',
    'happy-dom': '^15.11.6',
} as const;

export const BUILD_TOOL_VERSIONS = {
    tsx: '^4.19.2',
} as const;

export const EXPO_SPECIFIC_VERSIONS = {
    '@expo/vector-icons': '^14.0.0',
    'expo-router': '~4.0.0',
} as const;

export const TAURI_SPECIFIC_VERSIONS = {
    '@tauri-apps/plugin-shell': '^2.0.1',
} as const;
