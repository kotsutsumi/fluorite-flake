/**
 * Expo Router のモーダルスタックで表示される簡易サンプル画面。
 * - モーダル表示の際のテーマ適用や閉じるフローを確認するための UI
 * - `dismissTo` を利用してホーム画面へ戻る導線を提供
 */
import { Link } from "expo-router";
import { StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

export default function ModalScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">This is a modal</ThemedText>
      <Link dismissTo href="/" style={styles.link}>
        {/* dismissTo を指定することでモーダルを閉じた際の戻り先を制御できる */}
        <ThemedText type="link">Go to home screen</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});

// EOF
