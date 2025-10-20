/**
 * 認証済みユーザー向けのホームタブ画面。
 * - コンテキストから取得したユーザー情報をカード形式で表示
 * - セッション情報を最新化する「更新」ボタンとログアウトボタンを配置
 */
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/hooks/use-auth";

export default function HomeScreen() {
  const { user, logout, refresh } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>ようこそ</Text>
        <Text style={styles.subtitle}>{user?.name || user?.email}</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>メール</Text>
          <Text style={styles.value}>{user?.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>ロール</Text>
          <Text style={styles.value}>{user?.role}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>承認状態</Text>
          <Text style={styles.value}>{user?.approvalStatus}</Text>
        </View>
        <View style={styles.buttonGroup}>
          <Pressable onPress={refresh} style={[styles.button, styles.secondaryButton]}>
            <Text style={styles.secondaryText}>最新情報を取得</Text>
          </Pressable>
          <Pressable onPress={logout} style={[styles.button, styles.logoutButton]}>
            {/* ログアウトボタンは認証状態を解除し、AuthContext の状態をリセットする */}
            <Text style={styles.logoutText}>ログアウト</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f9fafb",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    color: "#6b7280",
    fontSize: 14,
  },
  value: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
  },
  buttonGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButton: {
    backgroundColor: "#e0f2fe",
  },
  secondaryText: {
    color: "#0369a1",
    fontSize: 14,
    fontWeight: "600",
  },
  logoutButton: {
    backgroundColor: "#fee2e2",
  },
  logoutText: {
    color: "#b91c1c",
    fontSize: 14,
    fontWeight: "600",
  },
});

// EOF
