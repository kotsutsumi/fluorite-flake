/**
 * Next.js Full-Stack Admin Template ジェネレーター (Part 4)
 *
 * 環境変数ファイル、ドキュメント、完成関数の実装
 */
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * 環境変数テンプレートを作成
 */
export async function createEnvironmentFiles(
    targetDirectory: string,
    filesCreated: string[]
): Promise<void> {
    // .env.example
    const envExample = `# データベース設定
DATABASE_URL="postgresql://username:password@localhost:5432/fluorite_admin"

# NextAuth.js 設定
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Vercel 設定（本番環境）
# VERCEL_URL は自動設定されます

# オプション設定
# NODE_ENV="development"
# LOG_LEVEL="info"
`;

    await writeFile(
        join(targetDirectory, ".env.example"),
        envExample
    );
    filesCreated.push(".env.example");

    // .env.development
    const envDevelopment = `# 開発環境用設定
DATABASE_URL="postgresql://dev_user:dev_password@localhost:5432/fluorite_admin_dev"
NEXTAUTH_SECRET="development-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
NODE_ENV="development"
LOG_LEVEL="debug"
`;

    await writeFile(
        join(targetDirectory, ".env.development"),
        envDevelopment
    );
    filesCreated.push(".env.development");

    // .env.production
    const envProduction = `# 本番環境用設定
DATABASE_URL="postgresql://prod_user:secure_password@your-db-host:5432/fluorite_admin_prod"
NEXTAUTH_SECRET="super-secure-secret-key-for-production"
NEXTAUTH_URL="https://your-app.vercel.app"
NODE_ENV="production"
LOG_LEVEL="warn"
`;

    await writeFile(
        join(targetDirectory, ".env.production"),
        envProduction
    );
    filesCreated.push(".env.production");

    // .gitignore
    const gitignore = `# Dependencies
node_modules/
/.pnp
.pnp.js

# Testing
/coverage

# Next.js
/.next/
/out/

# Production
/build

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env
.env*.local

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts

# Prisma
prisma/migrations/*
!prisma/migrations/.gitkeep

# IDE
.vscode/
.idea/
*.swp
*.swo

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Dependency directories
node_modules/
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env
.env.test
.env.production
.env.development

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# next.js build output
.next

# nuxt.js build output
.nuxt

# vuepress build output
.vuepress/dist

# Serverless directories
.serverless

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port

# Environment variable backups
env-backup.zip
env-import-temp/
*.backup
`;

    await writeFile(
        join(targetDirectory, ".gitignore"),
        gitignore
    );
    filesCreated.push(".gitignore");
}

/**
 * ドキュメントを作成
 */
