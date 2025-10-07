// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

// コマンドハンドラー：フロントエンドから呼び出し可能
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// システム情報を取得するコマンド
#[tauri::command]
fn get_system_info() -> serde_json::Value {
    serde_json::json!({
        "platform": std::env::consts::OS,
        "architecture": std::env::consts::ARCH,
        "version": env!("CARGO_PKG_VERSION")
    })
}

// ファイル操作の例
#[tauri::command]
async fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path)
        .map_err(|e| format!("ファイル読み込みエラー: {}", e))
}

#[tauri::command]
async fn write_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content)
        .map_err(|e| format!("ファイル書き込みエラー: {}", e))
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            greet,
            get_system_info,
            read_file,
            write_file
        ])
        .setup(|app| {
            // アプリケーション起動時の初期化処理
            println!("Tauri app is starting up...");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Tauriアプリケーションの実行エラー");
}
