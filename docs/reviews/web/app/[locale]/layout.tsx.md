# web/app/[locale]/layout.tsx レビュー

## 変更概要
- `sidebar.defaultMenuCollapseLevel` を `1` に設定し、Nextra 側の期待値に合わせてサイドバーが確実に描画されるよう調整しました。
- `Metadata` 型のインポートを先頭で明示し、TypeScript の型解決を維持しています。

## 技術的な狙いと影響
- サイドバーが常に展開された状態で表示されるため、トップページでもメニュー階層が視認できるようになります。
- 既存のレイアウト構造や翻訳テキストには影響せず、副作用はありません。

## テスト結果
- `pnpm lint`
- `pnpm format`
- `pnpm test:run`
- `pnpm build`
- `pnpm --filter fluorite-docs build`

`pnpm --filter fluorite-docs build` にてドキュメントの静的書き出しが完了することを確認しました。