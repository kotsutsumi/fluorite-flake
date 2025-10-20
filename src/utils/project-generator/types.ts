/**
 * プロジェクト生成に関する型定義
 */

/**
 * プロジェクト生成オプション
 */
export interface ProjectGeneratorOptions {
    /** プロジェクト名 */
    projectName: string;
    /** templates/ ディレクトリのパス */
    templatesDir: string;
    /** プロジェクト生成先のディレクトリパス */
    targetDir: string;
    /** セットアップコマンドを実行するかどうか */
    runSetup?: boolean;
}

/**
 * セットアップ結果
 */
export interface SetupResult {
    /** 成功したかどうか */
    success: boolean;
    /** エラーメッセージ（失敗した場合） */
    error?: string;
    /** 実行したコマンド */
    command?: string;
}

// EOF
