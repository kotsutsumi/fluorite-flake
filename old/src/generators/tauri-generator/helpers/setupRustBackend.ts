import path from 'node:path';
import fs from 'fs-extra';

import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * Rustバックエンドのセットアップ（Cargo.toml、build.rs、main.rsなど）
 * @param config プロジェクト設定
 */
export async function setupRustBackend(config: ProjectConfig) {
    // Cargo.toml（Rustの依存関係管理ファイル）
    const cargoToml = `[package]
name = "${config.projectName}"
version = "0.0.0"
description = "A Tauri App"
authors = ["you"]
edition = "2021"

[build-dependencies]
tauri-build = { version = "2.0", features = [] }

[dependencies]
tauri = { version = "2.1", features = ["shell-open"] }
tauri-plugin-shell = "2.0"
serde = { version = "1", features = ["derive"] }
serde_json = "1"

[features]
# This feature is used for production builds or when a dev server is not specified, DO NOT REMOVE!!
custom-protocol = ["tauri/custom-protocol"]
`;

    await fs.writeFile(path.join(config.projectPath, 'src-tauri/Cargo.toml'), cargoToml);

    // build.rs（ビルドスクリプト）
    const buildRs = `fn main() {
    tauri_build::build()
}
`;

    await fs.writeFile(path.join(config.projectPath, 'src-tauri/build.rs'), buildRs);

    // main.rs（Rustメインエントリポイント）
    const mainRs = `// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}
`;

    await fs.writeFile(path.join(config.projectPath, 'src-tauri/src/main.rs'), mainRs);

    // アイコンディレクトリとプラスホルダーの作成
    const iconsDir = path.join(config.projectPath, 'src-tauri/icons');
    await fs.ensureDir(iconsDir);

    const iconsReadme = `# Icons

Add the following icon files:
- 32x32.png
- 128x128.png
- 128x128@2x.png
- icon.icns (macOS)
- icon.ico (Windows)

You can generate these from a single high-resolution icon using tools like:
- Tauri Icon Tool (tauri icon)
- Online icon generators
- Design software like Figma, Sketch, etc.

For now, placeholders will be generated during build.
`;

    await fs.writeFile(path.join(iconsDir, 'README.md'), iconsReadme);
}
