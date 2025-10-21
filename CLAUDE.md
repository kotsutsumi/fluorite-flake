# リポジトリガイドライン

## プロジェクト構成とモジュール整理

この Turborepo ではクライアントアプリを `apps` に、共有コードを `packages` に、ルートレベルのスクリプトライブラリを `scripts/libs` にまとめています。

### アプリケーション (`apps/`)

- **`apps/backend`**: Next.js (App Router) で実装されたバックオフィス兼 API サーバー。Better Auth 認証、Prisma (libSQL/Turso または Supabase)、GraphQL (Apollo Server) + REST API、ダッシュボード UI を提供します。開発環境では `http://localhost:3001` で起動します。詳細は `apps/backend/README.md` を参照してください。
- **`apps/web`**: メインのフロントエンドアプリケーション。Next.js + Better Auth で実装され、`http://localhost:3000` で起動します。
- **`apps/docs`**: ドキュメントサイト。Next.js + Nextra で実装され、`http://localhost:3002` で起動します。
- **`apps/mobile`**: モバイルアプリケーション。Expo/React Native + Apollo Client で実装され、GraphQL API 経由で backend と通信します。

### 共有パッケージ (`packages/`)

- **`packages/ui`**: 共有 UI コンポーネントライブラリ。Radix UI、shadcn/ui スタイル、Tiptap エディター、TanStack Table、React Hook Form、Zod など豊富なコンポーネントを含みます。
- **`packages/typescript-config`**: 共有 TypeScript 設定プリセット。

### スクリプトライブラリ (`scripts/libs/`)

- **`scripts/libs/db-cloud`**: Turso/Supabase クラウドデータベース管理 CLI。データベースの作成、マイグレーション、push、seed、reset を環境別（preview/staging/production）に実行できます。
- **`scripts/libs/env-tools`**: 環境変数の暗号化/復号ツール。チーム共有用の `.env` ファイルを `env.encrypted.zip` として安全に管理できます。
- **`scripts/libs/env-push`**: Vercel への環境変数 push 管理ツール。環境別（preview/staging/production）に環境変数を一括アップロードできます。
- **`scripts/libs/vercel-link`**: Vercel プロジェクトリンクと環境変数自動設定ツール。チーム選択、アプリ列挙、プロジェクトリンク、環境ファイル更新を対話的に実行できます。

Lint とフォーマットの設定はリポジトリルートの `biome.json` に配置されています。新しいタスクを追加する際は、該当するパッケージ内で定義し、`turbo.json` で Turbo のキャッシュと依存関係解決に組み込んでください。

## ビルド・テスト・開発コマンド

### 開発・ビルド

- `pnpm dev` – 全アプリの開発サーバーを起動します（backend: 3001, web: 3000, docs: 3002）。特定のアプリに絞る場合は `--filter=backend`、`--filter=web`、`--filter=docs`、`--filter=mobile` を追加します。
- `pnpm build` – 全ワークスペースで `next build` / `expo export` を実行し、成果物を生成します。
- `pnpm dev` の実行前に `scripts/free-port.sh` が自動的に使用中ポートを解放します。

### Lint・フォーマット・型チェック

- `pnpm lint` – `ultracite check` を実行してリポジトリ全体の Lint とスタイルを検証します。
- `pnpm format` – `ultracite fix` を実行してフォーマット、インポート整列、自動修正を適用します。
- `pnpm check-types` – 各パッケージで `tsc --noEmit` を実行し、型のリグレッションを防ぎます。

### テスト

- `pnpm test` – 全ワークスペースのテストを実行します（backend, web, docs, mobile すべてのユニット・E2E テスト）。
- `pnpm test:scripts` – `scripts/` ディレクトリのユニットテストを実行します（Vitest）。
- `pnpm test:scripts:watch` / `pnpm test:scripts:ui` – スクリプトテストのウォッチモード / UI モード。
- `pnpm --filter=<app> test` – 特定アプリのデフォルトテスト（通常は `test` のエイリアス）を実行します。
- `pnpm --filter=<app> test:unit` – 特定アプリのユニットテストを実行します（Vitest）。
- `pnpm --filter=<app> test:e2e` – 特定アプリの E2E テストを実行します（Playwright または Maestro）。
- `pnpm --filter=<app> test:all` – 特定アプリのすべてのテスト（ユニット + E2E）を実行します。

詳細はテストガイドラインを参照してください。

### データベース管理

#### ローカル開発環境

- `pnpm prisma:generate` – Prisma Client を生成します（postinstall 時に自動実行）。
- `pnpm db:push` – Prisma スキーマをローカルデータベースに適用します。
- `pnpm db:seed` – ローカルデータベースにシードデータを投入します。
- `pnpm db:reset` – ローカルデータベースをリセット（force-reset + seed）します。

#### クラウド環境（Turso/Supabase）

