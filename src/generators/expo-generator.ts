import path from 'node:path';
import fs from 'fs-extra';

import type { ProjectConfig } from '../commands/create/types.js';

/**
 * Expoプロジェクトを生成するメイン関数
 * React Native アプリケーションの基本構造、設定、テストセットアップを行う
 * @param config プロジェクト設定
 */
export async function generateExpoProject(config: ProjectConfig) {
    // プロジェクトディレクトリの作成
    await fs.ensureDir(config.projectPath);

    // Expoアプリ構造の作成
    await createExpoAppStructure(config);

    // Expo用package.jsonのセットアップ
    await generateExpoPackageJson(config);

    // TypeScript設定
    await setupExpoTypeScript(config);

    // Expo設定ファイルの作成
    await setupExpoConfig(config);

    // Metroバンドラーの設定
    await setupMetro(config);

    // Babel設定
    await setupBabel(config);

    // 初期アプリ構造の作成
    await createInitialExpoApp(config);

    // .gitignoreファイルのセットアップ
    await createExpoGitignore(config);

    // Maestro E2Eテストのセットアップ
    await setupMaestroTesting(config);
}

/**
 * Expoアプリケーションの基本ディレクトリ構造を作成する
 * @param config プロジェクト設定
 */
async function createExpoAppStructure(config: ProjectConfig) {
    // 作成するディレクトリリスト（Expo Router構造）
    const dirs = [
        'app', // Expo Routerのページとレイアウト
        'components', // 再利用可能なコンポーネント
        'components/ui', // UIライブラリコンポーネント
        'constants', // 定数定義ファイル
        'hooks', // カスタムReactフック
        'assets', // 静的アセット
        'assets/images', // 画像ファイル
        'assets/fonts', // フォントファイル
    ];

    // 各ディレクトリを作成
    for (const dir of dirs) {
        await fs.ensureDir(path.join(config.projectPath, dir));
    }
}

/**
 * Expo用のpackage.jsonファイルを生成する（依存関係とスクリプトを含む）
 * @param config プロジェクト設定
 */
async function generateExpoPackageJson(config: ProjectConfig) {
    const packageJson: {
        name: string;
        version: string;
        main: string;
        scripts: Record<string, string>;
        dependencies: Record<string, string>;
        devDependencies: Record<string, string>;
    } = {
        name: config.projectName,
        version: '1.0.0',
        main: 'expo-router/entry',
        scripts: {
            start: 'expo start',
            android: 'expo start --android',
            ios: 'expo start --ios',
            web: 'expo start --web',
            test: 'jest --watchAll',
            'build:android': 'eas build --platform android',
            'build:ios': 'eas build --platform ios',
            'build:all': 'eas build --platform all',
        },
        dependencies: {
            expo: '~52.0.0',
            react: '18.3.1',
            'react-native': '0.76.5',
            'expo-router': '~4.0.0',
            'expo-constants': '~17.0.0',
            'expo-linking': '~7.0.0',
            'expo-status-bar': '~2.0.0',
            'expo-splash-screen': '~0.29.0',
            'expo-system-ui': '~4.0.0',
            'react-native-safe-area-context': '4.12.0',
            'react-native-screens': '~4.1.0',
            '@react-navigation/native': '^7.0.0',
            'react-native-gesture-handler': '~2.20.0',
            'react-native-reanimated': '~3.16.0',
            jotai: '^2.10.3',
        },
        devDependencies: {
            '@babel/core': '^7.25.0',
            '@types/react': '~18.3.0',
            '@types/jest': '^29.5.0',
            jest: '^29.4.0',
            'jest-expo': '~52.0.0',
            typescript: '~5.3.0',
        },
    };

    // Expo用データベース依存関係の追加
    if (config.database === 'turso' && config.orm === 'drizzle') {
        packageJson.dependencies['drizzle-orm'] = '^0.38.3';
        packageJson.dependencies['@libsql/client'] = '^0.15.0';
        packageJson.devDependencies['drizzle-kit'] = '^0.30.2';
    } else if (config.database === 'supabase') {
        packageJson.dependencies['@supabase/supabase-js'] = '^2.48.1';
    }

    // ストレージ依存関係の追加
    if (config.storage !== 'none') {
        switch (config.storage) {
            case 'supabase-storage':
                packageJson.dependencies['@supabase/supabase-js'] = '^2.48.1';
                break;
            case 'aws-s3':
                packageJson.dependencies['@aws-sdk/client-s3'] = '^3.705.0';
                break;
            default:
                break;
        }
    }

    // 認証依存関係の追加
    if (config.auth) {
        packageJson.dependencies['expo-auth-session'] = '~6.0.0';
        packageJson.dependencies['expo-crypto'] = '~14.0.0';
        packageJson.dependencies['expo-web-browser'] = '~14.0.0';
    }

    await fs.writeJSON(path.join(config.projectPath, 'package.json'), packageJson, {
        spaces: 2,
    });
}

