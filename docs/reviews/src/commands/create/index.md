# create/index.ts レビュー報告書

## 概要

`src/commands/create/index.ts` は `create` コマンド関連のモジュールを再エクスポートし、呼び出し側が単一エントリから必要な機能を取得できるようにするバレルファイルです。CLAUDE ガイドラインで求められるディレクトリ構造に沿ったエクスポート集約を担います。

## エクスポート一覧

- `createCommand`, `newCommand`: `./commands.js`
- `createProjectConfig`: `./config.js`
- `PROJECT_TEMPLATES`: `./constants.js`
- `generateProject`: `./generator.js`
- `CreateOptions`, `ProjectConfig`: `./types.js`
- `validateProjectType`, `validateTemplate`: `./validators.js`

## 役割

- 外部からは `src/commands/create/index.js` を参照するだけで、コマンド実行・設定生成・検証などの機能にアクセス可能。
- ESM 形式で拡張子 `.js` を明示し、プロジェクト全体のモジュール解決ポリシーに一致させています。

## 留意点

- 新しいユーティリティや型を追加した場合はこのファイルのエクスポートも更新し、公開 API の一貫性を保つこと。
- `index.ts` 内にはロジックを記述せず、エクスポート宣言のみに留めるというガイドラインを遵守しています。