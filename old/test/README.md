# テスト基盤ドキュメント

## 概要

Fluorite-flake のテスト基盤は CLI と生成プロジェクトを多面的に検証するため、3 つのレイヤー（ユニット / 機能 / シナリオ）で構成されています。

## ディレクトリ構成

```
test/
├── unit/           # モジュール単位のユニットテスト
├── functional/     # CLI 機能テスト
├── scenario/       # プロジェクト生成シナリオテスト
├── e2e/            # Playwright ベースのエンドツーエンドテスト
│   └── nextjs/     # Next.js テンプレート用フィクスチャと各機能別スペック
├── helpers/        # テスト用ヘルパー群
└── fixtures/       # テストデータ・モック
```

## テストレイヤー

### 1. ユニットテスト (`test/unit/`)
- **目的**: モジュール／関数を単体で検証
- **タイムアウト**: 10 秒
- **対象**: ユーティリティ関数、ジェネレーター、設定モジュール など
- **実行コマンド**: `pnpm test:unit`

構成例:
- `utils/` – ユーティリティ関数
- `config/` – 設定モジュール
- `generators/` – ジェネレーター
- `commands/` – コマンド補助ロジック

### 2. 機能テスト (`test/functional/`)
- **目的**: CLI コマンド・フラグ・対話挙動の検証
- **タイムアウト**: 30 秒
- **対象**: CLI コマンド、引数解決、プロンプト応答
- **実行コマンド**: `pnpm test:functional`

構成例:
- `cli/` – CLI コマンド単体
- `commands/` – サブコマンド実行
- `features/` – 機能統合テスト

### 3. シナリオテスト (`test/scenario/`)
- **目的**: フレームワーク別のプロジェクト生成を丸ごと検証
- **タイムアウト**: 5 分
- **対象**: 各フレームワークのテンプレート生成、関連設定の整合性
- **実行コマンド**: `pnpm test:scenario`
- **実行方式**: 競合回避のため逐次実行
- **検証内容補足**: Next.js シナリオは生成物のファイル／依存関係のみを検証し、アプリ起動や UI 操作は E2E レイヤーへ委譲しました。
- **スキップ**: シナリオレイヤーは CI では既定で実行しないため、必要なタイミングで手動実行してください。

構成例:
- `nextjs/` – Next.js プロジェクト
- `expo/` – Expo (React Native)
- `tauri/` – Tauri デスクトップ
- `flutter/` – Flutter クロスプラットフォーム

### 補助: E2E テスト (`test/e2e/`)
- **目的**: Next.js テンプレートを実際に起動し、ログイン・投稿・組織／ユーザー管理・ローカルストレージ書き込みまでのユースケースを Playwright で検証します。
- **構成**: `test/e2e/nextjs/fixtures/project.ts` でプロジェクト生成〜Next.js 起動を担うフィクスチャを提供し、`auth` / `organization` / `users` / `content` / `storage` といった機能別スペックへ分割しています。
- **タグ運用**: Turso/Prisma 系のテストは `@turso`、Supabase など別スタック用のスペックは今後 `@supabase` タグを付与します。Playwright の `--grep` オプションや config の `projects` と連動して柔軟に絞り込み可能です。
- **実行コマンド**:
  - `pnpm test:e2e -- --project nextjs-turso-prisma` … ローカルのデフォルトスタック (Turso + Prisma + Vercel Blob)
  - `pnpm test:e2e -- --grep @turso` … タグ指定で実行
- **前提**: すべてローカルサービスで完結します。Turso は SQLite ファイル、ストレージは `.storage/` ディレクトリへ書き込まれます。Supabase など外部サービス向けスペックを実行する場合は該当 CLI を事前に起動してください。
- **後片付け**: フィクスチャが自動でテンポラリディレクトリ／dev サーバーをクリーンアップします。

## よく使うコマンド


```bash
# すべてのテストを実行
pnpm test

# レイヤー別
pnpm test:unit          # ユニットテストのみ
pnpm test:functional    # 機能テストのみ
pnpm test:scenario      # シナリオテストのみ
pnpm test:e2e           # Playwright を用いた Next.js E2E フロー

# 開発時
pnpm test:watch         # ウォッチモード
pnpm test:coverage      # カバレッジ出力付き
pnpm test:ui            # Vitest UI を起動

# 単一ファイルを直接指定（workspace を介さない）
pnpm test:single path/to/test.ts
```

## テストヘルパー

### 一時ディレクトリ管理 (`test/helpers/temp-dir.ts`)
```typescript
import { createTempDir, createTempProject, cleanupAllTempDirs } from './helpers/temp-dir.js';

// 一時ディレクトリの作成
const tempDir = await createTempDir('test-prefix-');

// package.json 付きの一時プロジェクト生成
const projectPath = await createTempProject('test-project', {
    framework: 'nextjs',
    packageManager: 'pnpm',
});

// 後片付け
afterAll(async () => {
    await cleanupAllTempDirs();
});
```

