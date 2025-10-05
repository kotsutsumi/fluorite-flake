# プロジェクト生成機能レビュー報告書

## 概要

`src/commands/create/generator.ts` の実装は、monorepo 構成とシンプル構成に加えて、**Phase 2 で実装された Next.js Full-Stack Admin Template** を統合したプロジェクト生成フローを提供します。i18n化されたメッセージとスピナー演出でユーザー体験を統一し、拡張テンプレート機能により高度なプロジェクト構成を自動生成できます。

## 主な処理フロー

1. `getMessages()` から取得したローカライズメッセージで `ora` スピナーを初期化。
2. `debugLog()` で受け取った `ProjectConfig` を開発モード時に出力。
3. `SETUP_TIMEOUT_MS` に基づく擬似待機で進捗を段階的に更新。
4. プロジェクトディレクトリを存在確認し、なければ `recursive` オプション付きで作成。
5. **拡張テンプレート判定**: `config.type === "nextjs"` かつ `fullstack-admin` テンプレートの場合は Phase 2 機能を実行。
6. 拡張テンプレート利用時は `generateFullStackAdmin()` でフルスタック構成を生成、通常時は既存のmonorepo/シンプルモード処理。
7. 拡張テンプレート以外の場合のみ、依存関係インストールとテンプレート整形のスピナー表示を実行。
8. 成功メッセージとプロジェクトパスを出力。
9. 例外発生時はスピナーを `fail` に切り替え、開発モードでは詳細なデバッグログを残して再スロー。

## モード別の生成内容

### 拡張テンプレートモード（Phase 2）

**対象**: `config.type === "nextjs"` かつ `config.template` が `"fullstack-admin"`

- `generateFullStackAdmin()` で包括的なフルスタック構成を生成：
  - NextAuth.js 認証システム
  - Prisma ORM + PostgreSQL 設定
  - Tailwind CSS + shadcn/ui コンポーネント
  - API ルート（認証、ユーザー、組織管理）
  - 管理ダッシュボード UI
  - Vercel デプロイメント設定
  - 環境変数管理
  - 包括的なドキュメント

### Monorepo モード

- `createMonorepoStructure()` で apps / packages を含むワークスペース骨格を生成。
- `copyMonorepoTemplates()` がテンプレート群を展開し、`createWebAppPackageJson()` が Web アプリ用 `package.json` を構築。
- `generateReadmeContent()` で README を国際化されたテンプレートから生成し、`README.md` へ書き込み。

### シンプルモード（`--simple` または `monorepo=false`）

- `getDevCommand()` / `getBuildCommand()` によるタイプ別デフォルトスクリプトを組み込んだ `package.json` を作成。
- `generateReadmeContent()` を共通利用し、単一プロジェクト向け README を生成。

## 出力とログ

- スピナー成功後に `chalk.green` で完了通知、`chalk.cyan` でフルパスを表示。
- 開発モード (`NODE_ENV=development`) では成功・失敗いずれの場合も `debugLog()` による詳細トレースを出力。

## 依存ユーティリティ

- `debug.ts`：開発ログ制御 (`debugLog`, `isDevelopment`).
- `i18n.ts`：ロケール判定とメッセージ取得。
- `utils/monorepo-generator`：monorepo 初期化処理一式。
- `utils/readme-generator`：README 生成ロジック。

## 品質・改善メモ

- 擬似待機は CLI の体感ステップを示すための演出であり、実際のネットワーク処理は行っていない。
- Monorepo モードへの分岐は `CreateOptions.simple` フラグに依存しており、将来的なモード追加時は同判定ロジックの見直しが必要。
- 例外捕捉は包括的に行われるが、`fs.writeFileSync` 失敗時など個別の再試行戦略は未実装。