/**
 * Expo用TypeScript設定ファイル（tsconfig.json）を設定する
 * @param config プロジェクト設定
 */
async function setupExpoTypeScript(config: ProjectConfig) {
    const tsConfig = {
        extends: 'expo/tsconfig.base',
        compilerOptions: {
            strict: true,
            paths: {
                '@/*': ['./'],
            },
        },
        include: ['**/*.ts', '**/*.tsx', '.expo/types/**/*.ts', 'expo-env.d.ts'],
        exclude: ['node_modules'],
    };

    await fs.writeJSON(path.join(config.projectPath, 'tsconfig.json'), tsConfig, {
        spaces: 2,
    });

    // Expo環境型定義ファイルの作成
    const expoEnvContent = `/// <reference types="expo/types" />
`;

    await fs.writeFile(path.join(config.projectPath, 'expo-env.d.ts'), expoEnvContent);
}

/**
 * Expo設定ファイル（app.json）を作成する
 * @param config プロジェクト設定
 */
async function setupExpoConfig(config: ProjectConfig) {
    const appConfig = {
        expo: {
            name: config.projectName,
            slug: config.projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            version: '1.0.0',
            orientation: 'portrait',
            icon: './assets/images/icon.png',
            scheme: config.projectName.toLowerCase(),
            userInterfaceStyle: 'automatic',
            newArchEnabled: true,
            splash: {
                image: './assets/images/splash-icon.png',
                resizeMode: 'contain',
                backgroundColor: '#ffffff',
            },
            ios: {
                supportsTablet: true,
                bundleIdentifier: `com.${config.projectName.toLowerCase()}.app`,
            },
            android: {
                adaptiveIcon: {
                    foregroundImage: './assets/images/adaptive-icon.png',
                    backgroundColor: '#ffffff',
                },
                package: `com.${config.projectName.toLowerCase()}.app`,
            },
            web: {
                bundler: 'metro',
                output: 'static',
                favicon: './assets/images/favicon.png',
            },
            plugins: [
                'expo-router',
                [
                    'expo-splash-screen',
                    {
                        imageHeight: 200,
                        resizeMode: 'contain',
                        backgroundColor: '#ffffff',
                    },
                ],
            ],
            experiments: {
                typedRoutes: true,
            },
        },
    };

    await fs.writeJSON(path.join(config.projectPath, 'app.json'), appConfig, {
        spaces: 2,
    });
}

/**
 * Metro バンドラーの設定ファイルを作成する
 * @param config プロジェクト設定
 */
async function setupMetro(config: ProjectConfig) {
    const metroConfig = `const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = config;
`;

    await fs.writeFile(path.join(config.projectPath, 'metro.config.js'), metroConfig);
}

/**
 * Babel設定ファイルを作成する（Expo用トランスパイル設定）
 * @param config プロジェクト設定
 */
async function setupBabel(config: ProjectConfig) {
    const babelConfig = {
        presets: ['babel-preset-expo'],
        plugins: ['react-native-reanimated/plugin'],
    };

    await fs.writeJSON(path.join(config.projectPath, 'babel.config.js'), babelConfig, {
        spaces: 2,
    });
}

/**
 * Expoアプリの初期構造とサンプルページを作成する
 * @param config プロジェクト設定
 */
