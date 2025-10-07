# README 生成機能レビュー報告書

## 概要

`src/utils/readme-generator/generate-content.ts` は、`ProjectConfig` と i18n メッセージを用いて README.md の Markdown テキストを生成するモジュールです。monorepo / シンプル両方の構成に対応し、ローカライズ済みのセクションタイトルとコマンドチートシートを自動整形します。

## エントリーポイント

- `generateReadmeContent(config)`
  - `config.monorepo` を真偽判定し、`generateMonorepoReadme()` または `generateSimpleReadme()` を選択。
  - `getMessages()` から取得した `readme` セクションを処理対象に渡します。

## シンプルプロジェクト用テンプレート

- `generateSimpleReadme()`
  - `readme.gettingStartedCommands` 配列をコードフェンス付きの Markdown ブロックに整形。
  - プロジェクト名 (`{name}`)、タイプ (`{type}`)、テンプレート (`{template}`) をプレースホルダ置換。
  - `convertToMonorepoHeading` / `convertToMonorepoCommand` を利用し、単一プロジェクトから monorepo へ移行する手順を案内。

### 出力構造

1. タイトルと概要説明。
2. Getting Started（コマンド配列を順番に展開）。
3. Learn More（テンプレート説明）。
4. Converting to Monorepo（CLI コマンド例付き）。

## Monorepo プロジェクト用テンプレート

- `generateMonorepoReadme()`
  - `developmentCommands` / `buildingCommands` / `testingCommands` をコードフェンス化し、pnpm を前提としたワークフローを提示。
  - ワークスペースのディレクトリ構造を ASCII ツリーとして埋め込み、apps / packages / workspace 設定ファイルの役割を注記。
  - `readme.monorepoDescription` や `workspaceStructureDescription` を差し込み、pnpm + Turbo の運用前提を説明。

## i18n 依存

- すべての文言は `getMessages()` に委ねており、`en.json` / `ja.json` に定義されたプレースホルダを `String.replace` で補完。
- コマンド配列は JSON 側でメンテナンスできるため、ロケール追加時のコード変更を不要化。

## 品質メモ

- Markdown 出力はテンプレート文字列ベースで、`\n` を明示的に記述。整形ルール変更時はテンプレートの視認性維持に留意。
- ASCII ツリー内のコメント（`# メインWebアプリケーション` 等）は日本語固定のため、多言語対応が必要になれば JSON 側へ移行する方針が望ましい。
