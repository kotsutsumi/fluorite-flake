# Fluorite Full-Stack Admin Template

このディレクトリは Fluorite Flake の Next.js フルスタック管理テンプレートです。認証・ユーザー管理・組織管理・プロフィール更新機能をサンプル実装として備えており、Turso または Supabase を選択して利用できます。

## セットアップ手順

```bash
# 依存関係をインストール
pnpm install

# Prisma Client を生成
pnpm db:generate

# データベースを初期化（必要に応じて）
pnpm db:reset

# 開発サーバーを起動
pnpm dev
```

## 環境変数

テンプレートには以下の環境ファイルが含まれています。生成時に選択したデータベースに応じて主要なプレースホルダーは自動で設定されます。必要に応じて本番用の値に更新してください。

- `.env`
- `.env.development`
- `.env.staging`
- `.env.prod`

ローカル開発（`.env` / `.env.development`）では SQLite (`file:../prisma/dev.db`) を利用する設定が既定です。そのまま `pnpm db:reset` を実行すれば起動用の初期データが投入されます。

### Turso を利用する場合
- `DATABASE_PROVIDER=turso`
- `.env.staging` / `.env.prod` 内の `TURSO_DATABASE_URL` と `TURSO_AUTH_TOKEN` を本番用に更新
- ローカルで Turso を利用したい場合は `.env` / `.env.development` の `DATABASE_URL` を `libsql://` 形式に書き換え、`TURSO_AUTH_TOKEN` も設定してください。

### Supabase を利用する場合
- `DATABASE_PROVIDER=supabase`
- `DATABASE_URL` / `DIRECT_DATABASE_URL` に PostgreSQL 接続文字列を設定
- `SUPABASE_URL` と `SUPABASE_SERVICE_ROLE_KEY` に Supabase プロジェクトの値を入力

## 主な機能
- Better Auth を用いたメール+パスワード認証
- 役割ベースのアクセス制御（管理者 / 組織管理者 / 一般ユーザー）
- 組織とメンバーの管理 UI
- プロフィール更新・ファイルアップロードのサンプル実装
- Prisma + Tailwind CSS + shadcn/ui + Kibo UI コンポーネント

## データベース
- Prisma スキーマ (`prisma/schema.supabase.prisma` / `prisma/schema.turso.prisma`)
- 生成後に選択されたデータベース方式に合わせて `prisma/schema.prisma` が自動で差し替えられます
- `prisma/seed.ts` で初期データの投入が可能

必要に応じてドメイン固有の要件に合わせて調整してください。
