# create/constants.ts レビュー報告書

## 概要

`src/commands/create/constants.ts` は `create` コマンドで利用できるテンプレート群を `PROJECT_TEMPLATES` 定数として公開します。プロジェクトタイプごとに許可されるテンプレート名を配列で保持し、検証ロジックの基礎データとなります。

## データ構造

```typescript
export const PROJECT_TEMPLATES = {
    nextjs: ["typescript", "app-router", "pages-router", "javascript"],
    expo: ["typescript", "tabs", "navigation", "javascript"],
    tauri: ["typescript", "react", "vanilla", "javascript"],
} as const;
```

- キーは `nextjs` / `expo` / `tauri` の 3 タイプ。
- 各値はリードオンリー配列 (`as const`) のため、後続の型推論で正確なテンプレート名が得られます。

## 利用箇所

- `src/commands/create/validators.ts`: `validateProjectType()` と `validateTemplate()` の基礎データ。
- `src/commands/create/config.ts`: テンプレート検証およびプロジェクトタイプの絞り込み。
- `src/commands/create/types.ts`: `ProjectConfig` の `type` プロパティに対応する許可値。

## 留意点

- テンプレート一覧を更新した際は、対応する翻訳メッセージ (`availableTemplates` など) も併せて修正する必要があります。
- `as const` を外すと型安全性が低下し、バリデーションが成立しなくなるため注意してください。