/**
 * テーマに応じたカラー値を返すカスタムフック。
 * - props でライト / ダーク別の上書きが指定された場合はそれを優先
 * - 指定が無い場合は `constants/theme.ts` の定義を参照
 * 参考: https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? "dark" : "light";
  const colorFromProps = props[theme];

  if (colorFromProps) {
    // 呼び出し元で個別カラーが指定されている場合はテーマ設定より優先する
    return colorFromProps;
  }
  // デフォルトのテーマパレットから該当カラーを取得
  return Colors[theme][colorName];
}

// EOF
