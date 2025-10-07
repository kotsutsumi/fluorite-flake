# create/validators.ts レビュー報告書

## 概要

`src/commands/create/validators.ts` は `create` コマンドにおける入力検証を担当し、プロジェクトタイプとテンプレートの整合性をチェックします。単純なユーティリティ関数に分離することで、他モジュールから再利用しやすくしています。

## 提供関数

- `validateProjectType(type)`
  - `PROJECT_TEMPLATES` にキーが存在するか判定し、型ガードとして機能。
- `validateTemplate(type, template)`
  - タイプごとの許可テンプレート配列に `template` が含まれるか確認。

## 依存

- `src/commands/create/constants.ts`: 許可テンプレート一覧を参照。

## 留意点

- いずれの関数も副作用を持たない純粋関数のため、テストが容易。
- 未知のプロジェクトタイプやテンプレートを追加する場合は、`constants.ts` の更新と合わせてユニットテストを拡張すること。