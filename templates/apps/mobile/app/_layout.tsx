/**
 * Expo Router のルートレイアウトを定義し、認証状態に応じたナビゲーションスタックを構築する。
 * - `AuthProvider` でモバイルアプリ全体の認証状態を共有
 * - ダーク / ライトテーマを React Navigation に連携
 * - ローディング中はスピナーを表示し、セッション復元完了後に Stack を描画する
 */
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import "react-native-reanimated";

import { AuthProvider } from "@/contexts/auth-context";
import { useAuth } from "@/hooks/use-auth";
import { useColorScheme } from "@/hooks/use-color-scheme";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      {/* テーマを React Navigation へ受け渡し、システムテーマに追従させる */}
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <AuthStack />
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}

// 認証状態に合わせて表示スタックを切り替える
function AuthStack() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        {/* セッション復元中は空白画面にならないようインジケーターを表示 */}
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack>
      {user ? (
        <>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
        </>
      ) : (
        // 未ログイン時はログイン画面のみをスタックに登録する
        <Stack.Screen name="login" options={{ headerShown: false }} />
      )}
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

// EOF
