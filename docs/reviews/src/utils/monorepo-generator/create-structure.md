# monorepo-generator/create-structure.ts レビュー報告書

## 概要

`src/utils/monorepo-generator/create-structure.ts` は monorepo プロジェクトで必要となるディレクトリ階層を作成します。テンプレートコピーや Web アプリ雛形生成の前段階として、`apps` / `packages` などの基本構造を整えます。

## 生成されるディレクトリ

- プロジェクトルート (`config.directory`)
- `apps/`
- `packages/`
- `apps/web/`

`fs.mkdirSync(dir, { recursive: true })` を用いることで、中間ディレクトリが存在しなくても一括で生成されます。

## 留意点

- 既存ディレクトリがある場合は何もせずスキップするため、再実行時に上書きは発生しません。
- 追加のアプリ種別やパッケージが必要になった場合は、このリストに新しいパスを追加し、関連テンプレートの整備も合わせて行う必要があります。