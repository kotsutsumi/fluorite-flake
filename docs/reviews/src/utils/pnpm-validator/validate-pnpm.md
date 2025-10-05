# pnpm-validator/validate-pnpm.ts レビュー報告書

## 概要

`src/utils/pnpm-validator/validate-pnpm.ts` はプロジェクト生成時に pnpm の存在とバージョンを検証する関数 `validatePnpm()` を提供します。最低要件 (`v10.x`) を満たさない場合はエラーを表示し、インストールガイドを案内します。

## 検証フロー

1. `execSync("pnpm --version")` でバージョン文字列を取得し、メジャーバージョンを算出。
2. `majorVersion < MIN_PNPM_VERSION` (`MIN_PNPM_VERSION = 10`) の場合は `pnpmVersionTooOld` メッセージとインストールガイドを表示して `false` を返却。
3. 要件を満たす場合は `pnpmVersionValid` メッセージを緑色で表示して `true`。
4. コマンド実行が失敗した場合は `pnpmNotFound` を表示し、インストールガイドを案内して `false`。

## 依存

- `chalk`: 成功 (緑) / 失敗 (赤) メッセージを色付け。
- `getMessages()`: メッセージの国際化。
- `showPnpmInstallGuide()`: 補足ガイド出力。

## 留意点

- `execSync` を使用しているため、コマンドがハングする環境では CLI も停止する可能性がある。必要に応じてタイムアウト設定を検討。
- メジャーバージョンのみを比較しているため、細かなマイナーバージョン差異には対応していない。