export async function createDocumentation(
    targetDirectory: string,
    projectName: string,
    filesCreated: string[]
): Promise<void> {
    // README.md
    const readme = `# ${projectName}

Fluorite Flake で生成されたNext.js フルスタック管理システム

## 🚀 機能

- ✅ **認証システム** - NextAuth.js による安全なログイン・ログアウト
- ✅ **ユーザー管理** - CRUD操作、ロール管理、プロフィール機能
- ✅ **組織管理** - 組織の作成・編集・削除、ユーザーの組織割り当て
- ✅ **データベース統合** - Prisma ORM による型安全なデータベース操作
- ✅ **管理ダッシュボード** - 直感的で使いやすい管理インターフェース
- ✅ **Vercel対応** - 環境変数管理とワンクリックデプロイ
- ✅ **レスポンシブデザイン** - モバイルフレンドリーなUI
- ✅ **型安全性** - TypeScript による完全な型安全性

## 🛠️ 技術スタック

- **フロントエンド**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **バックエンド**: Next.js API Routes, NextAuth.js
- **データベース**: PostgreSQL, Prisma ORM
- **認証**: NextAuth.js (Credentials Provider)
- **スタイリング**: Tailwind CSS, Lucide React (アイコン)
- **フォーム**: React Hook Form, Zod
- **開発ツール**: Ultracite (Biome), TypeScript

## 📦 セットアップ

### 1. 依存関係のインストール

\`\`\`bash
pnpm install
\`\`\`

### 2. データベースの準備

PostgreSQLデータベースを用意し、接続文字列を環境変数に設定:

\`\`\`bash
cp .env.example .env.local
\`\`\`

\`.env.local\` を編集してデータベース接続情報を設定:

\`\`\`
DATABASE_URL="postgresql://username:password@localhost:5432/your_database"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
\`\`\`

### 3. データベースマイグレーション

\`\`\`bash
pnpm db:migrate
pnpm db:generate
\`\`\`

### 4. 初期データの投入

\`\`\`bash
pnpm db:seed
\`\`\`

### 5. 開発サーバーの起動

\`\`\`bash
pnpm dev
\`\`\`

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## 🔑 デフォルトアカウント

データベースシード後、以下のアカウントでログインできます:

### 管理者アカウント
- **メール**: admin@example.com
- **パスワード**: admin123456
- **ロール**: ADMIN

### テストユーザー
- **メール**: user@example.com
- **パスワード**: user123456
- **ロール**: USER

## 📱 ページ構成

### 認証ページ
- \`/login\` - ログインページ
- \`/register\` - ユーザー登録ページ（今後実装予定）

### ダッシュボード
- \`/dashboard\` - メインダッシュボード
- \`/dashboard/users\` - ユーザー管理
- \`/dashboard/users/[id]\` - ユーザー詳細・編集
- \`/dashboard/users/profile\` - プロフィール編集
- \`/dashboard/organizations\` - 組織管理
- \`/dashboard/organizations/[id]\` - 組織詳細・編集
- \`/dashboard/organizations/create\` - 組織作成

## 🎯 権限システム

### ロール定義
- **ADMIN**: 全ての操作が可能（ユーザー・組織の管理）
- **MANAGER**: 所属組織のユーザー管理が可能
- **USER**: 自分のプロフィールのみ編集可能

### 権限マトリックス
| 操作 | ADMIN | MANAGER | USER |
|------|-------|---------|------|
| ユーザー作成・削除 | ✅ | ✅* | ❌ |
| 組織作成・削除 | ✅ | ❌ | ❌ |
| システム設定 | ✅ | ❌ | ❌ |
| プロフィール編集 | ✅ | ✅ | ✅ |

*MANAGERは所属組織のユーザーのみ

## 🗄️ データベーススキーマ

### User (ユーザー)
- \`id\`: 一意ID
- \`name\`: 名前
- \`email\`: メールアドレス（一意）
- \`password\`: ハッシュ化されたパスワード
- \`role\`: ロール (ADMIN, MANAGER, USER)
- \`organizationId\`: 所属組織ID

### Organization (組織)
- \`id\`: 一意ID
- \`name\`: 組織名（一意）
- \`description\`: 説明
- \`website\`: WebサイトURL

### NextAuth.js テーブル
- \`Account\`: OAuth アカウント情報
- \`Session\`: セッション情報
- \`VerificationToken\`: 確認トークン

## 🚀 Vercel デプロイ

### 1. 環境変数の設定

\`\`\`bash
# Vercel CLI をインストール
npm i -g vercel

# プロジェクトをVercelに接続
vercel

# 環境変数を自動設定
pnpm env:setup
\`\`\`

### 2. 本番環境用の環境変数

Vercel ダッシュボードまたはCLIで以下を設定:

- \`DATABASE_URL\`: 本番用データベース接続文字列
- \`NEXTAUTH_SECRET\`: 本番用シークレットキー
- \`NEXTAUTH_URL\`: 本番用アプリケーションURL

### 3. デプロイ

\`\`\`bash
vercel --prod
\`\`\`

## 🛠️ 開発コマンド

\`\`\`bash
# 開発サーバー起動
pnpm dev

# プロダクションビルド
pnpm build

# プロダクション実行
pnpm start

# リント・フォーマット
pnpm lint
pnpm format

# 型チェック
pnpm type-check

# データベース操作
pnpm db:generate     # Prisma クライアント生成
pnpm db:migrate      # マイグレーション実行
pnpm db:push         # スキーマをデータベースにプッシュ
pnpm db:seed         # 初期データ投入

# 環境変数管理
pnpm env:setup       # Vercel 環境変数セットアップ
pnpm env:export      # 環境変数のエクスポート
\`\`\`

## 📋 TODO / 今後の実装予定

- [ ] ユーザー登録機能
- [ ] OAuth プロバイダー連携（Google, GitHub）
- [ ] メール認証機能
- [ ] パスワードリセット機能
- [ ] 二段階認証
- [ ] ユーザーアクティビティログ
- [ ] 組織の階層構造
- [ ] ファイルアップロード機能
- [ ] 通知システム
- [ ] API キー管理
- [ ] データエクスポート機能
- [ ] ダークモード
- [ ] 多言語対応

## 🤝 コントリビューション

1. フォークしてください
2. フィーチャーブランチを作成 (\`git checkout -b feature/amazing-feature\`)
3. 変更をコミット (\`git commit -m 'Add amazing feature'\`)
4. ブランチにプッシュ (\`git push origin feature/amazing-feature\`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

## 🙏 謝辞

- [Next.js](https://nextjs.org/) - React フレームワーク
- [NextAuth.js](https://next-auth.js.org/) - 認証ライブラリ
- [Prisma](https://www.prisma.io/) - データベース ORM
- [Tailwind CSS](https://tailwindcss.com/) - CSS フレームワーク
- [Lucide React](https://lucide.dev/) - アイコンライブラリ
- [Fluorite Flake](https://github.com/kotsutsumi/fluorite-flake) - プロジェクトジェネレーター

---

💫 Generated with [Fluorite Flake](https://github.com/kotsutsumi/fluorite-flake)
`;

    await writeFile(
        join(targetDirectory, "README.md"),
        readme
    );
    filesCreated.push("README.md");

    // DEPLOYMENT.md
    const deploymentGuide = `# Deployment Guide

このガイドでは、${projectName} を本番環境にデプロイする方法を説明します。

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

\`\`\`bash
# Vercel プロジェクトの初期化
vercel

# 本番環境用の環境変数を設定
vercel env add DATABASE_URL production
vercel env add NEXTAUTH_SECRET production
vercel env add NEXTAUTH_URL production
\`\`\`

または自動セットアップスクリプトを使用:

\`\`\`bash
# .env.production ファイルから自動設定
pnpm env:setup
\`\`\`

### 3. データベースマイグレーション

本番環境でマイグレーションを実行:

\`\`\`bash
# ローカルでプロダクションDBに接続してマイグレーション
DATABASE_URL="your-production-db-url" pnpm db:migrate
DATABASE_URL="your-production-db-url" pnpm db:seed
\`\`\`

### 4. デプロイ実行

\`\`\`bash
# プロダクションデプロイ
vercel --prod
\`\`\`

## 🐳 Docker デプロイ

### Dockerfile

プロジェクトルートに \`Dockerfile\` を作成:

\`\`\`dockerfile
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
\`\`\`

### docker-compose.yml

\`\`\`yaml
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
\`\`\`

### デプロイ実行

\`\`\`bash
# Docker Compose でビルド・起動
docker-compose up --build -d

# マイグレーション実行
docker-compose exec app npx prisma migrate deploy
docker-compose exec app npx prisma db seed
\`\`\`

## ☁️ その他のプラットフォーム

### Netlify

1. \`netlify.toml\` を作成:

\`\`\`toml
[build]
  command = "pnpm build"
  publish = ".next"

[functions]
  external_node_modules = ["@prisma/client"]

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
\`\`\`

2. 環境変数を Netlify ダッシュボードで設定
3. GitリポジトリをNetlifyに接続

### Railway

1. [Railway](https://railway.app/) でプロジェクト作成
2. GitHubリポジトリを接続
3. 環境変数を設定:
   - \`DATABASE_URL\`
   - \`NEXTAUTH_SECRET\`
   - \`NEXTAUTH_URL\`
4. 自動デプロイが開始されます

## 🔧 環境変数設定例

### 必須環境変数

\`\`\`bash
# データベース
DATABASE_URL="postgresql://user:password@host:5432/database"

# NextAuth.js
NEXTAUTH_SECRET="super-secret-key-change-this"
NEXTAUTH_URL="https://your-domain.com"
\`\`\`

### オプション環境変数

\`\`\`bash
# ログレベル
LOG_LEVEL="warn"

# Sentry (エラー追跡)
SENTRY_DSN="your-sentry-dsn"

# メール送信 (将来実装予定)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-password"
\`\`\`

## 🛡️ セキュリティチェックリスト

### デプロイ前の確認事項

- [ ] \`NEXTAUTH_SECRET\` が本番用の強力なキーに設定されている
- [ ] データベースパスワードが強力に設定されている
- [ ] \`NEXTAUTH_URL\` が正しいドメインに設定されている
- [ ] 不要な環境変数ファイルが \`.gitignore\` されている
- [ ] データベースへの直接アクセスが制限されている
- [ ] HTTPS が有効になっている
- [ ] CSP (Content Security Policy) が設定されている

### 定期的なメンテナンス

- [ ] 依存関係の更新 (\`pnpm update\`)
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

\`/api/health\` エンドポイントを作成して監視:

\`\`\`typescript
// app/api/health/route.ts
export async function GET() {
    return Response.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'connected' // DB接続確認
    });
}
\`\`\`

## 🚨 トラブルシューティング

### よくある問題

1. **データベース接続エラー**
   - \`DATABASE_URL\` の確認
   - ネットワーク接続の確認
   - データベースサーバーの状態確認

2. **認証エラー**
   - \`NEXTAUTH_SECRET\` の確認
   - \`NEXTAUTH_URL\` の確認
   - セッション設定の確認

3. **ビルドエラー**
   - 依存関係の確認
   - 型エラーの修正
   - 環境変数の設定確認

### ログの確認

\`\`\`bash
# Vercel ログの確認
vercel logs

# Docker ログの確認
docker-compose logs app

# Railway ログの確認
railway logs
\`\`\`

---

💫 Generated with [Fluorite Flake](https://github.com/kotsutsumi/fluorite-flake)
`;

    await writeFile(
        join(targetDirectory, "DEPLOYMENT.md"),
        deploymentGuide
    );
    filesCreated.push("DEPLOYMENT.md");

    // API.md
    const apiDocumentation = `# API Documentation

${projectName} のAPI仕様書

## 🔑 認証

このAPIは NextAuth.js のセッションベース認証を使用しています。

### 認証ヘッダー

すべてのAPI呼び出しにはセッションCookieが必要です。

\`\`\`http
Cookie: next-auth.session-token=your-session-token
\`\`\`

## 🔒 権限

### ロール定義
- **ADMIN**: すべてのリソースにアクセス可能
- **MANAGER**: 所属組織のユーザー管理可能
- **USER**: 自分の情報のみアクセス可能

## 📚 エンドポイント

### 認証 API

#### POST /api/auth/signin
ユーザーログイン

**リクエスト:**
\`\`\`json
{
  "email": "user@example.com",
  "password": "password123"
}
\`\`\`

**レスポンス:**
\`\`\`json
{
  "user": {
    "id": "clxxxxx",
    "name": "ユーザー名",
    "email": "user@example.com",
    "role": "USER"
  }
}
\`\`\`

#### POST /api/auth/signout
ユーザーログアウト

### ユーザー API

#### GET /api/users
ユーザー一覧取得

**クエリパラメータ:**
- \`organizationId\` (optional): 組織IDでフィルタ

**権限:** ADMIN, MANAGER

**レスポンス:**
\`\`\`json
[
  {
    "id": "clxxxxx",
    "name": "ユーザー名",
    "email": "user@example.com",
    "role": "USER",
    "organizationId": "clyyyyy",
    "organization": {
      "id": "clyyyyy",
      "name": "組織名"
    },
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
]
\`\`\`

#### POST /api/users
ユーザー作成

**権限:** ADMIN, MANAGER

**リクエスト:**
\`\`\`json
{
  "name": "新しいユーザー",
  "email": "newuser@example.com",
  "password": "securepassword",
  "role": "USER",
  "organizationId": "clyyyyy"
}
\`\`\`

**レスポンス:**
\`\`\`json
{
  "id": "clxxxxx",
  "name": "新しいユーザー",
  "email": "newuser@example.com",
  "role": "USER",
  "organizationId": "clyyyyy",
  "organization": {
    "id": "clyyyyy",
    "name": "組織名"
  },
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
\`\`\`

#### GET /api/users/[id]
ユーザー詳細取得

**権限:** ADMIN, MANAGER, または本人

**レスポンス:**
\`\`\`json
{
  "id": "clxxxxx",
  "name": "ユーザー名",
  "email": "user@example.com",
  "role": "USER",
  "organizationId": "clyyyyy",
  "organization": {
    "id": "clyyyyy",
    "name": "組織名"
  },
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
\`\`\`

#### PUT /api/users/[id]
ユーザー更新

**権限:** ADMIN, MANAGER, または本人

**リクエスト:**
\`\`\`json
{
  "name": "更新されたユーザー名",
  "email": "updated@example.com",
  "role": "MANAGER"
}
\`\`\`

#### DELETE /api/users/[id]
ユーザー削除

**権限:** ADMIN のみ

### 組織 API

#### GET /api/organizations
組織一覧取得

**権限:** 認証済みユーザー

**レスポンス:**
\`\`\`json
[
  {
    "id": "clyyyyy",
    "name": "組織名",
    "description": "組織の説明",
    "website": "https://example.com",
    "users": [
      {
        "id": "clxxxxx",
        "name": "ユーザー名",
        "email": "user@example.com",
        "role": "USER"
      }
    ],
    "_count": {
      "users": 5
    },
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
]
\`\`\`

#### POST /api/organizations
組織作成

**権限:** ADMIN のみ

**リクエスト:**
\`\`\`json
{
  "name": "新しい組織",
  "description": "組織の説明",
  "website": "https://neworg.com"
}
\`\`\`

#### GET /api/organizations/[id]
組織詳細取得

**権限:** 認証済みユーザー

#### PUT /api/organizations/[id]
組織更新

**権限:** ADMIN のみ

#### DELETE /api/organizations/[id]
組織削除

**権限:** ADMIN のみ

## 🚨 エラーハンドリング

### エラーレスポンス形式

\`\`\`json
{
  "error": "エラーメッセージ",
  "code": "ERROR_CODE",
  "details": {
    "field": "エラーの詳細情報"
  }
}
\`\`\`

### HTTPステータスコード

- \`200\`: 成功
- \`201\`: 作成成功
- \`400\`: リクエストエラー
- \`401\`: 認証が必要
- \`403\`: 権限不足
- \`404\`: リソースが見つからない
- \`422\`: バリデーションエラー
- \`500\`: サーバーエラー

### よくあるエラー

#### 認証エラー
\`\`\`json
{
  "error": "認証が必要です",
  "code": "UNAUTHORIZED"
}
\`\`\`

#### 権限エラー
\`\`\`json
{
  "error": "管理者権限が必要です",
  "code": "FORBIDDEN"
}
\`\`\`

#### バリデーションエラー
\`\`\`json
{
  "error": "入力データが正しくありません",
  "code": "VALIDATION_ERROR",
  "details": {
    "email": "有効なメールアドレスを入力してください",
    "password": "パスワードは8文字以上で入力してください"
  }
}
\`\`\`

## 🔄 ページネーション

大量のデータを返すエンドポイントではページネーションを使用します。

### リクエストパラメータ

- \`page\`: ページ番号（デフォルト: 1）
- \`limit\`: 1ページあたりの件数（デフォルト: 20、最大: 100）

### レスポンス形式

\`\`\`json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
\`\`\`

## 🔍 フィルタリング

### ユーザー検索

\`GET /api/users?search=keyword&role=USER&organizationId=clyyyyy\`

### 組織検索

\`GET /api/organizations?search=keyword\`

## 📝 使用例

### JavaScript/TypeScript

\`\`\`typescript
// ユーザー一覧取得
const response = await fetch('/api/users', {
  credentials: 'include'
});
const users = await response.json();

// ユーザー作成
const newUser = await fetch('/api/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    name: '新しいユーザー',
    email: 'newuser@example.com',
    password: 'securepassword',
    role: 'USER'
  })
});
\`\`\`

### cURL

\`\`\`bash
# ユーザー一覧取得
curl -X GET http://localhost:3000/api/users \\
  -H "Cookie: next-auth.session-token=your-session-token"

# ユーザー作成
curl -X POST http://localhost:3000/api/users \\
  -H "Content-Type: application/json" \\
  -H "Cookie: next-auth.session-token=your-session-token" \\
  -d '{
    "name": "新しいユーザー",
    "email": "newuser@example.com",
    "password": "securepassword",
    "role": "USER"
  }'
\`\`\`

---

💫 Generated with [Fluorite Flake](https://github.com/kotsutsumi/fluorite-flake)
`;

    await writeFile(
        join(targetDirectory, "API.md"),
        apiDocumentation
    );
    filesCreated.push("API.md");
}

// EOF