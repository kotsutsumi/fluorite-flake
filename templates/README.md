# フルスタック Turborepo モノレポ

Next.js / Expo / Prisma / Better Auth で構成されたモダンなフルスタックアプリケーションです。Web アプリ、管理ダッシュボード、ドキュメントサイト、モバイルアプリを Turborepo でまとめて管理しています。

## 🎯 プロジェクト概要

### 技術スタック

- **フロントエンド**: Next.js 15 (App Router), React 19, Tailwind CSS 4
- **バックエンド**: Next.js API Routes, GraphQL (Apollo Server), REST API
- **モバイル**: Expo / React Native
- **認証**: Better Auth
- **データベース**: Prisma + libSQL (Turso) / PostgreSQL (Supabase)
- **ストレージ**: Vercel Blob (本番) / ローカルファイルシステム (開発)
- **モノレポ**: Turborepo + pnpm workspace

### アーキテクチャ

```
monorepo/
├── apps/
│   ├── web          # マーケティングサイト (http://localhost:3000)
│   ├── backend      # 管理ダッシュボード + API (http://localhost:3001)
│   ├── docs         # ドキュメントサイト (http://localhost:3002)
│   └── mobile       # Expo モバイルアプリ (http://localhost:8081)
├── packages/
│   ├── ui           # 共通 UI コンポーネントライブラリ
│   └── typescript-config  # 共通 TypeScript 設定
└── scripts/
    └── libs/        # ユーティリティスクリプト (env, db, etc.)
```

## 📋 前提条件

以下のツールが必要です：

- **Node.js**: 22 以上
- **pnpm**: 10.18.3 以上
- **Git**: バージョン管理用

## 🚀 クイックスタート（ローカル開発のみ）

プロジェクトをクローンして、ローカル環境で開発を始めるための最小限の手順です。

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数の初期化

```bash
pnpm env:init
```

これにより、各アプリの `.env.local` ファイルが `.env.local.example` から自動生成されます。

### 3. 認証シークレットの生成

```bash
pnpm env:gen:secret
```

Better Auth のシークレットキーが生成され、各アプリの `.env.local` に自動設定されます。

### 4. データベースのセットアップ

```bash
pnpm db:reset
```

ローカル SQLite データベースが初期化され、シードデータが投入されます。

### 5. 開発サーバーの起動

```bash
pnpm dev
```

以下のアプリが並行起動します：

- Web: http://localhost:3000
- Backend: http://localhost:3001
- Docs: http://localhost:3002
- Mobile: http://localhost:8081

**注意**: ポート衝突を避けるため、`scripts/free-port.sh` が自動実行されます。

## 📦 プロジェクト構成

| パス | 役割 | ポート |
| --- | --- | --- |
| `apps/web` | マーケティングサイト・フロントエンド | 3000 |
| `apps/backend` | 管理ダッシュボード + REST/GraphQL API | 3001 |
| `apps/docs` | Nextra ドキュメントサイト | 3002 |
| `apps/mobile` | Expo モバイルクライアント | 8081 |
| `packages/ui` | 共通 UI コンポーネント (shadcn/ui ベース) | - |
| `packages/typescript-config` | 共通 TypeScript 設定 | - |
| `scripts/libs` | ユーティリティスクリプト | - |

詳細は各ディレクトリの `README.md` を参照してください：

- [apps/backend/README.md](./apps/backend/README.md)
- [apps/web/README.md](./apps/web/README.md)
- [apps/docs/README.md](./apps/docs/README.md)
- [apps/mobile/README.md](./apps/mobile/README.md)

## 🔧 主要コマンド

### 開発

| コマンド | 用途 |
| --- | --- |
| `pnpm dev` | 全アプリを並行起動 |
| `pnpm --filter web dev` | Web アプリのみ起動 |
| `pnpm --filter backend dev` | Backend アプリのみ起動 |
| `pnpm --filter docs dev` | Docs アプリのみ起動 |
| `pnpm --filter mobile dev` | Mobile アプリのみ起動 |
| `pnpm build` | 全アプリをビルド |
| `pnpm --filter <app> build` | 特定アプリをビルド |

### 品質チェック

| コマンド | 用途 |
| --- | --- |
| `pnpm lint` | Ultracite (Biome) による Lint チェック |
| `pnpm format` | 自動整形・Import 整理 |
| `pnpm check-types` | TypeScript 型チェック |
| `pnpm test` | 全テストを実行 |
| `pnpm --filter <app> test` | 特定アプリのテストを実行 |
| `pnpm --filter <app> test:unit` | ユニットテストのみ実行 |
| `pnpm --filter <app> test:e2e` | E2E テストのみ実行 |

### データベース（ローカル）

