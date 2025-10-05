# vercel-cli/types.ts レビュー報告書

## 概要

`src/utils/vercel-cli/types.ts` は Vercel CLI ラッパーで使用する各種オプション・結果型を定義します。コマンドカテゴリごとに専用の型エイリアスを用意し、API 利用時の補完性と型安全性を確保しています。

## 主な型

- `VercelCommandOptions` / `VercelCommandResult`: すべてのコマンドで共有する基本形。
- `VercelDeployOptions`, `VercelEnvOptions`, `VercelDomainOptions`, `VercelBlobOptions`, `VercelLogsOptions`, `VercelProjectOptions`, `VercelListOptions`, `VercelPromoteOptions`, `VercelRemoveOptions`, `VercelRollbackOptions`, `VercelLinkOptions`, `VercelDevOptions`, `VercelBuildOptions`: それぞれ目的別の拡張オプション。

## 特徴

- すべてのオプション型は `VercelCommandOptions` を継承し、共通引数 (`cwd`, `token`, `args` など) を共有。
- コメントは日本語で詳細に記載され、各プロパティの用途が明確。
- `archive` のように取り得る値が限定されるプロパティはリテラルユニオンで表現。

## 留意点

- Vercel CLI の仕様変更に追従する際は、該当オプション型とコメントの更新を忘れずに行ってください。
- 型情報だけを提供しているため、ランタイムバリデーションを行う場合は別途スキーマやチェックを実装する必要があります。