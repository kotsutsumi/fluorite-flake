/**
 * タブナビゲーション (Home / Explore) のレイアウトを構築する。
 * - Expo Router の Tabs API を利用して画面を宣言的に定義
 * - テーマに応じたアクティブカラーとハプティクス対応のタブボタンを設定
 */
import { Tabs } from "expo-router";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const resolvedScheme = colorScheme === "dark" ? "dark" : "light";

  return (
    <Tabs
      screenOptions={{
        // タブのアクセントカラーをテーマから取得し、アクティブ状態を強調
        tabBarActiveTintColor: Colors[resolvedScheme].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <IconSymbol color={color} name="house.fill" size={28} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color }) => <IconSymbol color={color} name="paperplane.fill" size={28} />,
        }}
      />
    </Tabs>
  );
}

// EOF
