/**
 * React Native 標準の `useColorScheme` をラップしたフック。
 * - Expo / Web でも同一の import パス (@/hooks/...) で利用できるようにする
 * - 追加ロジックが必要になった際に集中管理できる拡張ポイントを提供
 */
import { useColorScheme as useNativeColorScheme } from "react-native";

export function useColorScheme() {
  // 直接返すことで呼び出し側は `light` / `dark` / `null` をそのまま扱える
  return useNativeColorScheme();
}

// EOF