### CLI ランナー (`test/helpers/cli-runner.ts`)
```typescript
import { runCli, expectSuccess, expectOutput } from './helpers/cli-runner.js';

// CLI の実行
const result = await runCli(['create', '--help']);

// 検証
expectSuccess(result);
expectOutput(result, 'Create a new project');
```

### プロジェクトジェネレーター (`test/helpers/project-generator.ts`)
```typescript
import { generateProject, verifyProjectStructure, TEST_CONFIGS } from './helpers/project-generator.js';

// プロジェクト生成
const { projectPath, config } = await generateProject({
    projectName: 'test-app',
    framework: 'nextjs',
    database: 'turso',
    orm: 'prisma',
});

// ファイル構成の検証
const { valid, missingFiles } = await verifyProjectStructure(projectPath, [
    'package.json',
    'tsconfig.json',
    'next.config.mjs',
]);
```

## CI/CD 連携

### GitHub Actions ワークフロー

1. **Main CI** (`.github/workflows/ci.yml`)
   - トリガー: main / develop への push と PR
   - 実行内容: ユニット + 機能テスト
   - マトリクス: Node.js 20 / 22

2. **Scenario Tests** (`.github/workflows/scenario-tests.yml`)
   - トリガー: push, PR, 日次スケジュール
  - 実行内容: フレームワーク別シナリオテスト
   - マトリクス: OS (Ubuntu, macOS, Windows) × Framework (Next.js, Expo, Tauri, Flutter)

3. **Test Coverage** (`.github/workflows/test-coverage.yml`)
   - トリガー: push, PR
   - 生成物: Codecov へカバレッジ送信 & レポート成果物

## テスト作成ガイド

### ユニットテスト例
```typescript
import { describe, expect, it } from 'vitest';
import { myFunction } from '../../../src/utils/my-function.js';

describe('myFunction', () => {
    it('基本ケースを処理する', () => {
        const result = myFunction('input');
        expect(result).toBe('expected');
    });
});
```

### 機能テスト例
```typescript
import { describe, expect, it } from 'vitest';
import { runCli, expectSuccess, expectOutput } from '../../helpers/cli-runner.js';

describe('CLI create コマンド', () => {
    it('ヘルプを表示する', async () => {
        const result = await runCli(['create', '--help']);
        expectSuccess(result);
        expectOutput(result, 'Create a new project');
    });
});
```

### シナリオテスト例
```typescript
import { describe, expect, it, afterAll } from 'vitest';
import { generateProject, verifyProjectStructure } from '../../helpers/project-generator.js';
import { cleanupAllTempDirs } from '../../helpers/temp-dir.js';

describe('Next.js プロジェクト生成', () => {
    afterAll(async () => {
        await cleanupAllTempDirs();
    });

    it('Turso を利用した Next.js プロジェクトを生成する', async () => {
        const { projectPath } = await generateProject({
            projectName: 'test-app',
            framework: 'nextjs',
            database: 'turso',
            orm: 'prisma',
        });

        const { valid, missingFiles } = await verifyProjectStructure(projectPath, [
            'package.json',
            'prisma/schema.prisma',
        ]);

        expect(valid).toBe(true);
        expect(missingFiles).toHaveLength(0);
    });
});
```

## テスト時に設定される環境変数

- `FLUORITE_TEST_MODE=true` – テストモードを有効化
- `FLUORITE_CLOUD_MODE=mock` – モックプロビジョナーを使用
- `FLUORITE_AUTO_PROVISION=false` – 自動プロビジョニングを無効化
- `NODE_ENV=test` – Node.js 実行環境を test に設定

## ベストプラクティス

1. **独立性**: テスト同士に依存関係を作らない
2. **クリーンアップ**: 一時ファイル・ディレクトリは必ず削除する
3. **モック活用**: 実環境への API 呼び出しやインストールを避ける
4. **タイムアウト**: テスト種別に応じて適切な値を設定
5. **カバレッジ**: 80% 以上を目標に維持する
6. **命名**: 何を検証するかが伝わるテスト名を付ける
7. **構造化**: 関連ケースは `describe` ブロックでまとめる

## トラブルシューティング

### よくある問題

1. **タイムアウト**: テスト設定のタイムアウトを延長する
2. **ファイル未検出**: クリーンアップ漏れがないか確認する
3. **ポート競合**: テストでは動的ポートを使用する
4. **CI 失敗**: OS 依存の要件 (権限・依存パッケージ) を確認する

### デバッグ実行例

```bash
# 詳細ログを出して実行
DEBUG=* pnpm test

# 特定ファイルのみ実行
pnpm vitest run test/unit/utils/slugify.test.ts

# テスト名でフィルタ
pnpm vitest run -t "should generate Next.js"
```

## 旧構成からの移行

- Playwright E2E テスト → Vitest シナリオテストに統合
- Storybook 関連テスト → 現状不要のため廃止
- 分散していたテスト資産 → 3 レイヤー体系へ再配置

現在はすべてのテストが Vitest ベースで統一され、CLI プロジェクトに適した軽量な検証フローを実現しています。