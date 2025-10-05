# debug.ts レビュー報告書

## 概要

`src/debug.ts` は開発モード専用のデバッグユーティリティを集約し、診断情報の出力・一時ディレクトリの準備・条件付きログを提供します。`NODE_ENV=development` をトリガーに動作し、本番利用時の副作用を回避しています。

## 提供関数

- `isDevelopment()`
  - `process.env.NODE_ENV` が `"development"` の場合に `true`。
- `printDevelopmentInfo()`
  - ローカライズされた `debug` メッセージを利用し、開発モードのフラグ・カレントディレクトリ・Node バージョン・CLI 引数を `chalk.gray` で出力。
- `setupDevelopmentWorkspace()`
  - `temp/dev` ディレクトリを作成して `process.chdir()` で移動。ディレクトリ変更をログ化。
- `debugLog(message, data?)`
  - 開発モード中のみ `debug.debugMessage` を整形して出力。オプションで JSON フォーマットした `data` を追記。

## 依存モジュール

- `chalk`: 統一したグレーのスタイルを適用。
- `fs`, `path`: 一時ディレクトリ作成とパス処理。
- `getMessages()` (`./i18n.js`): 出力文言の国際化。

## 留意点

- `setupDevelopmentWorkspace()` は `process.chdir()` を実行するため、テストでは `process.cwd()` の復元を忘れずに行うこと。
- ログ出力は `console.log` を使用しているため、ユニットテストでのキャプチャにはモックが必要。
- `debugLog()` の `data` 引数は任意であり、複雑なオブジェクトを渡す場合は JSON 変換できる構造か確認する。