# モバイルアプリケーション

Expo Router + React Native で実装されたモバイルクライアントです。Better Auth / GraphQL API を利用してバックエンド（`apps/backend`）と連携し、アクセスログやユーザープロファイルを参照できます。

## 📦 技術スタック

- **フレームワーク**: Expo 54 + React Native 0.82
- **ナビゲーション**: Expo Router 6 + React Navigation 7
- **API**: Apollo Client 4 + GraphQL
- **状態管理**: React Context API
- **認証**: Better Auth (バックエンド連携)
- **テスト**: Vitest + React Testing Library, Maestro (E2E)
- **型チェック**: TypeScript 5.9

## 🚀 セットアップと開発

### 前提条件

- Node.js 22 以上
- pnpm 10.18.3 以上
- Expo CLI（自動インストール）
- iOS Simulator（macOS）または Android Emulator
- [Expo Go](https://expo.dev/client)（実機テスト用）

### ローカル開発の開始

```bash
# リポジトリルートから実行
pnpm install

# バックエンド API が起動していることを確認
pnpm --filter backend dev

# Mobile アプリのみ起動
pnpm --filter mobile dev

# または全アプリを起動
pnpm dev
```

### 開発サーバー

```bash
pnpm --filter mobile dev
```

Metro バンドラーが起動し、ターミナルに QR コードが表示されます：

- **iOS Simulator**: `i` キーを押す
- **Android Emulator**: `a` キーを押す
- **実機（Expo Go）**: QR コードをスキャン

http://localhost:8081 で Expo DevTools にアクセスできます。

## 🌐 環境変数

`.env.local` に以下の変数を設定してください：

| 変数名 | 説明 | 例 |
| --- | --- | --- |
| `EXPO_PUBLIC_API_URL` | バックエンド API の URL | `http://localhost:3001` |

### 環境変数の生成

```bash
# ルートから実行
pnpm env:init
```

## 🏗️ プロジェクト構造

```
apps/mobile/
├── app/                    # Expo Router ページ
│   ├── (tabs)/            # タブナビゲーション
│   │   ├── index.tsx     # ホームタブ
│   │   ├── explore.tsx   # 探索タブ
│   │   └── profile.tsx   # プロフィールタブ
│   ├── login.tsx          # ログインページ
│   ├── _layout.tsx        # ルートレイアウト
│   └── +not-found.tsx     # 404ページ
├── components/            # UI コンポーネント
│   ├── themed/           # テーマ対応コンポーネント
│   └── navigation/       # ナビゲーション関連
├── contexts/              # React Context
│   └── AuthProvider.tsx  # 認証状態管理
├── hooks/                 # カスタムフック
│   ├── useAuth.ts        # 認証フック
│   └── useThemeColor.ts  # テーマフック
├── lib/                   # ユーティリティ
│   ├── apollo-client.ts  # Apollo Client 設定
│   └── graphql/          # GraphQL クエリ・ミューテーション
├── constants/             # 定数
│   ├── api.ts            # API エンドポイント
│   └── theme.ts          # テーマ設定
├── tests/                 # テストファイル
│   └── unit/             # ユニットテスト
├── .maestro/              # Maestro E2E テスト
│   ├── app-launch.yaml   # アプリ起動テスト
│   ├── login-flow.yaml   # ログインフロー
│   └── tab-navigation.yaml # タブナビゲーション
├── .env.local.example     # 環境変数テンプレート
├── app.json               # Expo 設定
├── eas.json               # EAS Build 設定
└── package.json
```

## 🔐 認証フロー

### GraphQL を使用した認証

1. ユーザーがログインページ（`app/login.tsx`）にアクセス
2. メール + パスワードで認証
3. GraphQL `login` ミューテーションでバックエンド API にリクエスト
4. 認証成功後、トークンを `expo-secure-store` に保存
5. タブナビゲーションにリダイレクト

### セッション管理

```tsx
import { useAuth } from "@/hooks/useAuth";

export function MyComponent() {
  const { user, isAuthenticated, signOut } = useAuth();

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <AuthenticatedContent user={user} onSignOut={signOut} />;
}
```

## 🧪 テスト

### ユニットテスト

```bash
# テストを実行
pnpm --filter mobile test

# ウォッチモードで実行
pnpm --filter mobile test:watch

# カバレッジ付きで実行
pnpm --filter mobile test:coverage

# UI モードで実行
pnpm --filter mobile test:ui
```

### Maestro E2E テスト

[Maestro](https://maestro.mobile.dev/) は、モバイルアプリの E2E テストフレームワークです。

#### Maestro のインストール

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

#### テストの実行

```bash
# すべてのフローを実行
maestro test apps/mobile/.maestro/

# 特定のフローを実行
maestro test apps/mobile/.maestro/login-flow.yaml

# ログイン → タブナビゲーション → ログアウトの順に実行
maestro test apps/mobile/.maestro/login-flow.yaml \
            apps/mobile/.maestro/tab-navigation.yaml \
            apps/mobile/.maestro/logout-flow.yaml
```

#### テストフローの作成

`.maestro/` ディレクトリに YAML ファイルを作成：

```yaml
# .maestro/my-flow.yaml
appId: com.yourcompany.mobile
---
- launchApp
- tapOn: "ログインボタン"
- inputText: "test@example.com"
- tapOn: "次へ"
- inputText: "password"
- tapOn: "ログイン"
- assertVisible: "ホーム画面"
```

## 📱 EAS（Expo Application Services）

### EAS の概要

EAS は、Expo アプリのビルド、リリース、更新を管理するクラウドサービスです：

- **EAS Build**: iOS/Android アプリのビルド
- **EAS Submit**: App Store / Google Play への自動リリース
- **EAS Update**: Over-The-Air (OTA) アップデート

### EAS CLI のインストール

```bash
npm install --global eas-cli
```

### プロジェクトの初期化

1. [Expo Dashboard](https://expo.dev/) でプロジェクトを作成
2. プロジェクト ID を取得
3. プロジェクトを初期化：

```bash
cd apps/mobile
eas init --id <project-id>
```

### ビルド設定（`eas.json`）

`eas.json` でビルドプロファイルを設定します：

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCD123456"
      },
      "android": {
        "serviceAccountKeyPath": "./service-account-key.json",
        "track": "internal"
      }
    }
  }
}
```

### ビルドの実行

```bash
# iOS ビルド（開発用）
eas build --platform ios --profile development

