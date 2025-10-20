# Backend アプリケーション概要

Next.js (App Router) で実装されたバックオフィス兼 API サーバーです。Better Auth による認証、Prisma (libSQL/Turso or Supabase) を用いたデータアクセス、GraphQL/REST API、ダッシュボード UI を提供します。開発環境では `http://localhost:3001` で起動します。

## 主な機能

- **認証・セッション管理**: Better Auth + Next.js ミドルウェア。`/login` と `/api/auth/*` でメール+パスワード認証、承認フローを実装。
- **ダッシュボード**: `/access-history`, `/users` などの管理 UI。`apps/backend/components/dashboard` 配下で構成。
- **GraphQL API**: `/api/graphql` でアクセスログや認証関連の Query/Mutation を提供 (`lib/graphql/schema.ts`, `resolvers.ts`)。
- **REST API**: `/api/access-log`, `/api/profile`, `/api/auth/...` など。Playwright と Vitest でカバレッジ済み。
- **Prisma**: `prisma/schema.prisma` を元に LibSQL(SQLIte)/Supabase(PostgreSQL) の双方に対応。

## 開発環境のセットアップ

1. ルートで `pnpm install`
2. データベースを初期化

   ```bash
   pnpm db:push
   pnpm db:seed
   pnpm prisma:generate
   ```

3. 環境変数を復号 (必要な場合のみ)

   ```bash
   pnpm env:decrypt    # env.encrypted.zip から `.env` を復元
   ```

4. 開発サーバーを起動

   ```bash
   pnpm --filter backend dev
   ```

   `scripts/free-port.sh` により使用中ポートが解放された後、Next.js サーバーが立ち上がります。

## 主要コマンド

