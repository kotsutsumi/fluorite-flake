/**
 * iOS ビルドで SF Symbols を描画する `IconSymbol` の実装。
 * - Expo Symbols の `SymbolView` を利用し、サイズ・色・太さを柔軟に指定
 * - 他プラットフォーム向けの Material Icons 実装と同じ API を提供する
 */
import { SymbolView, type SymbolViewProps, type SymbolWeight } from "expo-symbols";
import type { StyleProp, ViewStyle } from "react-native";

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = "regular",
}: {
  name: SymbolViewProps["name"];
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  return (
    <SymbolView
      name={name}
      resizeMode="scaleAspectFit"
      style={[
        {
          width: size,
          height: size,
        },
        style,
      ]}
      tintColor={color}
      weight={weight}
    />
  );
}

// EOF
