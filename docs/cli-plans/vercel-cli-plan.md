# Vercel CLI Integration Plan

## 1. 目的
- Vercel CLI (`vercel`) のコマンドを Node.js モジュールで抽象化し、デプロイ・環境変数・ストア関連操作を統一的に扱う。
- CLI 呼び出しに伴うオプションや出力形式のばらつきを吸収し、Fluorite Flake のジェネレーターから安全に利用できる API を提供。

## 2. 対応範囲
- プロジェクトのリンク/情報取得 (`vercel link`, `vercel projects ls`, `vercel inspect`)
- デプロイ操作 (`vercel`, `vercel --prod`, `vercel deploy`)
- 環境変数管理 (`vercel env add/pull/rm`)
- ストア (Blob, KV) 設定 (`vercel storage` 系)
- 認証状態確認 (`vercel whoami`, `vercel login`)
- CLI バージョン取得 (`vercel --version`)

## 3. モジュール設計
```
src/cli-adapters/vercel/
  index.ts              # エクスポート
  client.ts             # 共通 runVercelCommand
  projects.ts           # プロジェクト関連操作
  deployments.ts        # デプロイ関連操作
  env.ts                # 環境変数管理
  storage.ts            # Blob / KV 他
  auth.ts               # 認証・ユーザー情報
  types.ts              # 型定義
  errors.ts             # エラークラス
```
- `runVercelCommand(args, options)` で CLI 実行を標準化。
- `deployments.ts` では `deployProject({ path, prod, env })` など上位レベル API を提供。

## 4. エラーハンドリング
- 認証切れやリンク未済みは `VercelCliAuthError` / `VercelCliProjectError` として投げる。
- CLI 出力(JSON対応可)をパースするユーティリティを用意し、`--confirm` などの安全オプションをデフォルト付与。
- タイムアウト・ネットワークエラーもラップしてユーザーに伝わるメッセージを生成。

## 5. テスト戦略
- ユニット: `runVercelCommand` をモックし、各関数が正しい引数を渡すか検証。
- 機能テスト: 実 CLI を呼び出し、テスト用プロジェクトで `vercel projects ls`, `vercel env pull` などを行う。
- シナリオ: 生成した Next.js プロジェクトを `vercel deploy --dry-run`（利用可能なら）で検証するワークフローを構築。

## 6. 実装手順
1. `client.ts` と共通エラーラッパーを実装。
2. プロジェクトリンク/確認関数を追加して既存ジェネレーターから置き換え。
3. デプロイ関連 API を追加し、`setup-deployment.sh` の代替として Node モジュールを提供。
4. 環境変数・ストレージ操作関数を実装し、既存のシェルスクリプト呼び出しを移行。
5. テスト（unit/functional/シナリオ）を整備。
6. ドキュメント作成 (`docs/cli-usage/vercel.md`)。

## 7. 注意事項
- プロジェクトリンクにユーザー入力が必要な場合があるため、`--yes` や `--token` オプションで自動化可能か検証。
- `vercel env pull` はローカルファイルを書き換えるので、テンポラリディレクトリで実行するテストを追加。
- Blob ストアなどはコマンドがベータの可能性があるため、バージョン互換性を記録しておく。
