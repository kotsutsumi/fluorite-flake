# web/content/en/index.mdx レビュー

## 変更概要
- 新設した `Hero` 系コンポーネントを使ってグラデーション背景・主要 CTA・ステータス統計を備えたヒーローセクションに刷新しました。
- `FeatureGrid` / `StepTimeline` / `ResourceGrid` など再利用可能なブロックで章立てを構成し、機能紹介・導入手順・リソース導線をカードスタイルで再配置しました。
- 国際化や品質ゲートを強調する説明文へアップデートし、強調箇所にはカスタムスタイル付きリストやコードハイライトを利用しています。

## 技術的な狙いと影響
- Tailwind ユーティリティベースのコンポーネント化により、Nextra 依存のデフォルト UI から脱却しつつダークモードを含めて統一したブランド表現を確保しました。
- CTA やセクション単位をコンポーネント化したことで、多言語ページ間で同じ体験を簡潔に再利用できます。
- MDX のみの更新であり、ビルドや TypeScript 型定義への副作用はありません。

## テスト結果
- `pnpm lint`
- `pnpm format`
- `pnpm test:run`
- `pnpm build`
- `pnpm --filter fluorite-docs build`

`pnpm --filter fluorite-docs build` にてドキュメントの静的書き出しが完了することを確認しました。
