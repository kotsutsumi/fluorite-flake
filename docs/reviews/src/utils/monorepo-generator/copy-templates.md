# monorepo-generator/copy-templates.ts レビュー報告書

## 概要

`src/utils/monorepo-generator/copy-templates.ts` は monorepo 構成プロジェクトのテンプレートファイルをディスクへ展開するユーティリティです。テンプレートディレクトリから `package.json` を生成し、ワークスペース設定ファイルをコピーします。

## 処理内容

1. `import.meta.url` からテンプレートディレクトリ (`templates/monorepo`) のパスを計算。
2. `package.json.template` を読み込み、`{{PROJECT_NAME}}` プレースホルダを実際のプロジェクト名で置換して出力。
3. 下記ファイルをそのままコピーし、プロジェクト直下に配置:
   - `pnpm-workspace.yaml`
   - `turbo.json`
   - `biome.json.template` → `biome.json`
   - `tsconfig.base.json`

## 依存

- `fs`, `path`, `fileURLToPath`: テンプレートの読み込みとファイル書き込み。
- `ProjectConfig`: プロジェクトのターゲットディレクトリと名前を取得。

## 留意点

- テンプレートファイルが存在しない場合でもエラーを投げずにスキップするため、テンプレート追加時は存在確認を忘れずに行うこと。
- `biome.json` など上書き設計のファイルは、既存ファイルがあるプロジェクトに対して実行すると内容を置き換えるため注意が必要。