| コマンド | 内容 |
| --- | --- |
| `pnpm --filter backend dev` | 開発サーバー (http://localhost:3001) |
| `pnpm --filter backend build` | プロダクションビルド (`.next`) |
| `pnpm --filter backend lint` | Lint/フォーマットチェック (Ultracite) |
| `pnpm --filter backend test` | Vitest によるユニットテスト |
| `pnpm --filter backend exec playwright test` | Playwright E2E テスト (ダッシュボード + API) |
| `pnpm --filter backend db:push` | Prisma スキーマの適用 (Turbo 経由) |
| `pnpm --filter backend db:seed` | シードデータ投入 (Turbo 経由) |

> ルートの `pnpm test` を実行すると全ワークスペースのテストが走ります。個別に実行したい場合は上記の `--filter` コマンドを使用してください。

## 環境変数

`.env.local` などの環境ファイルをアプリ直下に配置します。主な変数は次の通りです。

| 変数名 | 説明 |
| --- | --- |
| `DATABASE_URL` / `DIRECT_DATABASE_URL` | Prisma が利用する DB 接続文字列 (libSQL / PostgreSQL) |
| `BETTER_AUTH_SECRET` | Better Auth のシークレットキー |
| `BETTER_AUTH_URL` | 認証コールバックで使用するベース URL |
| `NEXT_PUBLIC_APP_URL` | SSR/メールリンク生成用の公開 URL |
| `AUTH_REQUIRE_ADMIN_APPROVAL` | 管理者承認フローを有効化するかどうか |

チームで共有する際は暗号化ファイル (`env.encrypted.zip`) を `pnpm env:decrypt` で復号してください。

## Prisma の切替 (libSQL / Supabase)

`DATABASE_PROVIDER` 環境変数で `turso` (既定) / `supabase` を切り替え可能です。`supabase` の場合は PostgreSQL 用の接続文字列を指定してください。

## Vercel Blob ストレージ

このアプリケーションは、ファイルアップロード機能に **環境適応型のストレージ抽象化レイヤー** を実装しています。開発環境ではローカルファイルシステム、本番環境では Vercel Blob を自動的に使い分けます。

### 仕組み

`lib/storage.ts` が環境変数 `BLOB_READ_WRITE_TOKEN` と `VERCEL` の有無を判定し、適切なストレージバックエンドを選択します：

- **ローカル開発**: `.storage` ディレクトリにファイルを保存し、`/api/storage/[...path]` エンドポイントで配信
- **Vercel 本番**: Vercel Blob にファイルをアップロードし、CDN 配信

### ローカル開発での動作

環境変数が未設定の場合、自動的にローカルストレージモードで動作します。設定は不要です：

```bash
# 開発サーバー起動
pnpm --filter backend dev

# ファイルアップロードテスト
# → .storage/ ディレクトリに保存される
# → http://localhost:3001/api/storage/<filename> で取得可能
```

ローカルストレージの状態は `/api/storage/debug` エンドポイントで確認できます。

### Vercel Blob の設定手順

本番環境で Vercel Blob を使用する場合の設定手順：

#### 1. Vercel ダッシュボードで Blob ストアを作成

1. [Vercel ダッシュボード](https://vercel.com/dashboard) にログイン
2. プロジェクトを選択
3. **Storage** タブをクリック
4. **Create Database** → **Blob** を選択
5. ストア名を入力 (例: `backend-uploads`)
6. **Create** をクリック

#### 2. 環境変数の自動設定を確認

Blob ストア作成後、以下の環境変数が自動的にプロジェクトに追加されます：

| 変数名 | 説明 | 例 |
| --- | --- | --- |
| `BLOB_READ_WRITE_TOKEN` | Blob API のアクセストークン | `vercel_blob_rw_xxxxxxxxxxxxx` |

Vercel の **Settings** → **Environment Variables** で値を確認できます。

#### 3. 環境別の設定

Vercel Pro アカウント以上の場合、環境ごとに異なる Blob ストアを使用できます：

```bash
# Preview 環境用 Blob ストア
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_preview_xxxxx (Preview のみ有効)

# Staging 環境用 Blob ストア
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_staging_xxxxx (Staging のみ有効)

# Production 環境用 Blob ストア
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_production_xxxxx (Production のみ有効)
```

環境変数のスコープは Vercel ダッシュボードで設定できます。

#### 4. ローカルで本番モードをテストする (オプション)

ローカル環境で Vercel Blob を使用してテストする場合：

```bash
# .env.local に追加
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx
VERCEL=1

# 開発サーバー再起動
pnpm --filter backend dev

# ストレージモードを確認
curl http://localhost:3001/api/storage/debug
# → "type": "vercel-blob" が表示されれば成功
```

### API エンドポイント

#### ファイルアップロード

```bash
# POST /api/upload
curl -X POST http://localhost:3001/api/upload \
  -F "file=@/path/to/image.png"

# レスポンス
{
  "url": "http://localhost:3001/api/storage/1234567890.png"  # ローカルモード
  "url": "https://xxxxx.public.blob.vercel-storage.com/..."  # Vercel Blob モード
}
```

#### ストレージ情報取得

```bash
# GET /api/storage/debug
curl http://localhost:3001/api/storage/debug

# ローカルモードの場合
{
  "type": "local",
  "message": "Using local file storage (.storage directory)",
  "reason": "No BLOB_READ_WRITE_TOKEN configured, Not running on Vercel",
  "apiEndpoint": "/api/storage",
  "debugEndpoint": "/api/storage/debug",
  "environment": "development"
}

# Vercel Blob モードの場合
{
  "type": "vercel-blob",
  "message": "Using Vercel Blob Storage",
  "hasToken": true,
  "isVercel": true,
  "environment": "production"
}
```

### ストレージ抽象化レイヤーの使用例

アプリケーションコード内でストレージを使用する場合：

```typescript
import { uploadBuffer, uploadFile, deleteFile, listFiles } from "@/lib/storage";

// Buffer からアップロード
const url = await uploadBuffer(buffer, "uploads/file.pdf", "application/pdf");

// File オブジェクトからアップロード
const url = await uploadFile(file, { pathname: "uploads/image.png" });

// ファイル削除
await deleteFile(url); // または await deleteFile("uploads/image.png");

// ファイル一覧取得
const files = await listFiles({ prefix: "uploads/", limit: 10 });
```

すべての関数は環境に応じて自動的に適切なバックエンドを使用します。

### トラブルシューティング

**Q: ローカルでファイルがアップロードできない**
- `.storage` ディレクトリの書き込み権限を確認してください
- `/api/storage/debug` で現在のストレージモードを確認してください

**Q: Vercel にデプロイ後、アップロードが失敗する**
- `BLOB_READ_WRITE_TOKEN` 環境変数が設定されているか確認してください
- Vercel ダッシュボードの Storage タブで Blob ストアが作成されているか確認してください
- デプロイログで環境変数が正しく読み込まれているか確認してください

**Q: 環境ごとに異なる Blob ストアを使いたい**
- Vercel Pro アカウントが必要です
- 各環境用の Blob ストアを個別に作成してください
- 環境変数のスコープを Preview/Staging/Production で分けて設定してください

## テスト

- **Vitest**: `vitest.config.ts` / `vitest.setup.ts`。`@testing-library/react` と Prisma のモック (`tests/helpers/prisma-mock.ts`) を利用。
- **Playwright**: `playwright.config.ts`。`pnpm --filter backend exec playwright test` で実行し、必要に応じて `npx playwright test --ui` で UI モードを利用できます。
- **E2E フィクスチャ**: `tests/e2e/fixtures` に認証ユーザーやアクセスログのスタブを定義しています。テスト前に `tests/e2e/helpers/setup-helpers.ts` がシードを実行します。

## デプロイメモ

- ビルド: `pnpm --filter backend build`
- Prisma Client は postinstall 時 (`pnpm prisma:generate`) に生成されるため、CI/CD でも同コマンドを実行してください。
- ミドルウェア (`middleware.ts`) が x-pathname を付与するため、Edge Runtime 対応が必要な場合は Vercel Edge Functions/Turbo を活用してください。

## トラブルシューティング

- **ポート 3001 が利用中**: `scripts/free-port.sh` が自動で解放しますが、macOS で権限エラーが出る場合は手動で `lsof -ti:3001 | xargs kill` を実行してください。
- **Prisma の migrate が失敗する**: 一度 `pnpm db:reset` を実行し、`pnpm db:push` → `pnpm db:seed` の順にやり直してください。
- **認証メールリンクが localhost になる**: `.env` の `NEXT_PUBLIC_APP_URL` を本番 URL に更新し、サーバーを再起動してください。
