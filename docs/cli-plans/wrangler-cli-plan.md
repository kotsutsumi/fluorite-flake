# Cloudflare Wrangler CLI Integration Plan

## 1. 目的
- Cloudflare Workers 用 CLI (`wrangler`) をモジュール化し、KV/R2/Workers デプロイなどを Node.js から制御可能にする。
- Fluorite Flake のジェネレーター（特に storage オプション）で Wrangler 操作を直接呼び出さないよう抽象化。

## 2. 対応範囲
- 認証 (`wrangler login`, `wrangler whoami`)
- Workers デプロイ (`wrangler deploy`, `wrangler publish`, `wrangler dev`)
- KV 名前空間操作 (`wrangler kv namespace create/list/delete`, `kv key put/get/delete`)
- R2 バケット (`wrangler r2 bucket create/list/delete`, `r2 object put/get`)
- D1 データベース操作（必要に応じて）
- プロジェクト生成 (`wrangler init`)

## 3. モジュール設計
```
src/cli-adapters/wrangler/
  index.ts
  client.ts             # runWranglerCommand
  auth.ts
  workers.ts
  kv.ts
  r2.ts
  d1.ts (optional)
  types.ts
  errors.ts
```
- `workers.ts` で `deployWorker({ configPath, env })` などの上位関数を提供。
- KV/R2 操作用にシンプルな CRUD 関数を整備。

## 4. エラーハンドリング
- 認証が必要な場合は `WranglerCliAuthError`。
- コマンド出力の「Error:」行を解析し、適切なエラー種別に変換。
- `wrangler` は JSON 出力サポートあり（`--json`）、取得系コマンドでは極力 JSON 形式で受け取る。

## 5. テスト戦略
- ユニット: 引数生成とエラーラップをモックで確認。
- 機能テスト: 実際に `wrangler whoami`, `wrangler kv namespace list` を実行し正常終了を検証。
- シナリオ: R2 ストレージ選択時、`wrangler r2 bucket create` → `wrangler r2 object put` → `wrangler r2 object delete` の流れを検証するテストを追加。

## 6. 実装手順
1. `client.ts` 実装 + エラーハンドリングユーティリティ整備。
2. 認証チェック (`whoami`) 関数を実装し、ストレージセットアップ前に呼び出すよう調整。
3. KV 名前空間作成関数を実装し、Cloudflare R2 選択時のセットアップスクリプトから呼び出す。
4. Workers デプロイ API 追加（将来的な Workers テンプレート対応を見据える）。
5. R2 操作用ヘルパーを実装し、ストレージジェネレーターで利用。
6. テスト（unit/functional）とドキュメント更新。

## 7. 注意事項
- コマンドの一部は対話式（例: `wrangler login`）。自動化には API トークン利用 (`--api-token`) を検討。
- CLI バージョンによってオプションの挙動が変わるため、実装時のサポートバージョンを記載し、変更に備える。
- 実リソースを作成する操作はテスト終了後に確実に削除する。
