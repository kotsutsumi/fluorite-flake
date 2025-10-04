import path from 'node:path';
import fs from 'fs-extra';

import type { ProjectConfig } from '../../../commands/create/types.js';
import { createPlaceholderAssets } from './createPlaceholderAssets.js';

/**
 * Expoアプリの初期構造とサンプルページを作成する
 * Expo Routerを使用したナビゲーション構造とホーム・探索画面の基本実装
 * @param config プロジェクト設定
 */
export async function createInitialExpoApp(config: ProjectConfig) {
    // ルートレイアウト
    const rootLayoutContent = `import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { SplashScreen } from 'expo-splash-screen';
import { useEffect } from 'react';
import { Provider as JotaiProvider } from 'jotai';

// アセット読み込み完了前にスプラッシュスクリーンが自動で非表示になることを防ぐ
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    // カスタムフォントをここに追加
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <JotaiProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </JotaiProvider>
  );
}
`;

    await fs.writeFile(path.join(config.projectPath, 'app/_layout.tsx'), rootLayoutContent);

    // タブレイアウトの作成
    await fs.ensureDir(path.join(config.projectPath, 'app/(tabs)'));

    const tabsLayoutContent = `import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        headerStyle: {
          backgroundColor: '#f8f9fa',
        },
        headerShadowVisible: false,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'code-slash' : 'code-slash-outline'} color={color} size={24} />
          ),
        }}
      />
    </Tabs>
  );
}
`;

    await fs.writeFile(path.join(config.projectPath, 'app/(tabs)/_layout.tsx'), tabsLayoutContent);

    // ホーム画面
    const homeScreenContent = `import { StyleSheet, Text, View } from 'react-native';
import { useAtom } from 'jotai';
import { atom } from 'jotai';

const countAtom = atom(0);

export default function HomeScreen() {
  const [count, setCount] = useAtom(countAtom);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to {${JSON.stringify(config.projectName)}}!</Text>
      <Text style={styles.subtitle}>
        Built with Expo Router and Jotai
      </Text>

      <View style={styles.counterContainer}>
        <Text style={styles.counterText}>Count: {count}</Text>
        <Text
          style={styles.button}
          onPress={() => setCount(count + 1)}
        >
          Tap to increment
        </Text>
      </View>

      <View style={styles.featuresContainer}>
        <Text style={styles.featuresTitle}>✨ Features</Text>
        <Text style={styles.feature}>📱 Expo Router for navigation</Text>
        <Text style={styles.feature}>⚡ Jotai for state management</Text>
        <Text style={styles.feature}>🎨 TypeScript support</Text>
        <Text style={styles.feature}>🔄 Hot reload enabled</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  counterContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  counterText: {
    fontSize: 18,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    color: 'white',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    overflow: 'hidden',
  },
  featuresContainer: {
    alignItems: 'center',
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  feature: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
});
`;

    await fs.writeFile(path.join(config.projectPath, 'app/(tabs)/index.tsx'), homeScreenContent);

    // 探索画面
    const exploreScreenContent = `import { StyleSheet, Text, View, ScrollView } from 'react-native';

export default function ExploreScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Explore Expo</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚀 Getting Started</Text>
          <Text style={styles.text}>
            This Expo app is set up with Expo Router for navigation and includes:
          </Text>
          <Text style={styles.bulletPoint}>• File-based routing</Text>
          <Text style={styles.bulletPoint}>• TypeScript configuration</Text>
          <Text style={styles.bulletPoint}>• State management with Jotai</Text>
          <Text style={styles.bulletPoint}>• Tab navigation</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 Development</Text>
          <Text style={styles.text}>
            Run development commands:
          </Text>
          <Text style={styles.bulletPoint}>• ${config.packageManager} start - Start the development server</Text>
          <Text style={styles.bulletPoint}>• ${config.packageManager} run ios - Open iOS simulator</Text>
          <Text style={styles.bulletPoint}>• ${config.packageManager} run android - Open Android emulator</Text>
          <Text style={styles.bulletPoint}>• ${config.packageManager} run web - Open in web browser</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔧 Next Steps</Text>
          <Text style={styles.text}>
            Consider adding these features:
          </Text>
          <Text style={styles.bulletPoint}>• Native device features (camera, location)</Text>
          <Text style={styles.bulletPoint}>• Push notifications</Text>
          <Text style={styles.bulletPoint}>• Offline storage</Text>
          <Text style={styles.bulletPoint}>• Custom native modules</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    marginLeft: 16,
    marginBottom: 4,
  },
});
`;

    await fs.writeFile(
        path.join(config.projectPath, 'app/(tabs)/explore.tsx'),
        exploreScreenContent
    );

    // 404画面
    const notFoundContent = `import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen doesn't exist.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    color: '#2e78b7',
  },
});
`;

    await fs.writeFile(path.join(config.projectPath, 'app/+not-found.tsx'), notFoundContent);

    // プレースホルダーアセットの作成
    await createPlaceholderAssets(config);
}
