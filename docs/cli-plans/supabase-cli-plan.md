# Supabase CLI Integration Plan

## 1. 目的
- Supabase CLI (`supabase`) の操作（プロジェクト管理、DB マイグレーション、シークレット管理など）を Node.js モジュール化。
- Fluorite Flake から Supabase プロジェクトを安全にプロビジョニング／設定できるようにする。

## 2. 対応範囲
- プロジェクト操作 (`supabase projects list/create/delete`)
- 認証確認 (`supabase login`, `supabase status`)
- データベースマイグレーション (`supabase db push/pull/diff`
- シークレット管理 (`supabase secrets list/set/unset`)
- ストレージ/Edge Function 操作（必要に応じて）
- ローカル開発 (`supabase start`, `supabase stop`)

## 3. モジュール設計
```
src/cli-adapters/supabase/
  index.ts
  client.ts             # runSupabaseCommand
  projects.ts
  database.ts
  secrets.ts
  auth.ts
  local.ts              # ローカル開発関連
  types.ts
  errors.ts
```
- `database.ts` では `pushMigrations`, `createMigration` など関数を定義。
- `secrets.ts` で `.env` 同期のラッパーを提供。

## 4. エラーハンドリング
- 認証未設定 (`supabase login` 未実行) 時は `SupabaseCliAuthError`。
- プロジェクト未選択などコマンド出力から判別できるケースをカスタムエラーに変換。
- `supabase` は JSON 出力をサポートするため、`--json` オプションでパースを徹底。

## 5. テスト戦略
- ユニットテスト: `client.ts` をモックし、引数構築とエラーラップを確認。
- 機能テスト: テスト用 Supabase プロジェクトを用意し、`projects list`, `db push`（dry-run）を実行。
- シナリオテスト: Next.js + Supabase テンプレート生成後、`supabase secrets set` を使って環境変数を同期させる流れを検証。

## 6. 実装手順
1. `client.ts` で共通ラッパーと JSON パースユーティリティを実装。
2. プロジェクト一覧取得関数を整備し、既存の環境セットアップロジックで利用。
3. `database.ts` へマイグレーション実行関数を追加し、ジェネレーターから呼び出す。
4. シークレット管理関数・テストを追加し、`.env` 同期処理を整理。
5. ローカルスタック起動 (`supabase start`) の補助関数を実装し、テストヘルパーで利用。
6. ドキュメントを整備し、使い方と注意点を共有。

## 7. 注意事項
- CLI は Docker に依存する操作があるため、実行環境で利用可能か事前チェックする。
- テストでプロジェクトを作成する場合は、命名規則とクリーンアップを徹底。
- `supabase db push` は destructive な操作のため、dry-run モードやテンポラリ DB を利用して安全性を確保。