| コマンド | 用途 |
| --- | --- |
| `pnpm prisma:generate` | Prisma Client を生成 |
| `pnpm db:push` | スキーマをローカル DB に適用 |
| `pnpm db:seed` | シードデータを投入 |
| `pnpm db:reset` | DB をリセット (force-reset + seed) |

### 環境変数管理

| コマンド | 用途 |
| --- | --- |
| `pnpm env:init` | `.env.local.example` から `.env.local` を生成 |
| `pnpm env:encrypt` | 環境変数をパスワード付き ZIP で暗号化 |
| `pnpm env:decrypt` | 暗号化された環境変数を復号 |
| `pnpm env:pull` | Vercel から環境変数を取得（既存ファイルの構造とコメントを保持しながらマージ） |
| `pnpm env:push` | Vercel に環境変数をプッシュ（全環境） |
| `pnpm env:push:preview` | Preview 環境にプッシュ |
| `pnpm env:push:staging` | Staging 環境にプッシュ |
| `pnpm env:push:production` | Production 環境にプッシュ |

## 🌍 本番環境セットアップ

本番環境（Vercel + Turso Cloud + EAS）へのデプロイには追加の設定が必要です。

### 1. Vercel プロジェクトのリンク

各アプリを個別の Vercel プロジェクトにリンクします：

```bash
# Web アプリ
cd apps/web
vercel link --repo

# Backend アプリ
cd apps/backend
vercel link --repo

# Docs アプリ
cd apps/docs
vercel link --repo
```

### 2. 環境の種類

#### Vercel Hobby アカウント

- **preview**: Pull Request ごとのプレビュー環境
- **production**: `main` ブランチのマージ時

#### Vercel Pro アカウント以上

- **preview**: Pull Request ごとのプレビュー環境
- **staging**: `staging` ブランチのマージ時（推奨）
- **production**: `main` ブランチのマージ時

Pro アカウントでは、`staging` ブランチを作成することで本番前のテスト環境を構築できます。

### 3. Turso Cloud データベースの作成

```bash
# データベースインスタンスを作成
pnpm db:cloud:create
```

対話的に以下を入力します：

- 組織名（Turso アカウント）
- データベース名（例: `myapp-preview`, `myapp-staging`, `myapp-production`）
- 環境（preview / staging / production）

作成後、接続情報が自動的に環境変数ファイルに保存されます。

### 4. データベースのマイグレーション

```bash
# 全環境にマイグレーション
pnpm db:cloud:migrate

# または環境別に実行
pnpm db:cloud:migrate:preview
pnpm db:cloud:migrate:staging     # Pro 以上
pnpm db:cloud:migrate:production
```

**使い分け**：
- `db:cloud:migrate`: Prisma Migrate を使用（本番推奨）
- `db:cloud:push`: スキーマを直接プッシュ（開発用）
- `db:cloud:seed`: シードデータを投入
- `db:cloud:reset`: データベースを完全リセット

### 5. Vercel に環境変数をプッシュ

```bash
# 全環境にプッシュ
pnpm env:push

# または環境別にプッシュ
pnpm env:push:preview
pnpm env:push:staging     # Pro 以上
pnpm env:push:production
```

これにより、各環境の `.env.preview` / `.env.staging` / `.env.production` の内容が Vercel に自動アップロードされます。

### 6. Vercel Blob ストレージの設定（オプション）

ファイルアップロード機能を使用する場合：