- `pnpm db:cloud:create` – 新しいクラウドデータベースインスタンスを作成します。
- `pnpm db:cloud:migrate` – 全環境（preview, staging, production）にマイグレーションを実行します。
- `pnpm db:cloud:migrate:preview` / `:staging` / `:production` – 特定環境にマイグレーションを実行します。
- `pnpm db:cloud:push` – 全環境にスキーマを push します。
- `pnpm db:cloud:push:preview` / `:staging` / `:production` – 特定環境にスキーマを push します。
- `pnpm db:cloud:seed` – 全環境にシードデータを投入します。
- `pnpm db:cloud:seed:preview` / `:staging` / `:production` – 特定環境にシードデータを投入します。
- `pnpm db:cloud:reset` – 全環境のデータベースをリセットします。
- `pnpm db:cloud:reset:preview` / `:staging` / `:production` – 特定環境のデータベースをリセットします。

詳細は `apps/backend/README.md` を参照してください。

### Vercel プロジェクトリンク管理

- `pnpm vercel:link` – Vercel プロジェクトリンクと環境変数の自動設定を行います。このコマンドは以下を実行します：
  1. Vercel CLI ログイン確認（未ログインの場合は `vercel login` を促す）
  2. Vercel チーム選択（`vercel teams ls` から選択し `vercel switch` で切り替え）
  3. apps/ 配下のアプリを列挙して処理対象を選択（全件またはスキップ指定）
  4. 各アプリで以下を実行：
     - `vercel link --repo` でプロジェクトにリンク
     - `.vercel/repo.json` からプロジェクト名を取得
     - `.env.production`、`.env.staging`、`.env.preview` の URL 環境変数を自動更新：
       - `NEXT_PUBLIC_APP_URL`
       - `BETTER_AUTH_URL`
       - `NEXT_PUBLIC_API_URL`
  5. 結果サマリーをテーブル表示
  6. `git status` と次のステップ（`pnpm env:push` など）を案内

**実行後の推奨ステップ**:
```bash
# 変更をコミット
git add .
git commit -m "chore: update Vercel project links and environment URLs"

# 環境変数を Vercel にプッシュ
pnpm env:push
```

### 環境変数管理

- `pnpm env:encrypt` – 各アプリの `.env*` ファイルを `env.encrypted.zip` に暗号化します。
- `pnpm env:decrypt` – `env.encrypted.zip` を復号して `.env*` ファイルを復元します。
- `pnpm env:pull` – Vercel から環境変数を取得して `.env.*` ファイルに保存します。既存ファイルがある場合は、コメントと構造を保持しながら値のみを更新し、新規変数は下部にコメント付きセクションで追加します。
- `pnpm env:push` – 全アプリの全環境（preview, staging, production）に環境変数を Vercel にプッシュします。`apps/` 配下の各ディレクトリから `.env.preview`、`.env.staging`、`.env.production` を自動検出して一括プッシュします。
- `pnpm env:push:preview` / `:production` / `:staging` – 全アプリの特定環境に環境変数を Vercel にプッシュします。

**注意**: `env:push` コマンドは `scripts/env-push-all.ts` ラッパースクリプトを使用しており、どのディレクトリから実行しても動作します。各アプリに必要な `.env` ファイル（`.env.preview`、`.env.staging`、`.env.production`）が揃っていない場合は自動的にスキップされます。

## コーディングスタイルと命名規約

すべて TypeScript を使用します。公開する React コンポーネントはパスカルケース、フックやユーティリティはキャメルケース、Next.js のルートフォルダーは小文字で統一してください。

Lint とフォーマットの挙動は Ultracite のプリセットを拡張した `biome.json` で集中管理されています。Ultracite は以下のスタイルを強制します：

- 2 スペースインデント
- ダブルクオート
- セミコロン必須
- 行幅 100 文字

スタイル調整は `pnpm format` CLI に任せてください。各アプリやパッケージに特有の Lint ルールは `biome.json` の `overrides` セクションで定義されています。

## テストガイドライン

このプロジェクトでは、すべてのワークスペースに包括的なテスト環境が整備されています。

### ユニットテスト（全ワークスペース共通）

- **テストランナー**: Vitest + @testing-library/react または @testing-library/react-native
- **実行コマンド**:
  - `pnpm --filter=<app> test:unit` – ユニットテストを実行
  - `pnpm --filter=<app> test:watch` – ウォッチモードで実行
  - `pnpm --filter=<app> test:ui` – UI モードで実行（Vitest UI）
  - `pnpm --filter=<app> test:unit` で `--coverage` フラグを付けるとカバレッジレポートを生成します
- **テストファイル配置**: `apps/<app>/tests/unit/` ディレクトリに `*.test.ts(x)` 形式で配置
- **設定ファイル**: 各アプリの `vitest.config.ts`、`vitest.setup.ts`

### E2E テスト（Web アプリ: backend, web, docs）

