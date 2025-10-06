# commands/create/generator.ts レビュー

## 概要
`generateProject` は CLI の `create` コマンドで使用される統合的なプロジェクト生成フローです。monorepo / シンプル構成の両方を処理しつつ、Next.js 拡張テンプレートなどの高度な出力にも対応します。今回の更新でモノレポ生成時に `syncRootScripts()` を呼び出し、ルート `package.json` に `pnpm --filter` スクリプトを自動反映するようになりました。

## 主な処理フロー
1. `getMessages()` のローカライズメッセージを利用して `ora` のスピナーを初期化。
2. `debugLog()` で入力 `ProjectConfig` を開発モード時にトレース。
3. 擬似ディレイ (`SETUP_TIMEOUT_MS` など) でステップ毎の進捗を演出。
4. 出力先ディレクトリを作成 (`fs.mkdirSync` with `recursive`).
5. 拡張テンプレート判定 (`isAdvancedTemplate`) に応じて `handleAdvancedTemplate` or `handleStandardTemplate` を実行。
6. **monorepo 生成時は `syncRootScripts(config.directory)` を await** — 生成された `apps/*` の `package.json` からルートスクリプトを自動同期。
7. スピナーを `succeed` に切り替え、プロジェクトパスを `chalk.cyan` で表示。
8. 例外時は `fail` に変更し、開発モードでは詳細スタックをログ。

## モード別の生成内容
### 拡張テンプレートモード
- 対象: Next.js `fullstack-admin` など高度テンプレート。
- `generateFullStackAdmin()` を通じてテンプレートディレクトリをコピーし、環境変数ファイルや Prisma スキーマを調整。
- モノレポの場合でもターゲットは `apps/web` に設定され、その後の `syncRootScripts()` でルートスクリプトが更新される。

### Monorepo モード
- `createMonorepoStructure()` で `apps` / `packages` ディレクトリを生成。
- `copyMonorepoTemplates()` がルートテンプレート (package.json, pnpm-workspace.yaml など) を展開。
- `createWebAppPackageJson()` で `apps/web` 直下に雛形の `package.json` を配置。
- **最後に `syncRootScripts()` がルート `package.json` に `web:dev` や `build:all` を追記。**

### シンプルモード
- タイプ別デフォルトの `dev` / `build` スクリプトを持つ `package.json` を生成。
- README 生成 (`generateReadmeContent`) は共通処理。

## 出力とログ
- 成功時に `chalk.green` のメッセージと `chalk.cyan` のパス表示。
- 開発モードでは成功・失敗どちらでも `debugLog()` を通じて詳細を記録。

## 依存ユーティリティ
- `monorepo-generator`：構造生成とテンプレートコピー。
- `workspace-manager`：`syncRootScripts` で利用。
- `readme-generator`：多言語 README を作成。
- `debug.ts` / `i18n.ts`：開発ログとメッセージ取得。

## 品質・改善メモ
- `syncRootScripts` を await することでモノレポ生成直後の `package.json` が常に最新化される。
- モノレポ判定ロジックは `config.monorepo` に集約されており、追加モードにも拡張しやすい。
- 擬似待機はユーザー体感向けであり、将来的に実処理へ置き換える際は同定数を調整する必要がある。