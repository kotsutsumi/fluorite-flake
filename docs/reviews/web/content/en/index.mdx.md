# web/content/en/index.mdx レビュー

## 変更概要
- グラデーションヒーロー、CTA ボタン、統計カードを並べたファーストビューを実装しました。
- 新しい Feature / Step / Resource コンポーネントを利用して情報をカード・タイムライン形式で再整理しました。
- HTML ネストの不整合を解消するため、CTA テキストとステップ内コードのマークアップを調整しました。

## 技術的な狙いと影響
- カスタムコンポーネントにより、Nextra 既定の UI からブランド感のあるデザインへ置き換えています。
- ダークモードも含めて Tailwind のユーティリティクラスで統一感を保ち、利便性の高い導線を確保しました。
- HTML のネスト制約に従うよう更新したため、SSR/Hydration エラーは発生しません。

## テスト結果
- `pnpm lint`
- `pnpm format`
- `pnpm test:run`
- `pnpm build`
- `pnpm --filter fluorite-docs build`

`pnpm --filter fluorite-docs build` にてドキュメントの静的書き出しが完了することを確認しました。
