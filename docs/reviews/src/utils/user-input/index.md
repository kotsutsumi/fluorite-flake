# user-input/index.ts レビュー報告書

## 概要

`src/utils/user-input/index.ts` は ユーザー入力関連ユーティリティを再エクスポートし、`create` コマンドからの利用を簡素化するバレルファイルです。ディレクトリ構造ガイドラインに沿い、実装はエクスポート宣言のみで構成されています。

## エクスポート

- `confirmDirectoryOverwrite`: 上書き確認と安全な削除を行う非同期関数。i18n 済みメッセージを直接参照し、追加のフォールバックは不要になりました。
- `promptForProjectName`: `@clack/prompts` を介してプレースホルダー付きのテキスト入力を提供する非同期関数。空入力やキャンセル処理も API 内で完結します。

## 留意点

- 新しいユーザー入力ユーティリティを追加した際は、このファイルでのエクスポートを更新し、公開 API の整合性を保つこと。
- `promptForProjectName` の UI 依存 (`@clack/prompts`) を変更する場合は、併せて i18n キー（`projectNamePlaceholder` など）を確認すること。
- バレルファイル内にロジックを追加しないという CLAUDE ガイドラインを遵守しています。

