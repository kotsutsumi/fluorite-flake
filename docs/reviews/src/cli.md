# CLI エントリーポイントレビュー報告書

## 概要

`src/cli.ts` は Fluorite Flake CLI のエントリーポイントであり、`citty` の `defineCommand` / `runMain` を用いてコマンドツリーを定義・実行します。開発モード時の診断や作業ディレクトリ初期化を支援しつつ、ヘルプ出力をローカライズされたメッセージで構成します。

## 実行フロー

1. `isDevelopment()` を判定し、開発環境であれば `printDevelopmentInfo()` と `setupDevelopmentWorkspace()` を実行。
2. `defineCommand()` でメインコマンドを定義し、`create` / `new` サブコマンドを登録。
3. `run()` ハンドラ内で `getMessages()` から取得した文言を用いてヘッダーとコマンド一覧、使用例を順番に表示。
4. `runMain(main)` によって CLI を起動。

## 依存モジュール

- `./commands/create/index.js`: `create` / `new` サブコマンドの実装。
- `./debug.js`: 開発モード向けのログ出力とワークスペース準備。
- `./header.js`: CLI 起動時のバナー表示。
- `./i18n.js`: ロケール依存メッセージの取得。

## 留意点

- 開発モード限定の処理は `NODE_ENV=development` でのみ発火するため、本番環境への影響はない。
- メタ情報の `version` は固定文字列となっており、リリース時に更新漏れがないか確認が必要。
- ヘルプ出力は `cli.commandLines` / `cli.exampleLines` の配列順序に依存するため、メッセージファイル編集時は項目の並びを保持すること。