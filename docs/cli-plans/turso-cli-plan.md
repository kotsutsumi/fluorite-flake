# Turso CLI Integration Plan

## 1. 目的
- Turso CLI (`turso`) のデータベース管理機能を Node.js から呼び出せる形に抽象化し、Fluorite Flake の DB プロビジョニングを安定化させる。
- CLI パラメータ試行錯誤から脱却し、`createDatabase`, `listDatabases`, `issueToken` などを関数として提供。

## 2. 対応範囲
- 認証確認 (`turso auth status`, `turso auth login`)
- データベース作成/削除 (`turso db create`, `turso db destroy`)
- トークン発行 (`turso db tokens create/list/revoke`)
- レプリカ操作 (`turso db replicas create/list/destroy`)
- バックアップ/リストア (`turso db dump`, `turso db load`)
- CLI バージョン取得 (`turso --version`)

## 3. モジュール設計
```
src/cli-adapters/turso/
  index.ts
  client.ts             # runTursoCommand
  auth.ts
  databases.ts
  tokens.ts
  replicas.ts
  backups.ts
  types.ts
  errors.ts
```
- `databases.ts` で `createDatabase({ name, region })`, `deleteDatabase(name)` などの関数を提供。
- `tokens.ts` で RW/RO トークン発行をサポートし、環境変数更新に利用。

## 4. エラーハンドリング
- `turso` の標準エラーをパースし、`TursoCliError` としてラップ。
- データベース重複・未存在などの典型的なエラーを専用エラー型に分類。
- 認証未済みの場合は `TursoCliAuthError` を投げ、ログイン方法をメッセージに含める。

## 5. テスト戦略
- ユニット: `runTursoCommand` モックで引数構築とエラーラップをテスト。
- 機能テスト: `turso auth status`, `turso db list` などを実行して正常終了を確認。
- シナリオテスト: テスト用 DB を作成→トークン発行→削除する一連の流れを `tests/scenario/turso.test.ts` で検証。

## 6. 実装手順
1. `client.ts` と共通エラーハンドリングを実装。
2. DB 作成・削除関数を追加し、既存のジェネレーターが利用するよう修正。
3. トークン発行関数を実装し、環境ファイル更新時に利用。
4. レプリカ/バックアップ操作を必要に応じて追加。
5. テスト整備とドキュメント作成。

## 7. 注意事項
- テストで DB を作成する際は命名規則（例: `ff-test-{timestamp}`）を徹底し、失敗時も確実に削除する。
- CLI のリージョンパラメータなど、オプションのデフォルト値を明示的に設定。
- 大量の API 呼び出しでレート制限が発生し得るため、リトライロジックや待機を実装する。
