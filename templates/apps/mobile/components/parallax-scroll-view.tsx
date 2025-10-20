/**
 * パララックス効果とヘッダーアニメーション付きのスクロールビュー。
 * - react-native-reanimated v3 の `useScrollOffset` を利用してスクロール量を追跡
 * - ヘッダー画像の拡大 / 平行移動を組み合わせて奥行きを表現
 * - テーマカラーに応じて背景色を切り替え、暗色テーマでも視認性を保つ
 */
import type { PropsWithChildren, ReactElement } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useScrollOffset,
} from "react-native-reanimated";

import { ThemedView } from "@/components/themed-view";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";

const HEADER_HEIGHT = 250;
const HEADER_FORWARD_TRANSLATE_RATIO = 0.75;

type Props = PropsWithChildren<{
  headerImage: ReactElement;
  headerBackgroundColor: { dark: string; light: string };
}>;

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
}: Props) {
  // 現在のテーマに合わせた背景色を取得し、全体のトーンを揃える
  const backgroundColor = useThemeColor({}, "background");
  const colorScheme = useColorScheme();
  const resolvedScheme = colorScheme === "dark" ? "dark" : "light";
  // ScrollView の参照を Reanimated 用にラップし、スクロール量を追跡する
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollOffset(scrollRef);
  // スクロール位置に応じたヘッダーの平行移動と拡大率を算出
  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          scrollOffset.value,
          [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
          [-HEADER_HEIGHT / 2, 0, HEADER_HEIGHT * HEADER_FORWARD_TRANSLATE_RATIO]
        ),
      },
      {
        scale: interpolate(scrollOffset.value, [-HEADER_HEIGHT, 0, HEADER_HEIGHT], [2, 1, 1]),
      },
    ],
  }));

  return (
    <Animated.ScrollView
      ref={scrollRef}
      scrollEventThrottle={16}
      style={{ backgroundColor, flex: 1 }}
    >
      <Animated.View
        style={[
          styles.header,
          { backgroundColor: headerBackgroundColor[resolvedScheme] },
          headerAnimatedStyle,
        ]}
      >
        {headerImage}
      </Animated.View>
      {/* コンテンツ領域はテーマカラーの背景を持つ View で包み、余白やギャップを統一 */}
      <ThemedView style={styles.content}>{children}</ThemedView>
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: HEADER_HEIGHT,
    overflow: "hidden",
  },
  content: {
    flex: 1,
    padding: 32,
    gap: 16,
    overflow: "hidden",
  },
});

// EOF
