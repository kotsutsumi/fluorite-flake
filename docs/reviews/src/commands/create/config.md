# create/config.ts レビュー報告書

## 概要

`src/commands/create/config.ts` は CLI から受け取った引数を検証しつつ `ProjectConfig` を生成するファクトリ関数 `createProjectConfig()` を提供します。monorepo フラグの解決と pnpm 環境確認、テンプレート検証を一箇所に集約した調整層です。

## 主なロジック

1. `options.simple` / `options.monorepo` の組み合わせから最終的な `willUseMonorepo` を決定。デフォルトは `true`。
2. monorepo が有効な場合 `validatePnpm()` を呼び出し、未インストールまたはバージョン不足なら `null` を返却。
3. `validateProjectType()` で指定タイプを確認し、不正なら `null`。
4. プロジェクト名・ディレクトリ・テンプレートに既定値を適用。
5. `validateTemplate()` でテンプレートがタイプに適合するか判定。
6. すべての検証に成功したら `ProjectConfig` を構築して返す。

## 依存モジュール

- `../../utils/pnpm-validator/index.js`: pnpm の存在とバージョンを検証。
- `./constants.js`: プロジェクトタイプごとの許可テンプレート一覧。
- `./types.js`: `CreateOptions` / `ProjectConfig` の型定義。
- `./validators.js`: プロジェクトタイプとテンプレートのバリデーション関数。

## 留意点

- `options.template` を指定しない場合は `"typescript"` にフォールバックするため、テンプレートの初期値を変更する際はここも更新が必要。
- `force` フラグは論理値キャストのみを行い、副作用は呼び出し側 (`commands.ts`) に委ねている。
- pnpm 検証に失敗した場合のユーザーメッセージはバリデータ側に依存するため、追加の説明が必要なら呼び出し側でハンドリングを検討する。