# Fluorite-flake E2Eテスト仕様書

## 概要

Fluorite-flakeのE2E（End-to-End）テストは、プロジェクトジェネレーターによって生成されたアプリケーションが、実際に正しく動作することを保証するために設計されています。

## テストの目的

1. **即座に開発開始可能であることの保証**
   - 生成されたプロジェクトが追加設定なしですぐに開発を開始できる
   - `npm run dev` / `pnpm run dev` で即座に起動できる

2. **ワンコマンドデプロイの保証**
   - Vercelへのデプロイがコマンド1つで実行可能
   - 各種データベース・ストレージサービスとの統合が正しく設定されている

3. **多様な設定での動作保証**
   - すべての組み合わせ（フレームワーク、データベース、ORM、ストレージ、認証）で正常に動作

## テスト環境

### 実行要件
- Node.js 20.0.0以上
- Playwright（自動インストール）
- npm（pnpmのworkspace問題を回避するため）

### 実行コマンド
```bash
# E2Eテストの実行（CI外で手動実行のみ）
pnpm test:e2e
```

## Next.js E2Eテストストーリー

### 1. 基本的なNext.jsプロジェクト生成
**設定**:
- Framework: Next.js
- Database: なし
- Storage: なし
- Deployment: なし
- Auth: なし
- Package Manager: npm

**検証項目**:
- ✅ package.jsonが正しく生成される
- ✅ next.config.mjsが存在する
- ✅ tsconfig.jsonが正しく設定される
- ✅ src/app/page.tsxが存在する
- ✅ src/app/layout.tsxが存在する
- ✅ src/app/globals.cssが存在する
- ✅ postcss.config.mjsが存在する
- ✅ `npm run build` が成功する
- ✅ `npm run dev` でサーバーが起動する
- ✅ http://localhost:3000 でアプリケーションにアクセスできる

### 2. Turso + Prismaを使用したNext.js
**設定**:
- Framework: Next.js
- Database: Turso
- ORM: Prisma
- Storage: なし
- Deployment: あり（Vercel）
- Auth: あり（Better Auth）
- Package Manager: npm

**検証項目**:
- ✅ prisma/schema.prismaが生成される
- ✅ Better Auth用のスキーマが含まれる
- ✅ 環境変数の設定でTursoに接続可能
- ✅ /login, /register ページが存在する
- ✅ vercel.jsonが生成される

### 3. Turso + Drizzleを使用したNext.js
**設定**:
- Framework: Next.js
- Database: Turso
- ORM: Drizzle
- Storage: なし
- Deployment: なし
- Auth: あり（Better Auth）
- Package Manager: npm

**検証項目**:
- ✅ drizzle.config.tsが生成される
- ✅ src/lib/db/schema.tsが存在する
- ✅ Better Auth用のテーブル定義が含まれる
- ✅ 認証ページが正しく表示される

### 4. Supabase + Prismaを使用したNext.js
**設定**:
- Framework: Next.js
- Database: Supabase
- ORM: Prisma
- Storage: Supabase Storage
- Deployment: あり（Vercel）
- Auth: あり（Better Auth）
- Package Manager: npm

**検証項目**:
- ✅ Supabaseクライアントが設定される
- ✅ ストレージ用のアップロードAPIが存在する
- ✅ /api/upload ルートが動作する

### 5. Supabase + Drizzleを使用したNext.js
**設定**:
- Framework: Next.js
- Database: Supabase
- ORM: Drizzle
- Storage: なし
- Deployment: なし
- Auth: あり（Better Auth）
- Package Manager: npm

**検証項目**:
- ✅ Drizzle用のSupabase接続が設定される
- ✅ 認証システムが正しく統合される

### 6. Vercel Blobストレージを使用したNext.js
**設定**:
- Framework: Next.js
- Database: なし
- Storage: Vercel Blob
- Deployment: あり（Vercel）
- Auth: なし
- Package Manager: npm

**検証項目**:
- ✅ Vercel Blob用のクライアントが設定される
- ✅ ファイルアップロードコンポーネントが存在する
- ✅ /api/upload エンドポイントが存在する

### 7. AWS S3ストレージを使用したNext.js
**設定**:
- Framework: Next.js
- Database: なし
- Storage: AWS S3
- Deployment: なし
- Auth: なし
- Package Manager: npm

**検証項目**:
- ✅ AWS S3クライアントが設定される
- ✅ S3アップロード用の環境変数が定義される

### 8. Cloudflare R2ストレージを使用したNext.js
**設定**:
- Framework: Next.js
- Database: なし
- Storage: Cloudflare R2
- Deployment: なし
- Auth: なし
- Package Manager: npm

**検証項目**:
- ✅ R2クライアントが設定される
- ✅ R2用の環境変数が定義される

## 既知の問題と制限

### 1. pnpm workspace問題
- `/Users/sware/`にpackage.jsonが存在する場合、pnpmがworkspaceとして認識してしまう
- 回避策：E2Eテストではnpmをパッケージマネージャーとして使用

### 2. Badge コンポーネントのTypeScript型エラー
- UIコンポーネントライブラリのBadgeコンポーネントがvariantプロパティを正しく型定義していない
- 修正済み：variantプロパティを使用せず、classNameで直接スタイリング

### 3. テンプレートディレクトリ
- UIコンポーネントは`dist/templates/`から自動的にコピーされる
- TypeScriptコンパイル時に自動的に生成される

## 今後の改善点

1. **CI/CD統合**
   - 現在E2EテストはCIに含まれていない
   - 将来的にはGitHub Actions等での自動実行を検討

2. **他フレームワークのサポート**
   - Expo（React Native）のE2Eテスト追加
   - TauriデスクトップアプリのE2Eテスト追加
   - FlutterアプリのE2Eテスト追加

3. **パフォーマンステスト**
   - ビルド時間の測定
   - 起動時間の測定
   - Lighthouseスコアの自動チェック

4. **デプロイメントテスト**
   - Vercelへの実際のデプロイテスト
   - プレビューデプロイメントの検証

## テスト実行時の注意事項

1. テスト実行前に必ず`pnpm build`を実行してCLIをビルドする
2. テストは`.temp-e2e`ディレクトリにプロジェクトを生成する（自動的にクリーンアップされる）
3. npm installの完了には時間がかかる（約1-2分/プロジェクト）
4. ポート3000が使用されていないことを確認する

## 貢献ガイドライン

新しいE2Eテストケースを追加する場合：

1. `test/e2e/nextjs.spec.ts`の`testConfigs`配列に新しい設定を追加
2. 必要に応じて`verifyProjectStructure`関数を更新
3. 特定の機能に対する追加の検証ロジックを実装
4. このドキュメントに新しいテストストーリーを追加

## まとめ

Fluorite-flakeのE2Eテストは、生成されたプロジェクトが「すぐに開発を始められる」という核心的な価値を保証するために設計されています。すべてのテストケースは、実際のユーザーワークフローを模倣し、生成されたコードの品質と使いやすさを確保します。