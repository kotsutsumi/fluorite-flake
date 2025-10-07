# web/content/en/_meta.ts レビュー

## 変更概要
- `index` エントリに `type: "page"` を指定し、サイドバー上でトップページが常に表示されるようにしました。
- `--guides` セパレーターを追加して、ガイド系コンテンツをまとめる見出しを提供しています。
- `getting-started` と `cli` のメタ情報を整理し、リファレンスとガイドを明確に分離しました。

## 技術的な狙いと影響
- サイドバーへ明確なセクション見出しを追加し、ホーム→ガイド→リファレンスの導線を一目で把握できるようになります。
- 型定義 (`MetaRecord`) に沿った変更のため、ビルドおよびルーティングへの影響はありません。

## テスト結果
- `pnpm lint`
- `pnpm format`
- `pnpm test:run`
- `pnpm build`
- `pnpm --filter fluorite-docs build`

`pnpm --filter fluorite-docs build` にてドキュメントの静的書き出しが完了することを確認しました。