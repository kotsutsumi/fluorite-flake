/**
 * E2Eテスト設定
 */

// テストタイムアウト設定
export const TIMEOUTS = {
    DEFAULT: 30_000, // 30秒
    PROJECT_CREATION: 120_000, // 2分（プロジェクト生成）
    DASHBOARD_STARTUP: 10_000, // 10秒（ダッシュボード起動）
    CLI_COMMAND: 15_000, // 15秒（CLI コマンド）
    FILE_OPERATIONS: 5000, // 5秒（ファイル操作）
} as const;

// パフォーマンス基準
export const PERFORMANCE_THRESHOLDS = {
    PROJECT_CREATION: {
        NEXTJS: 30_000, // Next.js プロジェクト生成
        EXPO: 25_000, // Expo プロジェクト生成
        TAURI: 45_000, // Tauri プロジェクト生成
        MONOREPO: 60_000, // モノレポ生成
    },
    DASHBOARD: {
        STARTUP: 3000, // ダッシュボード起動
        SERVICE_SWITCH: 500, // サービス切り替え
        TAB_SWITCH: 300, // タブ切り替え
    },
    CLI: {
        HELP: 1000, // ヘルプ表示
        VERSION: 500, // バージョン表示
        ERROR_MESSAGE: 1000, // エラーメッセージ表示
    },
    MEMORY: {
        MAX_USAGE: 100 * 1024 * 1024, // 100MB
    },
} as const;

// テスト環境設定
export const TEST_CONFIG = {
    // 一時ディレクトリのプレフィックス
    TEMP_DIR_PREFIX: "fluorite-e2e-",

    // プロジェクト生成先ディレクトリ
    PROJECT_OUTPUT_DIR: "test-projects",

    // テスト用プロジェクト名のプレフィックス
    PROJECT_NAME_PREFIX: "test-project-",

    // 並行実行数
    CONCURRENCY: {
        MAX_PARALLEL_TESTS: 4,
        MAX_PARALLEL_PROJECTS: 2,
    },

    // リトライ設定
    RETRY: {
        MAX_ATTEMPTS: 3,
        DELAY_MS: 1000,
    },

    // モック設定
    MOCKS: {
        ENABLE_API_MOCKS: true,
        ENABLE_CLI_MOCKS: false, // 実際のCLIをテスト
    },

    // ログ設定
    LOGGING: {
        VERBOSE: process.env.E2E_VERBOSE === "true",
        SAVE_OUTPUTS: process.env.E2E_SAVE_OUTPUTS === "true",
        OUTPUT_DIR: "test/e2e/outputs",
    },

    // CI環境設定
    CI: {
        IS_CI: process.env.CI === "true",
        REDUCE_PARALLELISM: process.env.CI === "true",
        SKIP_SLOW_TESTS: process.env.CI === "true" && process.env.E2E_FULL !== "true",
    },
} as const;

// テスト対象プロジェクトタイプ
export const PROJECT_TYPES = {
    NEXTJS: {
        name: "nextjs",
        expectedFiles: ["package.json", "next.config.js", "app/layout.tsx", "app/page.tsx", ".gitignore", "README.md"],
        expectedDependencies: ["next", "react", "react-dom"],
        minFileCount: 10,
        maxFileCount: 50,
    },
    EXPO: {
        name: "expo",
        expectedFiles: ["package.json", "app.json", "App.tsx", ".gitignore", "README.md"],
        expectedDependencies: ["expo", "react", "react-native"],
        minFileCount: 8,
        maxFileCount: 40,
    },
    TAURI: {
        name: "tauri",
        expectedFiles: [
            "package.json",
            "src-tauri/tauri.conf.json",
            "src-tauri/Cargo.toml",
            "src/main.ts",
            ".gitignore",
            "README.md",
        ],
        expectedDependencies: ["@tauri-apps/cli", "@tauri-apps/api"],
        minFileCount: 15,
        maxFileCount: 60,
    },
} as const;

// ダッシュボードテスト設定
export const DASHBOARD_CONFIG = {
    SERVICES: ["vercel", "turso"] as const,
    KEYBOARD_SHORTCUTS: {
        CYCLE_SERVICE: "s",
        ACTIONS: {
            quit: "q",
            escape: "\u001b", // ESC key
            enter: "\r", // Enter key
        },
    },
} as const;

// 国際化テスト設定
export const I18N_CONFIG = {
    LOCALES: ["ja", "en"] as const,
    DEFAULT_LOCALE: "ja",
    TEST_PATTERNS: {
        ja: {
            CREATE_SUCCESS: ["プロジェクトが作成されました", "生成が完了"],
            HELP_MESSAGE: ["USAGE", "COMMANDS"], // cittyの実際の出力に合わせる
            ERROR_MESSAGE: ["エラー", "失敗", "問題"],
        },
        en: {
            CREATE_SUCCESS: ["Project created", "Generation completed"],
            HELP_MESSAGE: ["Usage", "Commands", "Options"],
            ERROR_MESSAGE: ["Error", "Failed", "Problem"],
        },
    },
} as const;

// エラーテストケース
export const ERROR_TEST_CASES = {
    INVALID_COMMANDS: [
        "invalid-command",
        "create", // 引数不足
        "dashboard --invalid-option",
    ],
    INVALID_ARGUMENTS: [
        ["create", "test", "--type", "invalid-type"],
        ["create", "/invalid/path/name"],
        ["dashboard", "--service", "invalid-service"],
    ],
    PERMISSION_ERRORS: [
        // 読み取り専用ディレクトリでのプロジェクト作成
        // （実際のテストでは適切にセットアップ）
    ],
} as const;

// テスト実行環境の検出
export function getTestEnvironment() {
    return {
        isCI: TEST_CONFIG.CI.IS_CI,
        isVerbose: TEST_CONFIG.LOGGING.VERBOSE,
        shouldSkipSlowTests: TEST_CONFIG.CI.SKIP_SLOW_TESTS,
        maxParallelism: TEST_CONFIG.CI.REDUCE_PARALLELISM ? 2 : TEST_CONFIG.CONCURRENCY.MAX_PARALLEL_TESTS,
        platform: process.platform,
        nodeVersion: process.version,
    };
}

// テスト用ユーティリティ関数
export function shouldSkipTest(reason: "slow" | "ci-only" | "local-only"): boolean {
    const env = getTestEnvironment();

    switch (reason) {
        case "slow":
            return env.shouldSkipSlowTests;
        case "ci-only":
            return !env.isCI;
        case "local-only":
            return env.isCI;
        default:
            return false;
    }
}

export function getTimeoutForOperation(operation: keyof typeof PERFORMANCE_THRESHOLDS): number {
    switch (operation) {
        case "PROJECT_CREATION":
            return TIMEOUTS.PROJECT_CREATION;
        case "DASHBOARD":
            return TIMEOUTS.DASHBOARD_STARTUP;
        case "CLI":
            return TIMEOUTS.CLI_COMMAND;
        default:
            return TIMEOUTS.DEFAULT;
    }
}

// EOF
