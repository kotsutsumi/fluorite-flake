/**
 * プロジェクトタイプ毎に利用するコマンドを解決するモジュール
 */

/**
 * 指定されたプロジェクトタイプに合わせた開発サーバー起動コマンドを返す
 */
export function getDevCommand(type: string): string {
    switch (type) {
        case "nextjs":
            return "next dev"; // Next.jsプロジェクト用の開発コマンド
        case "expo":
            return "expo start"; // Expoプロジェクト用の開発コマンド
        case "tauri":
            return "tauri dev"; // Tauriプロジェクト用の開発コマンド
        default:
            return "npm run dev"; // その他のタイプ向けのデフォルトコマンド
    }
}

/**
 * 指定されたプロジェクトタイプに合わせたビルドコマンドを返す
 */
export function getBuildCommand(type: string): string {
    switch (type) {
        case "nextjs":
            return "next build"; // Next.jsプロジェクト用のビルドコマンド
        case "expo":
            return "expo build"; // Expoプロジェクト用のビルドコマンド
        case "tauri":
            return "tauri build"; // Tauriプロジェクト用のビルドコマンド
        default:
            return "npm run build"; // その他のタイプ向けのデフォルトコマンド
    }
}

// EOF
