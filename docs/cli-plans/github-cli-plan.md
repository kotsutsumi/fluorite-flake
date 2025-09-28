# GitHub CLI Integration Plan

## 1. 目的
- GitHub CLI (`gh`) に対する操作を Node.js モジュール経由で抽象化し、CLI 呼び出しをフラットにせずに再利用しやすくする。
- 認証状態を前提に、リポジトリ操作・Issue/Pull Request 管理・Actions 実行などを関数レベルで提供する。

## 2. 対応範囲
- リポジトリ情報取得 (`gh repo view`, `gh repo list`)
- Issue / PR 操作（作成・一覧取得・マージなど）
- Actions ワークフロー実行 (`gh workflow run`, `gh run watch`)
- シークレット管理 (`gh secret set`, `gh secret list`)
- CLI バージョン確認と環境診断 (`gh --version`, `gh auth status`)

## 3. モジュール設計
```
src/cli-adapters/github/
  index.ts              # 公開 API
  client.ts             # 実際の gh コマンド実行 (execa wrapper)
  repositories.ts       # リポジトリ系ユースケース
  issues.ts             # Issue / PR 操作
  workflows.ts          # Actions ワークフロー
  secrets.ts            # シークレット管理
  types.ts              # 型定義
  errors.ts             # エラークラス
```
- `client.ts` にて `runGhCommand(args: string[], options?)` を実装し、標準化された戻り値（stdout/stderr/exitCode）を返す。
- 各ユースケースモジュールは `client.ts` のラッパーを呼び出し、入力・出力を型安全に変換する。

## 4. エラーハンドリング
- `execa` の例外を捕捉し、`GitHubCliError` としてラップ。
- 標準エラー出力から一般的なエラーパターン（認証切れ、リソース未存在など）をパースし、専用エラー型に変換。
- タイムアウトやコマンド未検出時のエラーも補足して開発者に分かりやすく提示。

## 5. テスト戦略
- `tests/functional/github-cli.test.ts`
  - コマンドを実行可能な環境で `gh auth status` などを実行し成功を検証。
  - モックが困難な場合でも、環境変数に `GH_TOKEN` が存在しない場合はスキップする仕組みを用意。
- `tests/unit/cli-adapters/github/*.test.ts`
  - 各関数について `execa` をモックし、引数構築やエラーラップ処理を確認。
- シナリオテスト（任意）
  - 新規 Issue を作成→取得→クローズする一連の動作を検証する（テスト用リポジトリに限定）。

## 6. 実装手順
1. `client.ts` に共通ラッパーを実装。
2. リポジトリ系関数 (`listRepositories`, `viewRepository`) を追加。
3. Issue / PR 操作を段階的に追加し、対応テストを整備。
4. Actions ワークフロー、シークレット管理を順次追加。
5. CLI バージョンや認証状態の確認関数を追加。
6. ドキュメント (`docs/cli-usage/github.md`) を更新し、利用方法と注意点を記載。

## 7. 注意事項
- 実行環境の `gh` バージョン差異を考慮し、ヘルプ出力からコマンド有無を検知する fallback を用意。
- 大量一覧コマンドは pagination オプションを受け取れるように設計。
- 認証トークンが必要な操作は、事前チェック `gh auth status --exit-with-token` を実行し、認証エラーを早期に検出。
