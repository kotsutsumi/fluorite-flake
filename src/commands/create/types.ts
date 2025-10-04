/**
 * createコマンドの型定義
 */

/**
 * createコマンドのオプション型
 */
export type CreateOptions = {
    name?: string;
    template?: string;
    force?: boolean;
    dir?: string;
    monorepo?: boolean;
    simple?: boolean;
};

/**
 * プロジェクト設定の型
 */
export type ProjectConfig = {
    type: "nextjs" | "expo" | "tauri";
    name: string;
    directory: string;
    template?: string;
    force: boolean;
    monorepo: boolean;
};

// EOF
