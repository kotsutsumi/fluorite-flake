/**
 * ライト / ダークモードに応じて背景色を切り替える汎用 View コンポーネント。
 * - 呼び出し側で `lightColor` / `darkColor` を渡すと個別の色分けが可能
 * - 指定が無い場合はテーマ定義 (`Colors.background`) を自動適用
 */
import { View, type ViewProps } from "react-native";

import { useThemeColor } from "@/hooks/use-theme-color";

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  // テーマフックを介して最適な背景色を取得する
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, "background");

  // 任意のスタイル配列をマージしつつ背景色を先頭に設定
  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}

// EOF
