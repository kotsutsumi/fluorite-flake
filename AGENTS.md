# Fluorite-Flake Repository Guidelines

## 参照

- ルート直下の `CLAUDE.md` はテンプレート側の詳細な運用ポリシーを記載しています。CLI 側の開発でも前提知識として把握しておいてください。
- テンプレート配下（`templates/CLAUDE.md` や `templates/AGENTS.md`）には生成物のガイドラインが保存されています。テンプレートを更新するときは、CLI 用ドキュメントと併せて同期してください。

## プロジェクト概要

- 本リポジトリは Fluorite-Flake CLI のソースコード、E2E/ユニットテスト、テンプレートアセット、Next.js 製ドキュメントサイトを含みます。
- CLI は TypeScript（ESM）で実装され、`fluorite-flake` コマンドとして配布されます。主要サブコマンドは `create`/`new`（プロジェクトスキャフォールディング）と `dashboard`（Ink 製 TUI ダッシュボード）です。
- 生成されるプロジェクトは `templates/` 配下のモノレポ構成（Next.js アプリ複数・共有パッケージ・Turbo 設定）をベースにしています。

## ディレクトリ構成

- `src/cli.ts` – Citty ベースの CLI エントリーポイント。開発モードでは `debug.ts` を通じて temp ワークスペースを初期化します。
- `src/commands/` – CLI サブコマンドの実装。
    - `create/` – プロジェクト生成ロジック。`database-provisioning/`（Turso/Supabase 初期化）と `commands/`（`create`/`new` 定義）を含みます。
    - `dashboard/` – Ink による TUI。`state/`、`components/`、`services/` といった分離済みモジュールで Vercel/Turso の情報を取得・表示します。
- `src/utils/` – CLI が利用するユーティリティ群。テンプレートコピー（`project-generator/`）、リソース管理（`resource-manager/`）、CLI 操作用ラッパー（`github-cli/`、`turso-cli/`、`vercel-cli/`）などがまとまっています。
- `src/i18n.ts` と `src/i18n/*.json` – ロケール検出と文言定義。新しいメッセージは JSON ファイルと `getMessages` の戻り値型を更新してから使用します。
- `scripts/` – CLI 開発支援スクリプト。
    - `copy-templates.mjs` – `pnpm build` 時に `templates/` を `dist/templates/` へ同期。
    - `test-memory-safe.ts` – Vitest 実行メモリを監視するユーティリティ。
- `templates/` – 生成プロジェクトのソース。モノレポの `apps/`、`packages/`、`scripts/` などの完全な雛形を含みます。更新時は CLI のテンプレート参照パス（`src/utils/project-generator`）を壊さないよう注意してください。
- `test/` – Vitest ベースのテストスイート。
    - `unit/` – CLI モジュール単位のテスト。
    - `e2e/` – 実行ファイルや生成後の成果物を検証する E2E テスト。`specs/` と成果物ディレクトリ（`outputs/`、`logs/`、`screenshots/`）に分かれています。
    - `helpers/global-setup.ts` – テスト全体の初期化フック（現状はプレースホルダー）。
- `web/` – Next.js + Nextra ベースの公式ドキュメントサイト。React 19/Tailwind CSS v4 を使用します。
- `dist/` – `pnpm build` で生成される配布物。CLI コードとテンプレートがここにまとめられます。
- `docs/` – 開発時の調査メモ。`docs/analyze/` には `pnpm dev` の新プロセス検証のような補助的ドキュメントが入ります。
- `temp/` – 開発モード専用の作業ディレクトリ。`pnpm dev` 実行時に初期化されるため、コミットしないでください。

## ビルド・テスト・開発コマンド

- `pnpm install` – ルートの依存解決。`web/` でドキュメントを触る場合は `cd web && pnpm install` も必要です。
- `pnpm dev` – `NODE_ENV=development` で CLI を tsx 実行。テンポラリ領域を初期化し、詳細なデバッグログを表示します。
- `pnpm build` – TypeScript をコンパイルし、テンプレートを dist へコピーします。
- `pnpm test` / `pnpm test:run` – Vitest のデフォルト実行。ユニット + E2E プロジェクト構成に対応。
- `pnpm test:unit(:run)` / `pnpm test:e2e(:run)` / `pnpm test:all` – プロジェクト別のショートカット。
- `pnpm test:coverage` – `vitest run --coverage`。カバレッジ対象は `src/**/*.ts`。
- `pnpm lint` / `pnpm format` / `pnpm check` – Biome による lint/format/check。`web/` には独自の Biome 設定があるため必要に応じて `pnpm --filter web lint` を使用します。
- `pnpm test:memory-safe` – 長時間テスト時のメモリ監視。
- ドキュメントサイト: `cd web && pnpm dev` / `cd web && pnpm build`。