async function createInitialExpoApp(config: ProjectConfig) {
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

/**
 * プレースホルダーアセットとその説明用READMEファイルを作成する
 * @param config プロジェクト設定
 */
async function createPlaceholderAssets(config: ProjectConfig) {
    // 必要なアセットの説明用READMEファイルを作成
    const assetsReadme = `# Assets

Please add the following asset files:

## Images
- icon.png (1024x1024) - App icon
- splash-icon.png (400x400) - Splash screen icon
- adaptive-icon.png (1024x1024) - Android adaptive icon
- favicon.png (32x32) - Web favicon

## Fonts
Add custom fonts in this directory and reference them in app/_layout.tsx

## Current Status
Placeholder assets have been created. Replace with your actual design assets.
`;

    await fs.writeFile(path.join(config.projectPath, 'assets/README.md'), assetsReadme);
}

/**
 * Expo用.gitignoreファイルを作成する
 * @param config プロジェクト設定
 */
async function createExpoGitignore(config: ProjectConfig) {
    const gitignoreContent = `# Learn more https://docs.github.io/en/get-started/getting-started-with-git/ignoring-files

# dependencies
node_modules/

# Expo
.expo/
dist/
web-build/

# Native
*.orig.*
*.jks
*.p8
*.p12
*.key
*.mobileprovision

# Metro
.metro-health-check*

# debug
npm-debug.*
yarn-debug.*
yarn-error.*

# macOS
.DS_Store
*.pem

# local env files
.env*.local

# typescript
*.tsbuildinfo
`;

    await fs.writeFile(path.join(config.projectPath, '.gitignore'), gitignoreContent);
}

/**
 * Maestro E2Eテストフレームワークのセットアップを行う
 * @param config プロジェクト設定
 */
async function setupMaestroTesting(config: ProjectConfig) {
    // テストフロー用.maestroディレクトリの作成
    const maestroDir = path.join(config.projectPath, '.maestro');
    await fs.ensureDir(maestroDir);

    // Maestro用READMEの作成
    const maestroReadme = `# Maestro E2E Testing

Maestro is a lightweight E2E testing framework for mobile apps that works great with Expo.

## Installation

Install Maestro CLI:
\`\`\`bash
# macOS/Linux
curl -Ls "https://get.maestro.mobile.dev" | bash

# Or with Homebrew
brew install maestrotest/tap/maestro
\`\`\`

## Running Tests

### Local Testing

1. Start your Expo development server:
\`\`\`bash
pnpm start
\`\`\`

2. Run Maestro tests:
\`\`\`bash
# Run all tests
maestro test .maestro/

# Run specific test
maestro test .maestro/smoke-test.yaml

# Record test execution
maestro record .maestro/smoke-test.yaml
\`\`\`

### Test on Simulators

#### iOS Simulator
\`\`\`bash
# Start iOS simulator
open -a Simulator

# Run your app
pnpm ios

# Run Maestro tests
maestro test .maestro/smoke-test.yaml
\`\`\`

#### Android Emulator
\`\`\`bash
# Start Android emulator
emulator -avd <your_avd_name>

# Run your app
pnpm android

# Run Maestro tests
maestro test .maestro/smoke-test.yaml
\`\`\`

## Writing Tests

Tests are written in YAML format. See the example tests in this directory.

Key concepts:
- Use \`testID\` props on your React Native components
- Maestro automatically waits for elements to appear
- Tests are declarative and easy to read

## Resources

- [Maestro Documentation](https://maestro.mobile.dev/documentation)
- [Expo Testing Guide](https://docs.expo.dev/develop/testing/introduction/)
`;

    await fs.writeFile(path.join(maestroDir, 'README.md'), maestroReadme);

    // 基本的なスモークテストの作成
    const smokeTest = `# Basic smoke test for ${config.projectName}
appId: com.${config.projectName.toLowerCase().replace(/-/g, '')}

---

# Launch the app
- launchApp

# Wait for the home screen to load
- waitForAnimationToEnd

# Verify home tab is visible
- assertVisible:
    text: "Home"

# Verify welcome message
- assertVisible:
    text: "Welcome to ${config.projectName}!"

# Test counter interaction
- assertVisible:
    text: "Count: 0"

- tapOn:
    text: "Tap to increment"

- assertVisible:
    text: "Count: 1"

# Navigate to Explore tab
- tapOn:
    text: "Explore"

# Wait for explore screen
- waitForAnimationToEnd

# Verify explore screen content
- assertVisible:
    text: "Explore"

- assertVisible:
    text: "This is the explore screen"

# Navigate back to Home
- tapOn:
    text: "Home"

- waitForAnimationToEnd

# Verify we're back on home screen
- assertVisible:
    text: "Welcome to ${config.projectName}!"
`;

    await fs.writeFile(path.join(maestroDir, 'smoke-test.yaml'), smokeTest);

    // ナビゲーションテストの作成
    const navigationTest = `# Navigation test for ${config.projectName}
appId: com.${config.projectName.toLowerCase().replace(/-/g, '')}

---

# Test tab navigation
- launchApp
- waitForAnimationToEnd

# Test all tabs
- tapOn:
    text: "Home"
- assertVisible:
    text: "Welcome to ${config.projectName}!"

- tapOn:
    text: "Explore"
- assertVisible:
    text: "Explore different features"

# Test scrolling if content is scrollable
- scrollUntilVisible:
    element:
      text: "Bottom of content"
    direction: DOWN
    timeout: 10000
    speed: SLOW
`;

    await fs.writeFile(path.join(maestroDir, 'navigation-test.yaml'), navigationTest);

    // 認証が有効な場合の認証テストテンプレートの作成
    if (config.auth) {
        const authTest = `# Authentication flow test
appId: com.${config.projectName.toLowerCase().replace(/-/g, '')}

---

# Launch app
- launchApp
- waitForAnimationToEnd

# Look for auth button
- assertVisible:
    text: "Sign In"

# Tap on sign in
- tapOn:
    text: "Sign In"

- waitForAnimationToEnd

# Fill in credentials (adjust based on your auth implementation)
- tapOn:
    id: "email-input"

- inputText: "test@example.com"

- tapOn:
    id: "password-input"

- inputText: "testpassword123"

# Submit form
- tapOn:
    text: "Submit"
    # or id: "submit-button"

# Wait for auth to complete
- waitForAnimationToEnd

# Verify logged in state
- assertVisible:
    text: "Welcome"
    # Adjust based on your post-login UI
`;

        await fs.writeFile(path.join(maestroDir, 'auth-test.yaml'), authTest);
    }

    // CIワークフローテンプレートの作成
    const ciWorkflow = `# CI Test Suite
appId: com.${config.projectName.toLowerCase().replace(/-/g, '')}

---

# Run all critical user flows for CI
- runFlow: smoke-test.yaml
- runFlow: navigation-test.yaml${config.auth ? '\n- runFlow: auth-test.yaml' : ''}

# Additional CI-specific checks
- launchApp
- waitForAnimationToEnd

# Check for console errors (if exposed via testID)
- assertNotVisible:
    id: "error-boundary"

- assertNotVisible:
    text: "Error"

- assertNotVisible:
    text: "Something went wrong"
`;

    await fs.writeFile(path.join(maestroDir, 'ci-test-suite.yaml'), ciWorkflow);

    // package.jsonにMaestroテストスクリプトを追加
    const packageJsonPath = path.join(config.projectPath, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJSON(packageJsonPath);

        // Maestroテストスクリプトの追加
        packageJson.scripts = {
            ...packageJson.scripts,
            'test:e2e': 'maestro test .maestro/',
            'test:e2e:smoke': 'maestro test .maestro/smoke-test.yaml',
            'test:e2e:record': 'maestro record .maestro/smoke-test.yaml',
            'test:e2e:ci': 'maestro test .maestro/ci-test-suite.yaml',
        };

        await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
    }

    // テストを向上させるためメインコンポーネントにtestIDプロパティを追加
    // ホーム画面にtestIDを含むよう更新
    const homeScreenPath = path.join(config.projectPath, 'app/(tabs)/index.tsx');
    if (await fs.pathExists(homeScreenPath)) {
        const homeContent = await fs.readFile(homeScreenPath, 'utf-8');

        // Maestroでのテストを容易にするためtestIDプロパティを追加
        const updatedHomeContent = homeContent
            .replace(
                'style={styles.button}',
                'style={styles.button}\n          testID="increment-button"'
            )
            .replace(
                'style={styles.counterText}',
                'style={styles.counterText}\n        testID="counter-text"'
            );

        await fs.writeFile(homeScreenPath, updatedHomeContent);
    }

    // Maestro Studio用設定ファイルの作成
    const maestroConfig = `# Maestro Configuration
app:
  id: com.${config.projectName.toLowerCase().replace(/-/g, '')}
  name: ${config.projectName}

# Test configuration
testOptions:
  continueOnFailure: false
  reportPath: ./maestro-report

# Environment-specific settings
environments:
  local:
    appId: com.${config.projectName.toLowerCase().replace(/-/g, '')}
  staging:
    appId: com.${config.projectName.toLowerCase().replace(/-/g, '')}.staging
  production:
    appId: com.${config.projectName.toLowerCase().replace(/-/g, '')}.prod
`;

    await fs.writeFile(path.join(maestroDir, 'config.yaml'), maestroConfig);
}
