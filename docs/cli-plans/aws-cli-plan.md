# AWS CLI Integration Plan

## 1. 目的
- AWS CLI (`aws`) を Node.js モジュールから利用できるラッパーを整備し、S3 やその他 AWS サービスとの連携を明確化。
- ストレージジェネレーター（S3 選択時）などで直接 CLI コマンドを実行せず、統一 API を通じて操作する。

## 2. 対応範囲
- 認証/資格情報確認 (`aws sts get-caller-identity`, `aws configure list`)
- S3 バケット操作（作成・削除・ACL 設定・オブジェクトアップロード/削除）
- IAM ユーザー/ポリシー操作（必要最低限）
- CloudFormation 等を利用したスタック作成（将来的拡張）
- CLI バージョン確認 (`aws --version`)

## 3. モジュール設計
```
src/cli-adapters/aws/
  index.ts
  client.ts             # runAwsCommand
  auth.ts               # 認証・クレデンシャル確認
  s3.ts                 # S3 操作
  iam.ts                # IAM 補助（必要な範囲）
  cloudformation.ts     # スタック操作（必要に応じて）
  types.ts
  errors.ts
```
- `client.ts` に共通ラッパーを実装（`runAwsCommand(service, args, options)` など）。
- S3 操作用 `createBucket`, `putBucketPolicy`, `uploadObject`, `deleteObject` などを整備。

## 4. エラーハンドリング
- 標準エラーに出力されるエラーコード（`An error occurred (AccessDenied)` 等）をパースし、`AwsCliError` としてラップ。
- 認証情報が無い場合は `AwsCliAuthError` を投げ、適切なメッセージでガイド。
- 長時間かかる操作にはタイムアウトを設定し、ユーザーに進捗を返せるようにする。

## 5. テスト戦略
- ユニット: `runAwsCommand` の引数構築やエラーメッセージパースをモックで確認。
- 機能テスト: `aws sts get-caller-identity`、`aws s3 ls` を実行して環境が整っていることを検証。
- シナリオテスト: S3 バケット作成 → オブジェクトアップロード → 削除 → バケット削除の一連をテスト用バケットで検証し、クリーンアップする。

## 6. 実装手順
1. `client.ts` と共通エラーハンドリングを実装。
2. `auth.ts` に認証確認ユーティリティを追加し、ストレージジェネレーター起動前に呼び出す。
3. `s3.ts` にバケット生成・ポリシー設定・オブジェクト操作関数を整備し、既存処理をリファクタリング。
4. 必要に応じて IAM / CloudFormation モジュールを追加。
5. テスト整備とドキュメント更新。

## 7. 注意事項
- AWS CLI はプロファイル・リージョン設定が必要。`--profile`, `--region` オプションを引数で指定できる設計にする。
- 操作対象のリソース命名規則を統一（例: `fluorite-${project}-dev`）。
- 試験的な API を扱う場合はできる限り SDK（AWS SDK for JavaScript）に移行することも検討。
