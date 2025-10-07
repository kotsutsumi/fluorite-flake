# vercel-cli/vercel-cli.ts レビュー報告書

## 概要

`src/utils/vercel-cli/vercel-cli.ts` は Vercel CLI を同期実行するラッパークラス `VercelCLI` を定義し、主要コマンドを TypeScript から安全に呼び出せるようにします。`execSync` を共通化した `executeCommand()` と補助的な引数ビルダーを備え、豊富な操作メソッドを提供します。

## アーキテクチャ

- `executeCommand(command, options)`
  - グローバルオプションを組み立て、`vercel {command}` を実行。
  - 成功時/失敗時に `VercelCommandResult` を生成。
- `buildGlobalArgs()` / `buildDeployArgs()`
  - オプションオブジェクトを CLI フラグへ変換し、重複するロジックを集約。
- 公開メソッド
  - `deploy`, `list`, `envList`, `envAdd`, `envRemove`, `envPull`, `domainsList`, `domainsAdd`, `domainsRemove`, `projectList`, `projectAdd`, `projectRemove`, `logs`, `link`, `dev`, `build`, `promote`, `remove`, `rollback`, `redeploy`, `whoami`, `login`, `logout`, `execute` など、Vercel CLI の主要機能を包括。

## エラーハンドリング

- `execSync` で投げられた例外をキャッチし、`stdout` / `stderr` / `exitCode` を可能な限り取り出して返却。
- 失敗時には `command` フィールドに実行しようとしたコマンドを記録し、デバッグを支援。

## 留意点

- `execSync` の同期実行により、長時間実行されるコマンドはプロセスをブロックする。必要に応じて非同期化やタイムアウト検討が必要。
- 追加フラグはメソッド個別に手作業でマッピングしているため、Vercel CLI の更新に追随する際はフラグ漏れに注意。
- グローバル引数 `args` は配列のまま展開されるため、ユーザー入力を引き渡す際にはシェルインジェクション対策として信頼できる値のみを渡すこと。