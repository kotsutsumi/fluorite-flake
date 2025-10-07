# monorepo-generator/create-web-app.ts レビュー報告書

## 概要

`src/utils/monorepo-generator/create-web-app.ts` は monorepo プロジェクト内の `apps/web` ディレクトリへフレームワーク別の `package.json` を生成します。`ProjectConfig.type` に応じて Next.js / Expo / Tauri 向けの依存関係とスクリプトを切り替えます。

## 実装詳細

- `type` によって名前 (`${name}-web` など) やスクリプト、依存関係を分岐。
- 共通スクリプトとして `lint: "ultracite check"` と `typecheck: "tsc --noEmit"` を設定。
- Expo のみ `main` に `expo-router/entry` を設定し、モバイル向けビルドコマンドを追加。
- Tauri ではデスクトップ用途の CLI と Vite を devDependencies に含める。
- 最後に `apps/web/package.json` を JSON 文字列化 (`JSON.stringify(..., null, 2)`) して書き込み。

## エラーハンドリング

- 未対応の `type` が渡された場合は `Unsupported project type` のエラーを送出。

## 留意点

- バージョン番号は固定値のため、テンプレート更新時はここで手動調整が必要。
- Expo パッケージ名が `${name}-mobile`、Tauri が `${name}-desktop` と命名規則が異なる点に留意。
- `apps/web` ディレクトリは事前に `createMonorepoStructure()` で生成される前提。