# チケット: Next.js フルスタックテンプレートのユニットテスト実装

- **優先度**: High
- **分類**: Testing / CLI
- **担当候補**: Create コマンド担当エンジニア（1名）
- **関連計画**: `docs/plans/0015.md`

## 背景
`src/commands/create/template-generators/nextjs-fullstack-admin.ts` は 369 行に及ぶ主要ロジックを含むが、最新カバレッジ計測（2025-10-06 時点）ではステートメント 7.49%（23/307）、関数 0/7 とほぼ未実行の状態である。テンプレート生成の信頼性確保のため、ユニットテストを整備する必要がある。

## 実装内容
1. 新規テストファイル `test/unit/src/commands/create/template-generators/nextjs-fullstack-admin.test.ts` を追加
2. 以下の責務を個別テストでカバー
   - `buildEnvReplacements`: Turso/Supabase 切替時の環境変数プレースホルダー生成
   - `configureEnvironmentFiles`: `.env*` ファイルの生成フローとロールバック
   - `selectPrismaSchema`: データベース種別ごとの Prisma スキーマ選択
   - `runSetupCommands`: `pnpm install`, `pnpm db:generate`, `pnpm db:reset` の成功/失敗分岐
   - `generateFullStackAdmin`: 上記関数を組み合わせた統合パス（Turso/Supabase 両方）
3. `execa` / `fs-extra` などのモックを整備し、外部依存を再現
4. カバレッジ目標: ステートメント ≥ 70%、関数 ≥ 70%

## 受け入れ条件
- 新規テストが `pnpm test` / `pnpm test:coverage` で安定的に成功すること
- 主要分岐（Turso/Supabase、Blob 有無、セットアップコマンド失敗）がすべて検証されていること
- カバレッジレポートで `nextjs-fullstack-admin.ts` のステートメント ≥ 70% を達成
- 追加したモックが他テストに副作用を与えないこと

## 想定工数
- 実装・モック整備: 1日
- カバレッジ調整とレビュー: 0.5日
- 合計: 約 1.5日

## メモ
- 既存の `generator.test.ts` に組み込まず、テンプレート専用のテストスイートとして分離する
- 生成結果の一部はテンポラリディレクトリに出力し、`fs.mkdtempSync` 等でクリーンアップを徹底
- 失敗分岐のログメッセージは英語・日本語両方を検証する（`getMessages()` のモックを利用）
