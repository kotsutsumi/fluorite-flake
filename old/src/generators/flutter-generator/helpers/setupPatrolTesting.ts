/**
 * Patrol E2Eテストフレームワークのセットアップを行うヘルパー関数
 * 包括的なE2Eテスト環境とテストケースを構成する
 */

import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * Patrol E2Eテストフレームワークのセットアップを行う
 * @param config プロジェクト設定
 */
export async function setupPatrolTesting(config: ProjectConfig) {
    // integration_testディレクトリの作成
    const integrationTestDir = path.join(config.projectPath, 'integration_test');
    await fs.ensureDir(integrationTestDir);

    // pubspec.yamlにPatrol依存関係を追加
    const pubspecPath = path.join(config.projectPath, 'pubspec.yaml');
    const pubspecContent = await fs.readFile(pubspecPath, 'utf-8');

    // dev_dependenciesにPatrol依存関係を追加
    const updatedPubspec = pubspecContent
        .replace(
            'dev_dependencies:',
            `dev_dependencies:
  # Patrol E2E Testing
  patrol: ^3.13.0
  patrol_devtools_extension: ^2.0.0`
        )
        .replace(
            'flutter_test:',
            `integration_test:
    sdk: flutter
  flutter_test:`
        );

    await fs.writeFile(pubspecPath, updatedPubspec);

    // patrolディレクトリの作成
    const patrolDir = path.join(config.projectPath, 'patrol');
    await fs.ensureDir(patrolDir);

    // Patrol READMEの作成
    const patrolReadme = `# Patrol E2E Testing

Patrol is a powerful E2E testing framework for Flutter apps with native automation support.

## Installation

### Install Patrol CLI
\`\`\`bash
# macOS/Linux
curl -fsSL https://raw.githubusercontent.com/patrol-for-flutter/patrol-cli/main/install.sh | bash

# Or with Homebrew
brew install patrol

# Windows (PowerShell as Administrator)
Invoke-WebRequest -Uri https://raw.githubusercontent.com/patrol-for-flutter/patrol-cli/main/install.ps1 -UseBasicParsing | Invoke-Expression
\`\`\`

### Setup Patrol in Project
\`\`\`bash
# Bootstrap Patrol (one-time setup)
patrol bootstrap

# This will:
# - Configure native test runners
# - Set up iOS and Android test targets
# - Create necessary configuration files
\`\`\`

## Running Tests

### Local Testing

#### iOS Simulator
\`\`\`bash
# Start iOS simulator
open -a Simulator

# Run Patrol tests on iOS
patrol test --target integration_test/app_test.dart

# Run with specific device
patrol test --target integration_test/app_test.dart --device "iPhone 15 Pro"
\`\`\`

#### Android Emulator
\`\`\`bash
# List available emulators
emulator -list-avds

# Start Android emulator
emulator -avd <emulator_name>

# Run Patrol tests on Android
patrol test --target integration_test/app_test.dart --flavor development

# Run on specific device
patrol test --target integration_test/app_test.dart --device "emulator-5554"
\`\`\`

#### Physical Device
\`\`\`bash
# Connect device via USB and ensure debugging is enabled

# Run on connected device
patrol test --target integration_test/app_test.dart --device <device_id>
\`\`\`

### CI/CD Testing

#### GitHub Actions Example
\`\`\`yaml
- name: Run Patrol tests
  run: |
    patrol test \\
      --target integration_test/app_test.dart \\
      --flavor production \\
      --dart-define=CI=true
\`\`\`

## Writing Tests

Tests are located in the \`integration_test\` directory.

### Key Concepts

1. **Native Automation**: Access native UI elements and system features
2. **Custom Finders**: Create reusable finders for complex widgets
3. **Assertions**: Verify UI state and behavior
4. **Screenshots**: Capture screenshots during tests

### Example Test Structure

\`\`\`dart
import 'package:flutter_test/flutter_test.dart';
import 'package:patrol/patrol.dart';

void main() {
  patrolTest(
    'Counter increments',
    ($) async {
      await $.pumpWidgetAndSettle(MyApp());

      // Find and tap the increment button
      await $(Icons.add).tap();

      // Verify counter incremented
      expect($('1'), findsOneWidget);
    },
  );
}
\`\`\`

## Patrol Features

### Native Interactions
- Tap, swipe, scroll native elements
- Handle system dialogs and permissions
- Access device features (camera, location, etc.)

### Cross-Platform Support
- Single test codebase for iOS and Android
- Platform-specific behaviors when needed
- Web testing support (experimental)

### Advanced Features
- Network mocking
- Deep linking tests
- Push notification testing
- Background/foreground app state testing

## Debugging Tests

### Visual Debugging
\`\`\`bash
# Run tests with visual debugging
patrol test --target integration_test/app_test.dart --debug
\`\`\`

### Taking Screenshots
\`\`\`dart
// In your test
await $.takeScreenshot('home_screen');
\`\`\`

## Resources

- [Patrol Documentation](https://patrol.leancode.co/)
- [Patrol GitHub](https://github.com/patrol-for-flutter/patrol)
- [Flutter Testing Guide](https://docs.flutter.dev/testing)
- [Example Tests](https://github.com/patrol-for-flutter/patrol/tree/master/packages/patrol/example/integration_test)
`;

    await fs.writeFile(path.join(patrolDir, 'README.md'), patrolReadme);

    // 基本アプリテストの作成
    const appTest = `import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:patrol/patrol.dart';
import 'package:${config.projectName.toLowerCase().replace(/-/g, '_')}/main.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('App E2E Tests', () {
    patrolTest(
      'app launches successfully',
      (\$) async {
        // Launch the app
        await \$.pumpWidgetAndSettle(MyApp());

        // Verify app title is visible
        expect(\$('${config.projectName}'), findsOneWidget);

        // Take a screenshot
        await \$.takeScreenshot('app_launch');
      },
    );

    patrolTest(
      'counter increments correctly',
      (\$) async {
        await \$.pumpWidgetAndSettle(MyApp());

        // Verify initial counter value
        expect(\$('0'), findsOneWidget);

        // Tap the increment button
        await \$(Icons.add).tap();

        // Verify counter incremented
        expect(\$('1'), findsOneWidget);
        expect(\$('0'), findsNothing);

        // Tap again
        await \$(Icons.add).tap();

        // Verify counter is now 2
        expect(\$('2'), findsOneWidget);

        await \$.takeScreenshot('counter_incremented');
      },
    );

    patrolTest(
      'navigation to settings works',
      (\$) async {
        await \$.pumpWidgetAndSettle(MyApp());

        // Navigate to settings
        await \$(Icons.settings).tap();
        await \$.pumpAndSettle();

        // Verify we're on settings screen
        expect(\$('Settings'), findsWidgets);
        expect(\$('Dark Mode'), findsOneWidget);

        // Take screenshot
        await \$.takeScreenshot('settings_screen');

        // Navigate back
        await \$(Icons.arrow_back).tap();
        await \$.pumpAndSettle();

        // Verify we're back on home screen
        expect(\$('Welcome to ${config.projectName}!'), findsOneWidget);
      },
    );

    patrolTest(
      'dark mode toggle works',
      (\$) async {
        await \$.pumpWidgetAndSettle(MyApp());

        // Navigate to settings
        await \$(Icons.settings).tap();
        await \$.pumpAndSettle();

        // Find the dark mode switch
        final darkModeSwitch = \$(Switch);

        // Toggle dark mode
        await darkModeSwitch.tap();
        await \$.pumpAndSettle();

        // Take screenshot in dark mode
        await \$.takeScreenshot('dark_mode_enabled');

        // Toggle back to light mode
        await darkModeSwitch.tap();
        await \$.pumpAndSettle();

        // Take screenshot in light mode
        await \$.takeScreenshot('light_mode_enabled');
      },
    );

    patrolTest(
      'about dialog shows correctly',
      (\$) async {
        await \$.pumpWidgetAndSettle(MyApp());

        // Navigate to settings
        await \$(Icons.settings).tap();
        await \$.pumpAndSettle();

        // Tap on About
        await \$('About').tap();
        await \$.pumpAndSettle();

        // Verify dialog content
        expect(\$('${config.projectName}'), findsWidgets);
        expect(\$('Built with Flutter'), findsOneWidget);
        expect(\$('Generated by fluorite-flake'), findsOneWidget);

        // Take screenshot
        await \$.takeScreenshot('about_dialog');

        // Close dialog
        await \$('OK').tap();
        await \$.pumpAndSettle();
      },
    );

    patrolTest(
      'feature cards are displayed',
      (\$) async {
        await \$.pumpWidgetAndSettle(MyApp());

        // Verify feature cards are visible
        expect(\$('Cross-platform'), findsOneWidget);
        expect(\$('Material Design 3'), findsOneWidget);
        expect(\$('Go Router'), findsOneWidget);
        expect(\$('State Management'), findsOneWidget);

        // Scroll to ensure all cards are visible
        await \$('State Management').scrollTo();

        await \$.takeScreenshot('feature_cards');
      },
    );
  });

  group('Performance Tests', () {
    patrolTest(
      'app performs smoothly during navigation',
      (\$) async {
        await \$.pumpWidgetAndSettle(MyApp());

        // Measure time for navigation
        final stopwatch = Stopwatch()..start();

        // Navigate to settings
        await \$(Icons.settings).tap();
        await \$.pumpAndSettle();

        // Navigate back
        await \$(Icons.arrow_back).tap();
        await \$.pumpAndSettle();

        stopwatch.stop();

        // Verify navigation is responsive (< 500ms)
        expect(stopwatch.elapsedMilliseconds, lessThan(500),
            reason: 'Navigation should be responsive');
      },
    );
  });
}
`;

    await fs.writeFile(path.join(integrationTestDir, 'app_test.dart'), appTest);

    // スモークテストの作成
    const smokeTest = `import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:patrol/patrol.dart';
import 'package:${config.projectName.toLowerCase().replace(/-/g, '_')}/main.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  patrolTest(
    'smoke test - app launches without errors',
    (\$) async {
      // Launch the app
      await \$.pumpWidgetAndSettle(MyApp());

      // Basic smoke test - just verify the app launches
      expect(\$('${config.projectName}'), findsAtLeastNWidgets(1));

      // Verify no error widgets
      expect(\$(ErrorWidget), findsNothing);
      expect(\$(FlutterError), findsNothing);

      // Take a screenshot as evidence
      await \$.takeScreenshot('smoke_test_pass');
    },
  );
}
`;

    await fs.writeFile(path.join(integrationTestDir, 'smoke_test.dart'), smokeTest);

    // CIテストスイートの作成
    const ciTestSuite = `import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:patrol/patrol.dart';
import 'package:${config.projectName.toLowerCase().replace(/-/g, '_')}/main.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('CI Test Suite', () {
    patrolTest(
      'critical user flow',
      (\$) async {
        await \$.pumpWidgetAndSettle(MyApp());

        // Test critical user flow
        // 1. App launches
        expect(\$('${config.projectName}'), findsAtLeastNWidgets(1));

        // 2. Counter works
        await \$(Icons.add).tap();
        expect(\$('1'), findsOneWidget);

        // 3. Navigation works
        await \$(Icons.settings).tap();
        await \$.pumpAndSettle();
        expect(\$('Settings'), findsWidgets);

        // 4. Can return to home
        await \$(Icons.arrow_back).tap();
        await \$.pumpAndSettle();
        expect(\$('Welcome to ${config.projectName}!'), findsOneWidget);

        // Test passed
        await \$.takeScreenshot('ci_test_success');
      },
      timeout: const Timeout(Duration(minutes: 2)),
    );
  });
}
`;

    await fs.writeFile(path.join(integrationTestDir, 'ci_test_suite.dart'), ciTestSuite);

    // patrol.yaml設定ファイルの作成
    const patrolConfig = `# Patrol Configuration
app_name: ${config.projectName}
android:
  package_name: com.example.${config.projectName.toLowerCase().replace(/-/g, '_')}
ios:
  bundle_id: com.example.${config.projectName.toLowerCase().replace(/-/g, '')}

# Test configuration
flavor: development

# Screenshots
screenshots:
  enabled: true
  path: patrol_screenshots

# Timeouts
timeouts:
  test: 120
  settle: 10
`;

    await fs.writeFile(path.join(config.projectPath, 'patrol.yaml'), patrolConfig);

    // Patrol成果物を含むようgitignoreを更新
    const gitignorePath = path.join(config.projectPath, '.gitignore');
    const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
    const updatedGitignore = `${gitignoreContent}
# Patrol artifacts
patrol_screenshots/
*.patrol.json
`;

    await fs.writeFile(gitignorePath, updatedGitignore);

    // READMEにテストスクリプトを追加
    const readmePath = path.join(config.projectPath, 'README.md');
    const readmeContent = await fs.readFile(readmePath, 'utf-8');
    const updatedReadme = readmeContent.replace(
        '### Testing and Analysis',
        `### E2E Testing with Patrol

\`\`\`bash
# Install Patrol CLI
curl -fsSL https://raw.githubusercontent.com/patrol-for-flutter/patrol-cli/main/install.sh | bash

# Bootstrap Patrol (one-time setup)
patrol bootstrap

# Run E2E tests
patrol test --target integration_test/app_test.dart

# Run smoke test
patrol test --target integration_test/smoke_test.dart

# Run CI test suite
patrol test --target integration_test/ci_test_suite.dart
\`\`\`

### Testing and Analysis`
    );

    await fs.writeFile(readmePath, updatedReadme);
}