# Android ビルド（開発用）
eas build --platform android --profile development

# iOS ビルド（本番用）
eas build --platform ios --profile production

# Android ビルド（本番用）
eas build --platform android --profile production

# 両方ビルド
eas build --platform all --profile production
```

ビルドが完了すると、Expo Dashboard からダウンロードできます。

### アプリのリリース

#### App Store へのリリース

```bash
# ビルド + リリース（ワンコマンド）
eas build --platform ios --profile production --auto-submit

# または既存ビルドをリリース
eas submit --platform ios --latest
```

必要な情報：
- Apple ID
- App Store Connect API Key
- App-specific password

#### Google Play へのリリース

```bash
# ビルド + リリース（ワンコマンド）
eas build --platform android --profile production --auto-submit

# または既存ビルドをリリース
eas submit --platform android --latest
```

必要な情報：
- Google Play Service Account JSON キー
- トラック（internal / alpha / beta / production）

### OTA アップデート

コード変更のみの場合、アプリストアを経由せず Over-The-Air でアップデートできます：

```bash
# プレビュー環境にアップデート
eas update --branch preview

# 本番環境にアップデート
eas update --branch production

# 自動デプロイ設定
eas update:configure
```

## 🔧 主要コマンド

| コマンド | 用途 |
| --- | --- |
| `pnpm --filter mobile dev` | 開発サーバーを起動 |
| `pnpm --filter mobile start` | Expo 開発サーバーを起動 |
| `pnpm --filter mobile android` | Android エミュレーターで起動 |
| `pnpm --filter mobile ios` | iOS シミュレーターで起動 |
| `pnpm --filter mobile web` | Web ブラウザで起動 |
| `pnpm --filter mobile build` | Web プラットフォーム向けエクスポート |
| `pnpm --filter mobile test` | ユニットテストを実行 |
| `pnpm --filter mobile check-types` | 型チェック |

## 🚨 トラブルシューティング

### Metro がポート衝突で起動できない

**症状**: `Address already in use` エラー

**解決方法**:
```bash
# カスタムポートを指定
pnpm --filter mobile dev -- --port 8082

# または既存プロセスを停止
lsof -ti:8081 | xargs kill
```

### GraphQL リクエストが失敗する

**症状**: API リクエストエラー

**解決方法**:
1. バックエンド API が `http://localhost:3001` で起動しているか確認
2. `.env.local` の `EXPO_PUBLIC_API_URL` が正しいか確認
3. iOS シミュレーター/実機の場合、`localhost` ではなく IP アドレスを使用：
   ```bash
   # .env.local
   EXPO_PUBLIC_API_URL=http://192.168.1.100:3001
   ```

### iOS シミュレーターで Haptics が動作しない

**症状**: ハプティクスフィードバックが無効

**解決方法**:
- シミュレーターでは Expo Haptics が無視される場合があります
- 実機でテストしてください

### EAS Build が失敗する

**症状**: ビルドエラー

**解決方法**:
1. `eas build:configure` で設定を再確認
2. `eas.json` の構文が正しいか確認
3. Expo SDK バージョンが `app.json` と一致しているか確認
4. ビルドログを確認：
   ```bash
   eas build:list
   eas build:view <build-id>
   ```

### Maestro テストが失敗する

**症状**: E2E テストエラー

**解決方法**:
1. アプリが起動しているか確認
2. 要素のセレクタが正しいか確認（`maestro studio` でデバッグ）
3. タイミング問題の場合、`- wait: 2000` を追加

## 📚 関連リソース

- [Expo ドキュメント](https://docs.expo.dev/)
- [Expo Router ドキュメント](https://docs.expo.dev/router/introduction/)
- [EAS ドキュメント](https://docs.expo.dev/eas/)
- [Maestro ドキュメント](https://maestro.mobile.dev/)
- [React Native ドキュメント](https://reactnative.dev/)
- [Apollo Client ドキュメント](https://www.apollographql.com/docs/react/)
- [プロジェクトルート README](../../README.md)
- [Backend API ドキュメント](../backend/README.md)

## 💡 開発のヒント

### デバッグ

```bash
# React DevTools を使用
npx react-devtools

# Expo Go のデバッグメニュー
# 実機: デバイスを振る
# iOS シミュレーター: Cmd + D
# Android エミュレーター: Cmd + M
```

### パフォーマンス最適化

- `React.memo` でコンポーネントをメモ化
- `useMemo` / `useCallback` で不要な再レンダリングを防ぐ
- Hermes エンジンを有効化（`app.json` で設定済み）
- 画像は `expo-image` を使用（自動最適化）

### ネイティブモジュールの追加

```bash
# Expo モジュールを追加
npx expo install expo-camera

# 設定ファイルを更新
npx expo prebuild

# 開発ビルドを再作成
eas build --platform ios --profile development
```
