# create/types.ts レビュー報告書

## 概要

`src/commands/create/types.ts` は `create` コマンドで使用するオプション・設定の型定義を提供します。CLI 引数の取り扱いとプロジェクト生成ロジック間の契約を明確にし、TypeScript の strict 設定下で安全なデータフローを実現します。

## 型定義

- `CreateOptions`
  - CLI 受け取り時点の値を表現。`name` / `template` / `force` / `dir` / `monorepo` / `simple` を任意プロパティとして定義。
- `ProjectConfig`
  - バリデーションを通過した構成値。`type` は `"nextjs" | "expo" | "tauri"` のユニオンに限定され、`directory` や `monorepo` など必須値で表現。

## 利用箇所

- `src/commands/create/config.ts`: `createProjectConfig()` の引数・戻り値として使用。
- `src/commands/create/commands.ts`: CLI 引数から `CreateOptions` を構築し、設定を生成。
- `src/commands/create/generator.ts`: プロジェクト作成処理に `ProjectConfig` を渡す。

## 留意点

- `ProjectConfig.template` はオプショナルとして定義されていますが、`createProjectConfig()` では最低でも `"typescript"` が代入されるため、呼び出し側で `undefined` ハンドリングを忘れないようにしてください。
- 新しい CLI オプションを追加する場合は `CreateOptions` にもフィールドを追加し、関連する翻訳メッセージを更新する必要があります。