# Deployment Guide

このガイドでは、{{PROJECT_NAME}} を本番環境にデプロイする方法を説明します。

## 🚀 Vercel デプロイ (推奨)

### 前提条件

- [Vercel CLI](https://vercel.com/cli) がインストールされていること
- PostgreSQL データベースが準備されていること
- GitHub/GitLab リポジトリが設定されていること

### 1. データベースの準備

本番環境用のPostgreSQLデータベースを用意します。推奨サービス:

- [Supabase](https://supabase.com/) (無料プランあり)
- [PlanetScale](https://planetscale.com/) (MySQL)
- [Railway](https://railway.app/)
- [Neon](https://neon.tech/) (PostgreSQL)

### 2. 環境変数の設定

```bash
# Vercel プロジェクトの初期化
vercel

# 本番環境用の環境変数を設定
vercel env add DATABASE_URL production
vercel env add NEXTAUTH_SECRET production
vercel env add NEXTAUTH_URL production
```

または自動セットアップスクリプトを使用:

```bash
# .env.production ファイルから自動設定
pnpm env:setup
```

### 3. データベースマイグレーション

本番環境でマイグレーションを実行:

```bash
# ローカルでプロダクションDBに接続してマイグレーション
DATABASE_URL="your-production-db-url" pnpm db:migrate
DATABASE_URL="your-production-db-url" pnpm db:seed
```

### 4. デプロイ実行

```bash
# プロダクションデプロイ
vercel --prod
```

## 🐳 Docker デプロイ

### Dockerfile

プロジェクトルートに `Dockerfile` を作成:

```dockerfile
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm install -g pnpm && pnpm build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]
```

### docker-compose.yml

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/fluorite_admin
      - NEXTAUTH_SECRET=your-secret-key
      - NEXTAUTH_URL=http://localhost:3000
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: fluorite_admin
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

### デプロイ実行

```bash
# Docker Compose でビルド・起動
docker-compose up --build -d

# マイグレーション実行
docker-compose exec app npx prisma migrate deploy
docker-compose exec app npx prisma db seed
```

## ☁️ その他のプラットフォーム

### Netlify

1. `netlify.toml` を作成:

```toml
[build]
  command = "pnpm build"
  publish = ".next"

[functions]
  external_node_modules = ["@prisma/client"]

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

2. 環境変数を Netlify ダッシュボードで設定
3. GitリポジトリをNetlifyに接続

### Railway

1. [Railway](https://railway.app/) でプロジェクト作成
2. GitHubリポジトリを接続
3. 環境変数を設定:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
4. 自動デプロイが開始されます

## 🔧 環境変数設定例

### 必須環境変数

```bash
# データベース
DATABASE_URL="postgresql://user:password@host:5432/database"

# NextAuth.js
NEXTAUTH_SECRET="super-secret-key-change-this"
NEXTAUTH_URL="https://your-domain.com"
```

### オプション環境変数

```bash
# ログレベル
LOG_LEVEL="warn"

# Sentry (エラー追跡)
SENTRY_DSN="your-sentry-dsn"

# メール送信 (将来実装予定)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-password"
```

## 🛡️ セキュリティチェックリスト

### デプロイ前の確認事項

- [ ] `NEXTAUTH_SECRET` が本番用の強力なキーに設定されている
- [ ] データベースパスワードが強力に設定されている
- [ ] `NEXTAUTH_URL` が正しいドメインに設定されている
- [ ] 不要な環境変数ファイルが `.gitignore` されている
- [ ] データベースへの直接アクセスが制限されている
- [ ] HTTPS が有効になっている
- [ ] CSP (Content Security Policy) が設定されている

### 定期的なメンテナンス

- [ ] 依存関係の更新 (`pnpm update`)
- [ ] セキュリティパッチの適用
- [ ] ログの監視
- [ ] バックアップの確認
- [ ] パフォーマンスの監視

## 📊 モニタリング

### おすすめモニタリングツール

- **Vercel Analytics**: 標準の分析ツール
- **Sentry**: エラー追跡
- **LogRocket**: ユーザーセッション記録
- **Uptime Robot**: アップタイム監視

### ヘルスチェックエンドポイント

`/api/health` エンドポイントを作成して監視:

```typescript
// app/api/health/route.ts
export async function GET() {
    return Response.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'connected' // DB接続確認
    });
}
```

## 🚨 トラブルシューティング

### よくある問題

1. **データベース接続エラー**
   - `DATABASE_URL` の確認
   - ネットワーク接続の確認
   - データベースサーバーの状態確認

2. **認証エラー**
   - `NEXTAUTH_SECRET` の確認
   - `NEXTAUTH_URL` の確認
   - セッション設定の確認

3. **ビルドエラー**
   - 依存関係の確認
   - 型エラーの修正
   - 環境変数の設定確認

### ログの確認

```bash
# Vercel ログの確認
vercel logs

# Docker ログの確認
docker-compose logs app

# Railway ログの確認
railway logs
```

---

💫 Generated with [Fluorite Flake](https://github.com/kotsutsumi/fluorite-flake)
