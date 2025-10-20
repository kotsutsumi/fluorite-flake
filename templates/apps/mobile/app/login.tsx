/**
 * モバイルアプリのログイン画面。
 * - メール / パスワード入力とエラーメッセージ表示
 * - 認証成功後にタブレイアウトへ遷移
 * - サポートリンク (パスワード再発行 / サインアップ) を in-app browser で開く
 */
import { useRouter } from "expo-router";
import { openBrowserAsync } from "expo-web-browser";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { API_BASE_URL } from "@/constants/api";
import { useAuth } from "@/hooks/use-auth";

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("user@example.com");
  const [password, setPassword] = useState("User123!");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (submitting) {
      return;
    }

    // 二重送信防止のためフラグ管理し、エラー表示も一旦リセット
    setSubmitting(true);
    setError(null);

    try {
      await login(email, password);
      router.replace("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "ログインに失敗しました";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const openSignup = async () => {
    // Expo WebBrowser を利用してアプリを離脱せず登録ページを表示
    await openBrowserAsync(`${API_BASE_URL}/signup`);
  };

  const openForgotPassword = async () => {
    // パスワード再設定フローも同様に WebBrowser で開く
    await openBrowserAsync(`${API_BASE_URL}/forgot-password`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>モバイルログイン</Text>
        <Text style={styles.subtitle}>登録済みのメールアドレスとパスワードでログインします。</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>メールアドレス</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="you@example.com"
            style={styles.input}
            value={email}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>パスワード</Text>
          <TextInput
            onChangeText={setPassword}
            placeholder="********"
            secureTextEntry
            style={styles.input}
            value={password}
          />
        </View>
        {error && <Text style={styles.error}>{error}</Text>}
        <Pressable
          onPress={handleLogin}
          style={[styles.button, submitting && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>{submitting ? "ログイン中..." : "ログイン"}</Text>
        </Pressable>
        <Pressable onPress={openForgotPassword} style={styles.linkContainer}>
          <Text style={styles.link}>パスワードをお忘れですか？</Text>
        </Pressable>
        <Pressable onPress={openSignup} style={styles.linkContainer}>
          <Text style={styles.link}>新規登録ページを開く</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#f3f4f6",
  },
  form: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    color: "#374151",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  error: {
    color: "#dc2626",
    fontSize: 14,
  },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  linkContainer: {
    alignItems: "center",
  },
  link: {
    color: "#2563eb",
    fontSize: 14,
  },
});

// EOF
