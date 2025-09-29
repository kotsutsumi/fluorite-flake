/**
 * よく使用される.gitignoreパターン
 */
export const GITIGNORE_PATTERNS = {
    node: [
        'node_modules/',
        'npm-debug.log*',
        'yarn-debug.log*',
        'yarn-error.log*',
        '.npm',
        '.yarn-integrity',
    ],
    nextjs: ['.next/', 'out/', '*.tsbuildinfo', '.vercel'],
    env: ['.env', '.env.local', '.env.*.local'],
    build: ['build/', 'dist/', 'coverage/'],
    os: ['.DS_Store', 'Thumbs.db', '*.log'],
    tauri: ['src-tauri/target/', 'src-tauri/Cargo.lock'],
    flutter: [
        '*.lock',
        '.flutter-plugins',
        '.flutter-plugins-dependencies',
        '.packages',
        'build/',
        '.dart_tool/',
    ],
};