- **テストフレームワーク**: Playwright
- **実行コマンド**:
  - `pnpm --filter=<app> test:e2e` – E2E テストを実行
  - `pnpm --filter=<app> test:e2e:ui` – UI モードで実行（Playwright UI）
  - `pnpm --filter=<app> test:e2e:headed` – ブラウザ表示ありで実行
  - `pnpm --filter=<app> test:e2e:debug` – デバッグモードで実行
- **テストファイル配置**: `apps/<app>/tests/e2e/` ディレクトリに `*.test.ts` または `*.spec.ts` 形式で配置
- **設定ファイル**: 各アプリの `playwright.config.ts`
- **テスト成果物**: `test-results/` と `playwright-report/` に出力されます（`.gitignore` に含まれています）

### E2E テスト（モバイルアプリ: mobile）

- **テストフレームワーク**: Maestro
- **インストール**: `curl -Ls "https://get.maestro.mobile.dev" | bash`
- **実行コマンド**:
  - `maestro test apps/mobile/.maestro/` – すべてのフローを実行
  - `maestro test apps/mobile/.maestro/<flow-name>.yaml` – 特定のフローを実行
- **フローファイル配置**: `apps/mobile/.maestro/` ディレクトリに `*.yaml` 形式で配置
- **サンプルフロー**: `app-launch.yaml`、`login-flow.yaml`、`tab-navigation.yaml`、`logout-flow.yaml`

### スクリプトのユニットテスト

- **テストランナー**: Vitest
- **実行コマンド**:
  - `pnpm test:scripts` – スクリプトのユニットテストを実行
  - `pnpm test:scripts:watch` – ウォッチモードで実行
  - `pnpm test:scripts:ui` – UI モードで実行
  - `pnpm test:scripts:coverage` – カバレッジレポート付きで実行
- **テストファイル配置**: `scripts/tests/` ディレクトリ
- **設定ファイル**: `scripts/vitest.config.ts`

### テストの追加ガイドライン

新しい機能を実装する際は、以下のガイドラインに従ってテストを追加してください：

- 仕様は実装の近くに `*.test.ts(x)` または `*.spec.ts` 形式で配置します。
- 新しい UI コンポーネントにはスモークテストと利用例の更新を必ず用意してください。
- テストがなくても作業後は `pnpm lint`（Biome）と `pnpm check-types` を実行してください。
- `turbo.json` では `test`, `test:unit`, `test:e2e`, `test:all` などのタスクが定義されており、依存関係に基づいて自動的に実行されます。

## コミットとプルリクエストのガイドライン

コミットサブジェクトは「Add hero banner」のように短く命令形で記述し、必要に応じて意図やフォローアップを本文に記録します。関連する Issue は本文で `Refs #123` のように参照してください。

プルリクエストでは以下を明記してください：

- 変更概要
- 該当する場合の UI スクリーンショット
- 実行したコマンド（テスト、ビルド、Lint など）
- 必要な環境設定や移行手順（データベースマイグレーション、環境変数追加など）

自動化が成功してから Draft を解除します。

## 環境と設定のヒント

### 前提条件

- **Node.js**: 22 以上（`package.json` の `engines` で指定）
- **pnpm**: 10.18.3（`packageManager` フィールドで指定）

### 環境変数管理

シークレットは各アプリの `.env.local` に保管し、Turbo は `.env*` ファイルをタスク入力として扱うためリポジトリには含めないでください。

チームで共有する際は、`pnpm env:encrypt` で暗号化し、`pnpm env:decrypt` で復号してください。Vercel へのデプロイ時は `pnpm env:push` で環境変数を一括アップロードできます。

詳細は `apps/backend/README.md` の「環境変数」セクションを参照してください。

### Turbo Remote Caching

ビルドが成功したら以下のコマンドを実行して Vercel Remote Caching を有効にし、CI やチームでのビルド効率を高めましょう：

```bash
turbo login
turbo link
```

### Expo CLI（モバイルアプリ）

`apps/mobile` は Expo CLI を使用するため、以下のコマンドが利用できます：

- `pnpm --filter=mobile run dev` – Expo 開発サーバーを起動
- `pnpm --filter=mobile run android` – Android エミュレーターで起動
- `pnpm --filter=mobile run ios` – iOS シミュレーターで起動
- `pnpm --filter=mobile run web` – Web ブラウザで起動
- `pnpm --filter=mobile run build` – Web プラットフォーム向けにエクスポート（`expo export --platform web`）

### ポート管理

開発サーバーの起動前に `scripts/free-port.sh` が自動的に実行され、使用中のポート（3000, 3001, 3002）を解放します。macOS で権限エラーが出る場合は、手動で以下のコマンドを実行してください：

```bash
lsof -ti:3001 | xargs kill
```

### Prisma の切替（libSQL / Supabase）

`apps/backend` では `DATABASE_PROVIDER` 環境変数で `turso`（既定）/ `supabase` を切り替え可能です。`supabase` の場合は PostgreSQL 用の接続文字列を指定してください。詳細は `apps/backend/README.md` を参照してください。
