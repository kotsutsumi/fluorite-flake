/**
 * Expo / React Navigation でタブを押下した際にハプティクスを再生するカスタムボタン。
 * - iOS 環境のみ Expo Haptics を呼び出し、プラットフォーム差分を吸収
 * - 親から受け取った onPressIn を維持しつつ、追加で触覚フィードバックを注入する
 */
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";
import { ImpactFeedbackStyle, impactAsync } from "expo-haptics";

export function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === "ios") {
          // タブを押し込んだタイミングで軽いハプティックフィードバックを鳴らす
          impactAsync(ImpactFeedbackStyle.Light);
        }
        // 親要素が追加の onPressIn ロジックを持っている場合でも確実に呼び出す
        props.onPressIn?.(ev);
      }}
    />
  );
}

// EOF
