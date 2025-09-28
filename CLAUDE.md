# CLAUDE.md

Claude Code 向けに、このリポジトリで作業するときの指針をまとめています。

## プロジェクト概要

Fluorite-flake はマルチフレームワーク対応のプロジェクトジェネレーター兼 CLI です。Next.js / Expo / Tauri / Flutter など複数のアプリ雛形を、対話式プロンプトに従って生成できます。主要な特徴は以下のとおりです。

1. **多彩なターゲット**: Web・モバイル・デスクトップまでカバーするテンプレート群。
2. **豊富なオプション**: データベース（Turso / Supabase）、ORM（Prisma / Drizzle）、ストレージ、認証、デプロイ設定などを選択可能。
3. **型安全な実装**: TypeScript + strict モード、再利用可能なユーティリティで構成。
4. **強固な開発体験**: Biome によるフォーマット＆Lint、Vitest によるテスト、Husky による pre-commit チェック。

## 開発コマンド

```bash
# セットアップ
pnpm install            # 依存関係をインストール

# 開発
pnpm dev                # tsx src/cli.ts を実行（オートリロード付き）

# ビルド / 品質
pnpm build              # TypeScript を dist/ へビルド
pnpm lint               # Biome lint
pnpm format             # Biome format
pnpm check              # Lint + Format チェック

# テストレイヤー
pnpm test               # Unit + Functional テストを実行（常時グリーン必須）
pnpm test:unit          # ユニットのみ
pnpm test:functional    # CLI 機能単体テスト
pnpm test:scenario      # シナリオテスト（重いので必要時のみ）
pnpm test:watch         # ウォッチモード
```

> **重要:** ソースコードを修正した場合は、必ず該当するテストも更新し、`pnpm test` を実行して成功したことを確認してください。テストを更新せずにコードだけ変更することは禁止です。

## アーキテクチャ概要

- **ES Modules**: `"type": "module"`。Node.js >= 20 が必須。
- **CLI エントリポイント**: `src/cli.ts` → `dist/cli.js`。Commander + prompts で構築。
- **公開 API**: `src/index.ts` → `dist/index.js`。ライブラリ利用者向けの再輸出。
- **主要依存**:
  - `commander` – CLI コマンド定義
  - `prompts` – 対話式入力
  - `chalk` / `ora` – 端末表示演出
  - `fs-extra` / `execa` – ファイル操作・プロセス実行
  - `vitest` – テスティングフレームワーク
  - `biome` – フォーマッタ + Linter

## フォルダ構成の指針

```
src/
  cli.ts             # CLI メインエントリ
  generators/        # フレームワーク別ジェネレーター
  utils/             # 再利用可能なユーティリティ
  commands/          # CLI コマンド定義
  templates/         # 各ジェネレーターが読み込むテンプレート資産
scripts/             # 補助スクリプト
tests/
  helpers/           # temp dir や CLI runner
  unit/              # ユニットテスト
  functional/        # 機能テスト
  scenario/          # シナリオテスト
```

`tests/` ではテンポラリディレクトリを活用し、生成されたファイルの内容を fixture と比較します。`tests/scenario` では実際に CLI を起動し、プロジェクト生成〜`pnpm dev` 起動確認まで行います。

## コーディング規約

- Biome がフォーマット・Lint を強制します。PR 送信前に `pnpm format && pnpm lint` を実行してください。
- 命名規則: 変数/関数 `camelCase`、型/クラス `PascalCase`、CLI コマンド `kebab-case`。
- エラー処理は丁寧に行い、CLI ではユーザーに分かりやすいメッセージを返すよう徹底してください。
- I/O（CLI 入出力・ファイル書き込みなど）と純粋ロジックを分離し、テストを書きやすくすること。

## 作業時のベストプラクティス

1. **テストファースト**: 修正対象モジュールを特定したら、関連するユニットテスト／機能テストを確認・追加しましょう。
2. **テンプレート編集時の注意**: `src/templates/**` を更新したら、該当する functional / scenario テストで実際に生成物が期待どおりか確認してください。
3. **テンポラリ生成のクリーンアップ**: テストや検証で作成したディレクトリは必ず削除するか、`.gitignore` 済みの場所（`/tmp` 相当）を利用してください。
4. **CI との整合**: `pnpm test` が失敗すると PR がブロックされます。`pnpm test:scenario` は実行時間が長いため、必要に応じてローカルまたは nightly CI ジョブで回してください。
5. **ドキュメント更新**: ツールチェーンやテスト構成に影響する変更を行った場合は、このファイルと `AGENTS.md`、関連する README / ガイドも忘れずに更新しましょう。

## 参考: CLI 拡張の流れ

1. `src/commands/` に新しいコマンドまたはサブコマンドを追加。
2. ビジネスロジックを `src/utils/` や `src/generators/` へ分離し、ユニットテストを追加。
3. CLI から呼び出す際は `src/cli.ts` へ登録し、機能テストを整備。
4. 必要に応じてテンプレートやスクリプトを追加し、シナリオテストで最終的な出力を検証。
5. `pnpm test` → `pnpm build` → `pnpm lint` を実行し、CI が通ることを確認。

これらのガイドラインに従い、常にテストとコードを両輪でメンテナンスしてください。EOF
