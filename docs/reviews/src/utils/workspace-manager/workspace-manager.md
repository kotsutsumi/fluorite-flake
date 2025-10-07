# workspace-manager/workspace-manager.ts レビュー

## 概要
`WorkspaceManager` はモノレポの apps / packages 配下をスキャンし、ワークスペース構造の検出・変換・ルートスクリプト生成を行う中核クラスです。今回の更新で `pnpm --filter … run …` 形式のコマンドを一貫して出力し、ルート `package.json` とアプリケーションスクリプトの整合性を取りやすくなりました。

## 主要メソッド
- **detectWorkspaces(projectPath)**: `apps` / `packages` を走査し、`package.json` を読み込んで `WorkspaceConfig` を構築。
- **generateRootScripts(workspace)**: 各アプリの `scripts` を `<app>:<script>` 形式に変換し、`dev` / `build:all` などの集約スクリプトも生成。
- **convertToWorkspace(projectPath)**: 既存プロジェクトを `apps/web` へ移動し、`pnpm-workspace.yaml` とルート `package.json` を初期化。
- **buildFilterCommand(app, script)**: `pnpm --filter "app" run "script"` を生成。`quoteIfNeeded` でスペースやクォートを安全に扱う。

## 実装ハイライト
### ワークスペース検出
- `scanDirectory` が `package.json` の存在を確認して有効なディレクトリに限定。
- `detectAppType` / `detectPackageType` でテンプレート名から型推定。
- 取得した `packageJson` を `AppInfo` / `PackageInfo` に格納。

### スクリプト生成
- ループで `app.scripts` を読み取り、`pnpm --filter` コマンドへ変換。
- `generateAggregatedScripts` が `dev` や `build:all` を `run` サブコマンド付きで組み立て、複数アプリでも動作する構成。
- コマンド文字列は `quoteIfNeeded` によって必要に応じてダブルクォートで囲まれる。

### 既存プロジェクト変換
- `moveToAppsDirectory` が Next.js 系ディレクトリを `apps/web` へ移動し、`package.json` はコピーで保持。
- `createWorkspaceFile` が `packages: ["apps/*", "packages/*"]` を持つ `pnpm-workspace.yaml` を生成。
- `updateRootPackageJson` が最小限のスクリプトとエンジン要件を持つルート `package.json` を書き出し。

## 品質評価
✅ `pnpm --filter` 形式が統一され、コマンド実行の誤解が減少
✅ コメントでメソッド目的が明示されており可読性が高い
✅ 追加のヘルパー(`buildFilterCommand` / `quoteIfNeeded`)で特殊文字を含む名前にも対応

## 改善メモ
- `convertToWorkspace` の移動対象リストはテンプレート依存なので、将来的には設定ファイル化を検討
- ルート `package.json` 書き換え前に差分比較を導入すると更に安全