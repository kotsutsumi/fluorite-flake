import fs from "node:fs";
import path from "node:path";

import type { ProjectConfig } from "../../commands/create/types.js";

/**
 * webアプリ用のpackage.jsonを作成
 */
export function createWebAppPackageJson(config: ProjectConfig): void {
    const { directory, name, type } = config;
    const webAppDir = path.join(directory, "apps", "web");

    let appPackageJson: Record<string, unknown>;

    switch (type) {
        case "nextjs":
            appPackageJson = {
                name: `${name}-web`,
                version: "0.1.0",
                private: true,
                scripts: {
                    dev: "next dev",
                    build: "next build",
                    start: "next start",
                    lint: "ultracite check",
                    typecheck: "tsc --noEmit",
                },
                dependencies: {
                    next: "^15.5.4",
                    react: "^18.0.0",
                    "react-dom": "^18.0.0",
                },
                devDependencies: {
                    "@types/node": "^22.10.2",
                    "@types/react": "^18.0.0",
                    "@types/react-dom": "^18.0.0",
                    typescript: "^5.7.2",
                },
            };
            break;
        case "expo":
            appPackageJson = {
                name: `${name}-mobile`,
                version: "1.0.0",
                main: "expo-router/entry",
                scripts: {
                    start: "expo start",
                    dev: "expo start --dev-client",
                    android: "expo run:android",
                    ios: "expo run:ios",
                    web: "expo start --web",
                    build: "expo build",
                    lint: "ultracite check",
                    typecheck: "tsc --noEmit",
                },
                dependencies: {
                    expo: "~51.0.0",
                    "expo-router": "~3.5.0",
                    react: "18.2.0",
                    "react-native": "0.74.0",
                },
                devDependencies: {
                    "@types/react": "~18.2.45",
                    typescript: "^5.7.2",
                },
            };
            break;
        case "tauri":
            appPackageJson = {
                name: `${name}-desktop`,
                version: "0.1.0",
                private: true,
                type: "module",
                scripts: {
                    dev: "vite",
                    build: "tsc && vite build",
                    preview: "vite preview",
                    tauri: "tauri",
                    lint: "ultracite check",
                    typecheck: "tsc --noEmit",
                },
                dependencies: {
                    "@tauri-apps/api": "^1.6.0",
                },
                devDependencies: {
                    "@tauri-apps/cli": "^1.6.0",
                    "@types/node": "^22.10.2",
                    typescript: "^5.7.2",
                    vite: "^5.0.0",
                },
            };
            break;
        default:
            throw new Error(`Unsupported project type: ${type}`);
    }

    fs.writeFileSync(
        path.join(webAppDir, "package.json"),
        JSON.stringify(appPackageJson, null, 2),
        "utf-8"
    );
}

// EOF
