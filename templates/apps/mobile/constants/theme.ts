/**
 * アプリ全体で使用する配色とフォントスタックを集中管理する。
 * - `Colors`: ライト / ダークモード別のテキスト・背景・タブアイコンなどを定義
 * - `Fonts`: プラットフォームごとの推奨フォントセット (iOS / Web / 既定) を切り替え
 * 補足: スタイルユーティリティは [Nativewind](https://www.nativewind.dev/)、[Tamagui](https://tamagui.dev/)、[unistyles](https://reactnativeunistyles.vercel.app) などの導入例もある。
 */

import { Platform } from "react-native";

const tintColorLight = "#0a7ea4";
const tintColorDark = "#fff";

// UI のベースとなるカラーセット。Light/Dark で同じキー構成を保つ。
export const Colors = {
  light: {
    text: "#11181C",
    background: "#fff",
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: "#ECEDEE",
    background: "#151718",
    tint: tintColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
  },
};

// プラットフォームごとの推奨フォントセットを Platform.select で切り替える
export const Fonts = Platform.select({
  ios: {
    /** iOS の `UIFontDescriptorSystemDesignDefault` を指す */
    sans: "system-ui",
    /** iOS の `UIFontDescriptorSystemDesignSerif` を指す */
    serif: "ui-serif",
    /** iOS の `UIFontDescriptorSystemDesignRounded` を指す */
    rounded: "ui-rounded",
    /** iOS の `UIFontDescriptorSystemDesignMonospaced` を指す */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// EOF
