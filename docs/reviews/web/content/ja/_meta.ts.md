# web/content/ja/_meta.ts レビュー

## 変更概要
- 日本語版の `index` をサイドバーに露出させるため `type: "page"` を追加しました。
- `--guides` セパレーターを導入し、ガイド系コンテンツとリファレンスを論理的に区切っています。
- `getting-started` と `cli` のタイトルをセクション見出しと統一し、ナビゲーションの文言を整理しました。

## 技術的な狙いと影響
- 英語版と同じ階層構造を用意し、言語を切り替えても同じ配置で誘導できるようにしています。
- Nextra のメタ定義のみを更新しており、他のビルド成果物には影響しません。

## テスト結果
- `pnpm lint`
- `pnpm format`
- `pnpm test:run`
- `pnpm build`
- `pnpm --filter fluorite-docs build`

`pnpm --filter fluorite-docs build` にてドキュメントの静的書き出しが完了することを確認しました。