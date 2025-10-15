/**
 * フレームワーク別の依存関係定義
 *
 * 標準テンプレート生成時に使用する依存関係のバージョン情報を管理する
 */
import type { ProjectType } from "../types.js";

/**
 * 依存関係の型定義
 */
export type FrameworkDependencies = {
    /** 本番依存関係 */
    dependencies: Record<string, string>;
    /** 開発依存関係 */
    devDependencies: Record<string, string>;
};

/**
 * フレームワーク別の依存関係マップ
 */
export const FRAMEWORK_DEPENDENCIES: Record<ProjectType, FrameworkDependencies> = {
    nextjs: {
        dependencies: {
            next: "^15.5.4",
            react: "^19.1.0",
            "react-dom": "^19.1.0",
        },
        devDependencies: {
            "@types/node": "^22.0.0",
            "@types/react": "^19.0.0",
            "@types/react-dom": "^19.0.0",
            typescript: "^5.9.3",
            "@biomejs/biome": "^1.9.4",
        },
    },
    expo: {
        dependencies: {
            expo: "~52.0.0",
            react: "19.0.0",
            "react-native": "0.76.5",
            "expo-status-bar": "~2.0.0",
        },
        devDependencies: {
            "@babel/core": "^7.20.0",
            "@types/react": "~19.0.0",
            typescript: "^5.9.3",
        },
    },
    tauri: {
        dependencies: {
            "@tauri-apps/api": "^2.0.0",
            react: "^19.1.0",
            "react-dom": "^19.1.0",
        },
        devDependencies: {
            "@tauri-apps/cli": "^2.0.0",
            "@types/react": "^19.0.0",
            "@types/react-dom": "^19.0.0",
            typescript: "^5.9.3",
            vite: "^6.0.0",
            "@vitejs/plugin-react": "^4.3.4",
        },
    },
};

/**
 * プロジェクトタイプに応じた依存関係を取得する
 *
 * @param projectType - プロジェクトタイプ
 * @returns フレームワークの依存関係
 */
export function getFrameworkDependencies(projectType: ProjectType): FrameworkDependencies {
    return FRAMEWORK_DEPENDENCIES[projectType];
}

// EOF
