# Repository Guidelines

## Project Structure & Module Organization

- `src/cli.ts` 配下で Commander による CLI 配線と質問フローを構築します。副作用のある I/O はここに限定し、再利用可能なロジックはモジュールへ切り出してください。
- `src/index.ts` はライブラリ利用者向けの公開 API を束ねます。新しいユーティリティはここで再輸出します。
- `src/utils/`・`src/generators/` などのモジュールはテストしやすい純粋ロジックで構成し、CLI から参照します。
- `scripts/` はメンテナンス用シェル/TS スクリプトを配置する場所です。自動化が必要な場合はまずここを検討してください。
- `tests/` 配下にテスト資産を集約します。
  - `tests/unit/**` …… モジュール単体の Vitest。
  - `tests/functional/**` …… CLI の機能単位テスト (ジェネレーターや選択フロー)。
  - `tests/scenario/**` …… プロジェクト生成〜起動までのシナリオ検証。
  - `tests/helpers/**` …… テンポラリディレクトリ作成・CLI 実行などの共通ヘルパー。
- `dist/` は `pnpm build` の成果物です。手動で編集しないでください。

## Build, Test, and Development Commands

- `pnpm install` …… Node.js 20 以上で依存関係をインストール。
- `pnpm dev` …… `tsx src/cli.ts` によるホットリロード付き CLI 実行。
- `pnpm build` …… TypeScript を `dist/` へコンパイルし、型定義を生成。
- `pnpm lint` / `pnpm format` / `pnpm check` …… Biome による静的解析と整形。
- **テストコマンド**
  - `pnpm test` …… Vitest workspace を使い Unit + Functional テストを一括実行（常時グリーンを維持）。
  - `pnpm test:unit` / `pnpm test:functional` …… レイヤー別に個別実行。
  - `pnpm test:scenario` …… 重量級シナリオ（実際にプロジェクトを生成し検証）。必要に応じて手動または夜間 CI で実行。
  - `pnpm test:watch` …… 開発中のウォッチモード。
- Storybook / Playwright-CT のセットアップは現状不要のため削除済みです。GUI 向けテストが必要になった場合に再導入を検討してください。

## Coding Style & Naming Conventions

- Biome が LF・4 スペース・シングルクォート・セミコロンを強制します。広範囲に編集した場合は `pnpm format` を必ず実行してください。
- 命名規則: 変数/関数は `camelCase`、クラス/型は `PascalCase`、CLI コマンドは `kebab-case`。
- CLI と再利用モジュールを混在させないようにし、I/O 境界を意識してください。

## Testing Guidelines

- **コードを変更したら必ず対応するテストも更新・追加し、`pnpm test` が成功することを確認してください。**
- ユニットテストは対象モジュールごとに `tests/unit/*.test.ts` へ配置し、テンポラリディレクトリを利用してファイル出力を検証します。
- 機能テストでは `tests/functional/` 内で CLI の単機能（例: フレームワーク選択、ジェネレーター単体）を検証します。`tests/helpers/cli.ts` のランナーを活用してください。
- シナリオテスト (`tests/scenario/`) では実際にプロジェクトを生成し、`pnpm dev` が起動するか・必要なファイルがそろっているかを確認します。長時間テストなので、ブランチ統合前や CI の夜間ジョブで実行する運用を推奨します。
- 生成物を検証するテストでは `/tmp` 相当のテンポラリディレクトリを用い、テスト終了時に確実にクリーンアップしてください。

## Commit & Pull Request Guidelines

- コミットメッセージは短い現在形で記述し、異なる責務は分割してください。
- PR では変更内容・動機・今後のフォローアップを記載し、実行した検証コマンド（`pnpm lint`, `pnpm build`, `pnpm test`, 必要に応じて `pnpm test:scenario` など）を明記してください。
- CLI 挙動を変更した場合はスクリーンショットまたはターミナルログを添付するとレビューがスムーズです。
