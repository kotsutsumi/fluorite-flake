# readme-generator/index.ts レビュー報告書

## 概要

`src/utils/readme-generator/index.ts` は README 生成ロジックを公開するためのシンプルなバレルファイルです。`generateReadmeContent` のみを再エクスポートし、他モジュールがディレクトリ構造に依存せず利用できるようにします。

## エクスポート

- `generateReadmeContent` (`./generate-content.js`)

## 留意点

- 将来的に README 生成に関する補助関数を追加する場合は、このファイルでのエクスポートを忘れずに行ってください。
- エクスポート専用ファイルのため、副作用やロジックを追加しないポリシーを維持します。