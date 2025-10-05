# {{PROJECT_NAME}}

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

```bash
pnpm install
```

### 2. データベースの準備

PostgreSQLデータベースを用意し、接続文字列を環境変数に設定:

```bash
cp .env.example .env.local
```

`.env.local` を編集してデータベース接続情報を設定:

```
DATABASE_URL="postgresql://username:password@localhost:5432/your_database"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. データベースマイグレーション

```bash
pnpm db:migrate
pnpm db:generate
```

### 4. 初期データの投入

```bash
pnpm db:seed
```

### 5. 開発サーバーの起動

```bash
pnpm dev
```

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
- `/login` - ログインページ
- `/register` - ユーザー登録ページ（今後実装予定）

### ダッシュボード
- `/dashboard` - メインダッシュボード
- `/dashboard/users` - ユーザー管理
- `/dashboard/users/[id]` - ユーザー詳細・編集
- `/dashboard/users/profile` - プロフィール編集
- `/dashboard/organizations` - 組織管理
- `/dashboard/organizations/[id]` - 組織詳細・編集
- `/dashboard/organizations/create` - 組織作成

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
- `id`: 一意ID
- `name`: 名前
- `email`: メールアドレス（一意）
- `password`: ハッシュ化されたパスワード
- `role`: ロール (ADMIN, MANAGER, USER)
- `organizationId`: 所属組織ID

### Organization (組織)
- `id`: 一意ID
- `name`: 組織名（一意）
- `description`: 説明
- `website`: WebサイトURL

### NextAuth.js テーブル
- `Account`: OAuth アカウント情報
- `Session`: セッション情報
- `VerificationToken`: 確認トークン

## 🚀 Vercel デプロイ

### 1. 環境変数の設定

```bash
# Vercel CLI をインストール
npm i -g vercel

# プロジェクトをVercelに接続
vercel

# 環境変数を自動設定
pnpm env:setup
```

### 2. 本番環境用の環境変数

Vercel ダッシュボードまたはCLIで以下を設定:

- `DATABASE_URL`: 本番用データベース接続文字列
- `NEXTAUTH_SECRET`: 本番用シークレットキー
- `NEXTAUTH_URL`: 本番用アプリケーションURL

### 3. デプロイ

```bash
vercel --prod
```

## 🛠️ 開発コマンド

```bash
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
```

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
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
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
