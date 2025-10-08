# web/mdx-components.tsx レビュー

## 変更概要
- ヒーロー、フィーチャー、タイムライン、リソースカードなど 7 種類の MDX コンポーネントを新規実装し、Tailwind ベースの共通UIを提供しました。
- CTA ボタン内のテキストを `<span>` でラップするなど、HTML ネスト制約に沿ったマークアップに調整しています。
- スタイル定数をまとめ、ライト／ダークテーマ双方で視認性の高いビジュアルを標準化しました。

## 技術的な狙いと影響
- Nextra デフォルトの素朴な HTML から脱却し、公式ドキュメントらしいリッチな演出と再利用可能な構造を実現しています。
- props 型を定義しているため、MDX からの利用でも型安全性を維持できます。
- ネスト構造を調整済みのため React/HTML の整合性エラーは発生しません。

## テスト結果
- `pnpm lint`
- `pnpm format`
- `pnpm test:run`
- `pnpm build`
- `pnpm --filter fluorite-docs build`

`pnpm --filter fluorite-docs build` にてドキュメントの静的書き出しが完了することを確認しました。
