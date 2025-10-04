/**
 * Flutterアプリのメインファイルとサンプル画面を作成するヘルパー関数
 * アプリのエントリーポイント、画面コンポーネント、サービス、ウィジェットを生成する
 */

import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * Flutterアプリのメインファイルとサンプル画面を作成する
 * @param config プロジェクト設定
 */
export async function createFlutterApp(config: ProjectConfig) {
    // main.dart（アプリエントリーポイント）
    const mainDart = `import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'screens/home_screen.dart';
import 'screens/settings_screen.dart';
import 'services/theme_service.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  MyApp({super.key});

  final GoRouter _router = GoRouter(
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const HomeScreen(),
      ),
      GoRoute(
        path: '/settings',
        builder: (context, state) => const SettingsScreen(),
      ),
    ],
  );

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (context) => ThemeService(),
      child: Consumer<ThemeService>(
        builder: (context, themeService, child) {
          return MaterialApp.router(
            title: '${config.projectName}',
            theme: ThemeData(
              colorScheme: ColorScheme.fromSeed(
                seedColor: Colors.deepPurple,
                brightness: themeService.isDarkMode
                  ? Brightness.dark
                  : Brightness.light,
              ),
              useMaterial3: true,
            ),
            routerConfig: _router,
          );
        },
      ),
    );
  }
}
`;

    await fs.writeFile(path.join(config.projectPath, 'lib/main.dart'), mainDart);

    // ホーム画面
    const homeScreenDart = `import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../services/theme_service.dart';
import '../widgets/feature_card.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _counter = 0;

  void _incrementCounter() {
    setState(() {
      _counter++;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        backgroundColor: theme.colorScheme.inversePrimary,
        title: Text('${config.projectName}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () => context.go('/settings'),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Card(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  children: [
                    Icon(
                      Icons.flutter_dash,
                      size: 64,
                      color: theme.colorScheme.primary,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Welcome to ${config.projectName}!',
                      style: theme.textTheme.headlineSmall,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Built with Flutter',
                      style: theme.textTheme.bodyLarge?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    Text(
                      'You have pushed the button this many times:',
                      style: theme.textTheme.bodyLarge,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '$_counter',
                      style: theme.textTheme.headlineMedium?.copyWith(
                        color: theme.colorScheme.primary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              '✨ Features',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            const FeatureCard(
              icon: Icons.phone_android,
              title: 'Cross-platform',
              description: 'Runs on iOS, Android, Web, and Desktop',
            ),
            const FeatureCard(
              icon: Icons.palette,
              title: 'Material Design 3',
              description: 'Modern UI with dynamic theming',
            ),
            const FeatureCard(
              icon: Icons.navigation,
              title: 'Go Router',
              description: 'Declarative routing with URL support',
            ),
            const FeatureCard(
              icon: Icons.storage,
              title: 'State Management',
              description: 'Provider pattern for reactive state',
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _incrementCounter,
        tooltip: 'Increment',
        child: const Icon(Icons.add),
      ),
    );
  }
}
`;

    await fs.writeFile(
        path.join(config.projectPath, 'lib/screens/home_screen.dart'),
        homeScreenDart
    );

    // 設定画面
    const settingsScreenDart = `import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../services/theme_service.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/'),
        ),
      ),
      body: ListView(
        children: [
          Consumer<ThemeService>(
            builder: (context, themeService, child) {
              return SwitchListTile(
                title: const Text('Dark Mode'),
                subtitle: const Text('Toggle between light and dark themes'),
                value: themeService.isDarkMode,
                onChanged: (value) {
                  themeService.toggleTheme();
                },
                secondary: Icon(
                  themeService.isDarkMode
                    ? Icons.dark_mode
                    : Icons.light_mode,
                ),
              );
            },
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.info),
            title: const Text('About'),
            subtitle: const Text('Learn more about this app'),
            trailing: const Icon(Icons.arrow_forward_ios),
            onTap: () {
              showAboutDialog(
                context: context,
                applicationName: '${config.projectName}',
                applicationVersion: '1.0.0',
                applicationIcon: const Icon(Icons.flutter_dash),
                children: [
                  const Text('Built with Flutter'),
                  const SizedBox(height: 8),
                  const Text('Generated by fluorite-flake'),
                ],
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.code),
            title: const Text('Development Commands'),
            subtitle: const Text('View available Flutter commands'),
            trailing: const Icon(Icons.arrow_forward_ios),
            onTap: () {
              showDialog(
                context: context,
                builder: (context) => AlertDialog(
                  title: const Text('Development Commands'),
                  content: const SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('flutter run'),
                        Text('• Start development server'),
                        SizedBox(height: 8),
                        Text('flutter run -d chrome'),
                        Text('• Run in web browser'),
                        SizedBox(height: 8),
                        Text('flutter build apk'),
                        Text('• Build Android APK'),
                        SizedBox(height: 8),
                        Text('flutter build ios'),
                        Text('• Build iOS app'),
                        SizedBox(height: 8),
                        Text('flutter test'),
                        Text('• Run tests'),
                      ],
                    ),
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: const Text('Close'),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
`;

    await fs.writeFile(
        path.join(config.projectPath, 'lib/screens/settings_screen.dart'),
        settingsScreenDart
    );

    // テーマサービス
    const themeServiceDart = `import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ThemeService extends ChangeNotifier {
  static const String _themeKey = 'isDarkMode';
  bool _isDarkMode = false;

  bool get isDarkMode => _isDarkMode;

  ThemeService() {
    _loadTheme();
  }

  Future<void> _loadTheme() async {
    final prefs = await SharedPreferences.getInstance();
    _isDarkMode = prefs.getBool(_themeKey) ?? false;
    notifyListeners();
  }

  Future<void> toggleTheme() async {
    _isDarkMode = !_isDarkMode;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_themeKey, _isDarkMode);
    notifyListeners();
  }

  Future<void> setTheme(bool isDark) async {
    _isDarkMode = isDark;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_themeKey, _isDarkMode);
    notifyListeners();
  }
}
`;

    await fs.writeFile(
        path.join(config.projectPath, 'lib/services/theme_service.dart'),
        themeServiceDart
    );

    // 機能カードウィジェット
    const featureCardDart = `import 'package:flutter/material.dart';

class FeatureCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;

  const FeatureCard({
    super.key,
    required this.icon,
    required this.title,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 8.0),
      child: ListTile(
        leading: Icon(
          icon,
          color: theme.colorScheme.primary,
        ),
        title: Text(
          title,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        subtitle: Text(description),
      ),
    );
  }
}
`;

    await fs.writeFile(
        path.join(config.projectPath, 'lib/widgets/feature_card.dart'),
        featureCardDart
    );

    // ナビゲーションサービスの作成
    const navigationServiceDart = `import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class NavigationService {
  static final NavigationService _instance = NavigationService._internal();
  factory NavigationService() => _instance;
  NavigationService._internal();

  void navigateTo(BuildContext context, String route, {Object? extra}) {
    context.go(route, extra: extra);
  }

  void navigateBack(BuildContext context) {
    if (context.canPop()) {
      context.pop();
    } else {
      context.go('/');
    }
  }

  void replaceWith(BuildContext context, String route, {Object? extra}) {
    context.pushReplacement(route, extra: extra);
  }
}
`;

    await fs.writeFile(
        path.join(config.projectPath, 'lib/services/navigation_service.dart'),
        navigationServiceDart
    );

    // アプリ状態モデルの作成
    const appStateDart = `import 'package:flutter/foundation.dart';

class AppState extends ChangeNotifier {
  bool _isLoading = false;
  String? _error;
  Map<String, dynamic> _data = {};

  bool get isLoading => _isLoading;
  String? get error => _error;
  Map<String, dynamic> get data => _data;

  void setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void setError(String? error) {
    _error = error;
    notifyListeners();
  }

  void setData(String key, dynamic value) {
    _data[key] = value;
    notifyListeners();
  }

  dynamic getData(String key) => _data[key];

  void clearError() {
    _error = null;
    notifyListeners();
  }

  void reset() {
    _isLoading = false;
    _error = null;
    _data = {};
    notifyListeners();
  }
}
`;

    await fs.writeFile(path.join(config.projectPath, 'lib/models/app_state.dart'), appStateDart);

    // 定数ファイルの作成
    const constantsDart = `import 'package:flutter/material.dart';

class AppConstants {
  // アプリ情報
  static const String appName = '${config.projectName}';
  static const String appVersion = '1.0.0';

  // カラー
  static const Color primaryColor = Colors.deepPurple;
  static const Color accentColor = Colors.deepPurpleAccent;
  static const Color backgroundColor = Colors.white;
  static const Color darkBackgroundColor = Color(0xFF121212);

  // 間隔
  static const double defaultPadding = 16.0;
  static const double smallPadding = 8.0;
  static const double largePadding = 24.0;

  // ボーダー半径
  static const double defaultRadius = 8.0;
  static const double smallRadius = 4.0;
  static const double largeRadius = 16.0;

  // アニメーション時間
  static const Duration shortAnimation = Duration(milliseconds: 200);
  static const Duration mediumAnimation = Duration(milliseconds: 400);
  static const Duration longAnimation = Duration(milliseconds: 600);

  // API設定（必要に応じて）
  static const String apiBaseUrl = 'https://api.example.com';
  static const Duration apiTimeout = Duration(seconds: 30);
}
`;

    await fs.writeFile(path.join(config.projectPath, 'lib/utils/constants.dart'), constantsDart);

    // テストファイル
    const testFile = `import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:${config.projectName.toLowerCase().replace(/-/g, '_')}/main.dart';

void main() {
  testWidgets('Counter increments smoke test', (WidgetTester tester) async {
    // アプリをビルドしてフレームをトリガー
    await tester.pumpWidget(MyApp());

    // カウンターが0から始まることを確認
    expect(find.text('0'), findsOneWidget);
    expect(find.text('1'), findsNothing);

    // '+'アイコンをタップしてフレームをトリガー
    await tester.tap(find.byIcon(Icons.add));
    await tester.pump();

    // カウンターが増加したことを確認
    expect(find.text('0'), findsNothing);
    expect(find.text('1'), findsOneWidget);
  });

  testWidgets('Navigation to settings works', (WidgetTester tester) async {
    await tester.pumpWidget(MyApp());

    // 設定ボタンを見つけてタップ
    await tester.tap(find.byIcon(Icons.settings));
    await tester.pumpAndSettle();

    // 設定画面に遷移したことを確認
    expect(find.text('Settings'), findsOneWidget);
    expect(find.text('Dark Mode'), findsOneWidget);
  });
}
`;

    await fs.writeFile(path.join(config.projectPath, 'test/widget_test.dart'), testFile);

    // imagesディレクトリに.gitkeepを作成
    await fs.writeFile(path.join(config.projectPath, 'assets/images/.gitkeep'), '');

    // アセットREADME
    const assetsReadme = `# Assets

## Images
Place your images in this directory and reference them in pubspec.yaml under the assets section.

## Fonts
Add custom fonts here and configure them in pubspec.yaml under the fonts section.

## Example Usage
\`\`\`dart
// 画像の場合
Image.asset('assets/images/logo.png')

// カスタムフォントの場合（最初にpubspec.yamlで設定してください）
Text(
  'Hello',
  style: TextStyle(fontFamily: 'CustomFont'),
)
\`\`\`
`;

    await fs.writeFile(path.join(config.projectPath, 'assets/README.md'), assetsReadme);
}