1. [Vercel Dashboard](https://vercel.com/dashboard) にログイン
2. プロジェクトを選択 → **Storage** タブ
3. **Create Database** → **Blob** を選択
4. ストア名を入力（例: `backend-uploads`）
5. 作成すると `BLOB_READ_WRITE_TOKEN` が自動設定されます

**注意**: 設定しない場合、ローカルストレージ（`.storage` ディレクトリ）にフォールバックします。

詳細は [apps/backend/README.md の Vercel Blob セクション](./apps/backend/README.md#vercel-blob-ストレージ) を参照してください。

### 7. EAS（Expo Application Services）の設定

モバイルアプリのビルドとデプロイには EAS を使用します：

#### EAS CLI のインストール

```bash
npm install --global eas-cli
```

#### プロジェクトの初期化

```bash
cd apps/mobile
eas init --id <project-id>
```

`<project-id>` は [Expo Dashboard](https://expo.dev/) で取得できます。

#### ビルド設定

`eas.json` で各プラットフォームのビルド設定を確認・編集します：

```bash
# iOS ビルド
eas build --platform ios

# Android ビルド
eas build --platform android

# 両方ビルド
eas build --platform all
```

#### アプリのリリース

```bash
# App Store / Google Play にリリース
eas submit --platform ios
eas submit --platform android
```

詳細は [apps/mobile/README.md](./apps/mobile/README.md) を参照してください。

## 🔐 環境変数の共有（チーム開発）

チームで環境変数を安全に共有する方法：

### 暗号化

```bash
pnpm env:encrypt
```

パスワードを入力すると、`env.encrypted.zip` が生成されます。このファイルをチームメンバーと共有してください（Slack、メール等）。

### 復号

```bash
pnpm env:decrypt
```

パスワードを入力すると、各アプリの `.env*` ファイルが復元されます。

### セキュリティのベストプラクティス

- **暗号化 ZIP をリポジトリに含めないこと**（`.gitignore` で除外済み）
- **パスワードは別経路で共有**（Slack DM、パスワードマネージャー等）
- **定期的にシークレットをローテーション**（`pnpm end:gen:secret` で再生成）

## 📚 詳細ドキュメント

より詳細な情報は以下を参照してください：

- **初期セットアップ**: [apps/docs](http://localhost:3002) で詳細ガイドを確認
- **アーキテクチャ**: [apps/docs/architecture](http://localhost:3002/architecture) でシステム設計を確認
- **API リファレンス**: [apps/docs/guides/api-usage](http://localhost:3002/guides/api-usage) で API 仕様を確認
- **デプロイガイド**: [apps/docs/deployment](http://localhost:3002/deployment) でデプロイ手順を確認

## 🛠️ データベースコマンドの詳細

### ローカル開発

| コマンド | 用途 | 実行タイミング |
| --- | --- | --- |
| `pnpm db:push` | スキーマを DB に適用 | スキーマ変更時 |
| `pnpm db:seed` | シードデータを投入 | 初回セットアップ、データリセット時 |
| `pnpm db:reset` | DB をリセット + Seed | 開発中のデータリセット |

### Turso Cloud

| コマンド | 用途 | 実行タイミング |
| --- | --- | --- |
| `pnpm db:cloud:create` | DB インスタンスを作成 | 初回のみ |
| `pnpm db:cloud:migrate` | マイグレーションを実行 | スキーマ変更時（本番推奨） |
| `pnpm db:cloud:push` | スキーマを直接 push | 開発・テスト環境 |
| `pnpm db:cloud:seed` | シードデータを投入 | データ投入が必要な時 |
| `pnpm db:cloud:reset` | DB を完全リセット | 緊急時のみ（本番非推奨） |

**環境別実行**：各コマンドに `:preview` / `:staging` / `:production` を付けることで特定環境のみ実行できます。

## 🧪 テスト

### テストの種類

- **ユニットテスト**: Vitest + React Testing Library
- **E2E テスト**: Playwright (Web) / Maestro (Mobile)

### テストコマンド

```bash
# 全テストを実行
pnpm test

# 特定アプリのテスト
pnpm --filter backend test
pnpm --filter web test
pnpm --filter mobile test

# ユニットテストのみ
pnpm --filter backend test:unit

# E2E テストのみ
pnpm --filter backend test:e2e

# すべてのテスト（ユニット + E2E）
pnpm --filter backend test:all

# カバレッジ付きテスト
pnpm --filter backend test:unit --coverage
```

詳細は [CLAUDE.md のテストガイドライン](./CLAUDE.md#テストガイドライン) を参照してください。

## 🚨 トラブルシューティング

### ポート衝突

**症状**: `Address already in use` エラー

**解決方法**:
```bash
# 自動解放（pnpm dev で実行済み）
scripts/free-port.sh

# 手動解放（macOS）
lsof -ti:3001 | xargs kill
```

### Prisma エラー

**症状**: `prisma generate` / `db:push` が失敗

**解決方法**:
```bash
# DB をリセット
pnpm db:reset

# Prisma Client を再生成
pnpm prisma:generate
```

### 環境変数が反映されない

**症状**: 設定が反映されない

**解決方法**:
1. `.env.local` が存在するか確認
2. サーバーを再起動（Next.js は環境変数をキャッシュします）
3. `pnpm env:init` で再生成

### Turbo Remote Caching

チーム開発でビルドキャッシュを共有する場合：

```bash
turbo login   # Vercel アカウントでログイン
turbo link    # リモートキャッシュを有効化
```

## 📖 その他のリソース

- **コーディング規約**: [CLAUDE.md](./CLAUDE.md)
- **エージェント設定**: [AGENTS.md](./AGENTS.md)
- **コミットガイドライン**: [CLAUDE.md のプルリクエストガイドライン](./CLAUDE.md#コミットとプルリクエストのガイドライン)

---

**ライセンス**: Private

**作成者**: Your Team Name

困ったときは [Issues](https://github.com/your-org/your-repo/issues) で質問してください。