## コーディングスタイルと実装方針

- TypeScript の `strict` オプションが有効です。暗黙の any・未使用変数がない状態を維持してください。
- コードのインデントは 4 スペース。既存スタイルに合わせて import 順序と空行を整理します。
- CLI の出力文言は必ず `getMessages()`（`src/i18n.ts`）経由で取得し、英語/日本語の翻訳を同時に追加します。
- 新しいユーティリティは `src/utils/<domain>/` に配置し、`index.ts` で公開 API をまとめます。モジュールが複雑な場合は README やコードコメントで最小限のコンテキストを補足してください。
- Ink コンポーネント（`dashboard`）は React 19 ベースです。副作用や外部 API 呼び出しは `hooks`/`services` 配下に分離し、コンポーネントは純粋に状態を受け取る構造を保ちます。

## テストガイドライン

- テストランナーは Vitest。`vitest.config.ts` で `unit`・`integration`（未使用）・`e2e` のプロジェクトが設定されています。新規 `integration` テストを追加する場合は `test/integration/` を作成してください。
- ユニットテストは `test/unit/**` に配置し、対象モジュール名を含むファイル名（例: `project-generator.test.ts`）を付けます。
- E2E テストは `test/e2e/specs` 配下に置き、実ファイルシステム操作で生成物を検証します。実行中に出力される `outputs/` や `logs/` ディレクトリは `.gitignore` 済みですが、テスト後は不要物を削除してください。
- CLI の外部依存（Turso/Vercel API 等）を伴う処理は `scripts/test-memory-safe.ts` やモックユーティリティを活用してネットワーク意図を明示します。必要に応じて環境変数を先頭コメントで説明してください。
- グローバルセットアップが必要な場合は `test/helpers/global-setup.ts` を編集し、変更内容をテストコード内にコメントで共有します。

## テンプレート運用

- `src/utils/project-generator/*` がテンプレートコピーと差し替え処理（文字列置換、セットアップコマンド実行）を担当します。新しいテンプレートを追加する場合はパスやメタ情報（`templates/meta.json`）を忘れず更新してください。
- `scripts/copy-templates.mjs` はビルド成果物にテンプレートをバンドルします。テンプレートに大規模変更があるときはビルド後の `dist/templates/` を確認し、不要ファイルが含まれていないかチェックしてください。
- テンプレート側のドキュメント（`templates/AGENTS.md` 等）を更新した場合、CLI リポジトリ側のガイドラインとの齟齬がないか確認します。

## コミット / プルリクエスト

- Conventional Commits 形式（例: `feat(cli): support turso login prompt`）を推奨します。範囲は `cli`、`templates`、`tests`、`web`、`docs` など機能単位で指定してください。
- PR では変更概要と合わせて実行したコマンド（`pnpm build`, `pnpm test:all`, `pnpm lint` など）を記載し、必要なら CLI 出力の抜粋を添付します。
- テンプレート更新がある場合は、CLI 側で期待する生成物が変わることを明記し、ドキュメントサイトの該当ページも更新対象か確認してください。
- ワークツリーに `temp/` やテスト成果物が残っていないことをチェックしてからコミットします。

## ローカル環境とセキュリティ

- Node.js は 20 以上（`package.json` の `engines`）。`corepack enable` を実行して pnpm を固定することを推奨します。
- ネットワーク依存の開発（Turso/Vercel CLI 連携、dashboard コマンドなど）では API トークンを環境変数またはローカル設定ファイルで扱い、`.env*` はリポジトリに含めません。
- ロケール指定が必要なときは `FLUORITE_LOCALE=en` のように環境変数で上書きします。CI では既定のロケールが使われるため、テストで依存しないよう注意してください。
- OSS ライセンスは MIT。配布に含めるファイルは `package.json` の `files` フィールドに従って `dist/`, `templates/`, `README.md`, `LICENSE` のみです。

## ドキュメントサイト（`web/`）

- Next.js 15 + Nextra で構築されています。`web/src/pages` よりも `web/src/content`（MDX）を中心に更新します。
- Lint/Format はルートとは別の Biome 設定です。CI 整合性のため `pnpm --filter web lint` と `pnpm --filter web format` を使用してください。
- ルート README に反映した変更は、可能であればドキュメントサイトにも追従させます。

以上をベースに、CLI 本体・テンプレート・ドキュメントサイトの変更が常に同期されるよう運用してください。
