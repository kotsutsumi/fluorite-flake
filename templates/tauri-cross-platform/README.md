# Tauri + React クロスプラットフォームアプリ

デスクトップ（Windows、macOS、Linux）とモバイル（iOS、Android）で動作するクロスプラットフォームアプリケーションです。

## 特徴

- 🚀 **高速**: Rustバックエンドによる高速な処理
- 🎯 **クロスプラットフォーム**: デスクトップとモバイルで同じコードベース
- ⚡ **モダンフロントエンド**: React + Vite による高速な開発体験
- 🔒 **セキュア**: Tauriのセキュリティ機能による安全なアプリケーション
- 📱 **レスポンシブ**: どの画面サイズでも美しいUI

## 前提条件

### デスクトップ開発
- [Node.js](https://nodejs.org/) (v16以上)
- [Rust](https://rustup.rs/)
- プラットフォーム固有の依存関係:
  - **Windows**: Microsoft C++ Build Tools
  - **macOS**: Xcode Command Line Tools
  - **Linux**: 開発用ライブラリ（webkit2gtk、gtk3など）

### モバイル開発（オプション）
- **Android**: Android Studio と Android SDK
- **iOS**: Xcode (macOSのみ)

## 開発環境のセットアップ

1. **依存関係のインストール**:
   ```bash
   npm install
   ```

2. **Rustの依存関係をビルド**:
   ```bash
   cargo build
   ```

3. **開発サーバーの起動**:
   ```bash
   npm run tauri:dev
   ```

## スクリプト

- `npm run dev` - Vite開発サーバーを起動
- `npm run build` - フロントエンドをビルド
- `npm run tauri:dev` - Tauriアプリを開発モードで起動
- `npm run tauri:build` - プロダクション用アプリをビルド
- `npm run lint` - ESLintでコードをチェック
- `npm run format` - Prettierでコードをフォーマット

## モバイル開発

### Android

1. **Android環境の初期化**:
   ```bash
   npm run tauri android init
   ```

2. **Android開発サーバーの起動**:
   ```bash
   npm run tauri:android
   ```

### iOS

1. **iOS環境の初期化**:
   ```bash
   npm run tauri ios init
   ```

2. **iOS開発サーバーの起動**:
   ```bash
   npm run tauri:ios
   ```

## プロジェクト構造

```
├── src/                    # React フロントエンドソース
│   ├── components/        # Reactコンポーネント
│   ├── pages/            # ページコンポーネント
│   ├── utils/            # ユーティリティ関数
│   ├── App.tsx           # メインAppコンポーネント
│   └── main.tsx          # アプリケーションエントリーポイント
├── src-tauri/             # Rustバックエンドソース
│   ├── src/              # Rustソースコード
│   ├── icons/            # アプリケーションアイコン
│   ├── Cargo.toml        # Rust依存関係設定
│   └── tauri.conf.json   # Tauri設定ファイル
├── public/               # 静的ファイル
└── dist/                 # ビルド成果物
```

## Tauriコマンド

アプリケーションには以下のRustコマンドが実装されています:

- `greet(name: string)` - 挨拶メッセージを返す
- `get_system_info()` - システム情報を取得
- `read_file(path: string)` - ファイルを読み込む
- `write_file(path: string, content: string)` - ファイルに書き込む

フロントエンドからの使用例:
```typescript
import { invoke } from '@tauri-apps/api/tauri';

// 挨拶を取得
const message = await invoke('greet', { name: 'World' });

// システム情報を取得
const systemInfo = await invoke('get_system_info');
```

## カスタマイズ

### 新しいRustコマンドの追加

1. `src-tauri/src/main.rs` に新しい関数を追加:
   ```rust
   #[tauri::command]
   fn my_custom_command(input: String) -> String {
       format!("処理結果: {}", input)
   }
   ```

2. `invoke_handler` に関数を追加:
   ```rust
   .invoke_handler(tauri::generate_handler![
       greet,
       get_system_info,
       my_custom_command  // 追加
   ])
   ```

3. フロントエンドから呼び出し:
   ```typescript
   const result = await invoke('my_custom_command', { input: 'テスト' });
   ```

## ビルドとデプロイ

### デスクトップアプリのビルド

```bash
npm run tauri:build
```

ビルドしたアプリケーションは `src-tauri/target/release/bundle/` に生成されます。

### モバイルアプリのビルド

**Android**:
```bash
npm run tauri android build
```

**iOS**:
```bash
npm run tauri ios build
```

## トラブルシューティング

### よくある問題

1. **Rustコンパイルエラー**: Rustツールチェーンが正しくインストールされているか確認
2. **Node.jsバージョンエラー**: Node.js v16以上を使用
3. **Androidビルドエラー**: Android SDK とJDKが正しく設定されているか確認
4. **iOSビルドエラー**: Xcodeが最新バージョンかつプロビジョニングプロファイルが設定されているか確認

### ログの確認

開発中のログは以下で確認できます:
- フロントエンド: ブラウザの開発者ツール
- バックエンド: ターミナルの出力
- モバイル: デバイスのログ（ADB logcat / Xcodeコンソール）

## 参考リンク

- [Tauri公式ドキュメント](https://tauri.app/)
- [React公式ドキュメント](https://react.dev/)
- [Vite公式ドキュメント](https://vitejs.dev/)
- [Rust公式ドキュメント](https://doc.rust-lang.org/)

## ライセンス

このプロジェクトは [MIT License](LICENSE) の下で公開されています。
