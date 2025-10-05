# monorepo-generator/index.ts レビュー報告書

## 概要

`src/utils/monorepo-generator/index.ts` は monorepo 初期化に関するユーティリティを再エクスポートするバレルファイルです。テンプレートコピー・ディレクトリ作成・Web アプリ用 `package.json` 生成の 3 関数をまとめ、呼び出し元からの参照を単純化します。

## エクスポート

- `copyMonorepoTemplates`
- `createMonorepoStructure`
- `createWebAppPackageJson`

いずれも同一ディレクトリ内の `.js` 拡張子を明示した ESM import を利用しています。

## 留意点

- 新たな monorepo 関連ユーティリティを追加した場合は、このファイルでのエクスポート忘れに注意。
- 実装ロジックは持たず、エクスポート専用というプロジェクトガイドラインを順守しています。