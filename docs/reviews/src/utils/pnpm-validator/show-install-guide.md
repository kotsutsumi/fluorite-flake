# pnpm-validator/show-install-guide.ts レビュー報告書

## 概要

`src/utils/pnpm-validator/show-install-guide.ts` は pnpm が未検出の際にインストール手順をコンソールへ表示する補助関数 `showPnpmInstallGuide()` を提供します。国際化メッセージと `chalk` による装飾で視認性を高めています。

## 表示内容

1. `create.pnpmInstallGuide` を黄色で出力し、ガイドの開始を明示。
2. `create.pnpmInstallCommands` 配列をシアンで列挙。
3. 追加情報リンク (`create.pnpmMoreInfo`) をグレーで提示。

## 留意点

- メッセージは i18n JSON に依存するため、新しいロケールを追加する際はコマンド配列を忘れずに翻訳する必要があります。
- ガイドは `console.log` を連続で呼び出す方式のため、将来的にテキスト整形を変更する場合はテストで出力差分を確認してください。