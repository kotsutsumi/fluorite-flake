# create/commands.ts レビュー報告書

## 概要

`src/commands/create/commands.ts` は `citty` の `defineCommand` を用いて `create` / `new` コマンドを定義し、プロジェクト生成の実行フローを調整する中核となるファイルです。国際化されたメッセージを利用しながら、pnpm 検証やユーザー入力ユーティリティを統合しています。

## 主な処理

- `createCommand`
  - メタ情報と引数定義を `getMessages()` の結果から構築。
  - `--simple` 指定時は monorepo 判定を上書きしてシンプルモードへ切り替え。
  - monorepo モードであれば `validatePnpm()` を実行し、バージョン不足や未インストールの場合は即終了。
  - プロジェクト名が未指定のとき `promptForProjectName()` を呼び出し、入力値をバリデーション。
  - `createProjectConfig()` で組み立てた設定を `generateProject()` に渡し、例外時は `process.exit(1)`。
  - `--force` が無い場合は `confirmDirectoryOverwrite()` で既存ディレクトリを安全に確認。
- `newCommand`
  - `createCommand` の完全なエイリアスとして、同じ引数定義と `run` ハンドラを再利用。

## 依存モジュール

- `../../debug.js`: `debugLog()` により CLI デバッグメッセージを出力。
- `../../i18n.js`: 引数説明やスピナー文言などローカライズ済みテキストを提供。
- `../../utils/pnpm-validator/index.js`: pnpm 環境チェックで使用。
- `../../utils/user-input/index.js`: 対話的入力および上書き確認を担う。
- `./config.js`: 引数から `ProjectConfig` を生成。
- `./generator.js`: 実際のプロジェクト作成ロジック。

## 留意点

- monorepo 判定は `--simple` フラグを優先しており、今後モードが増える場合はこのロジックの見直しが必要。
- CLI 引数の説明文は i18n JSON に依存するため、新規引数追加時は翻訳ファイルも同時更新する。
- `process.exit()` を多用する構成のため、ユニットテストではモック化や `vi.spyOn(process, "exit")` の対応が必要。