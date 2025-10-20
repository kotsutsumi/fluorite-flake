/**
 * SF Symbols ベースのアイコン API を提供しつつ、Android / Web では MaterialIcons をフォールバック利用するモジュール。
 * - Expo Symbols (iOS) と Material Icons の名称差を `MAPPING` で吸収
 * - コンシューマーは `name` に SF Symbols の名前を指定するだけでよい
 */

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { SymbolViewProps, SymbolWeight } from "expo-symbols";
import type { ComponentProps } from "react";
import type { OpaqueColorValue, StyleProp, TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * SF Symbols と Material Icons の対応関係をここに追加する。
 * - Material Icons は [Icons Directory](https://icons.expo.fyi) を参照
 * - SF Symbols は [SF Symbols](https://developer.apple.com/sf-symbols/) アプリを参照
 */
const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
} as IconMapping;

/**
 * iOS ではネイティブの SF Symbols を、Android と Web では Material Icons を使うアイコンコンポーネント。
 * プラットフォーム間で統一した見た目を保ちつつ、リソースの使用を最適化する。
 * アイコンの `name` は SF Symbols に基づくため、Material Icons への対応付けが必要になる。
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  // iOS では SF Symbols、その他では Material Icons の描画設定にフォールバックする
  return <MaterialIcons color={color} name={MAPPING[name]} size={size} style={style} />;
}

// EOF
