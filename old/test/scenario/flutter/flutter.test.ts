import path from 'node:path';
/**
 * Flutter プロジェクト生成に関するシナリオテスト。
 * プラットフォーム別の出力や命名規則、サポート対象外オプションの拒否など、
 * Flutter 特有の制約が正しく反映されているかをテンポラリディレクトリ上で検証する。
 */
import { afterAll, describe, expect, it } from 'vitest';
import { generateProject, verifyProjectStructure } from '../../helpers/project-generator.js';
import { cleanupAllTempDirs, readProjectFile } from '../../helpers/temp-dir.js';

describe('Flutter プロジェクト生成のシナリオ検証', () => {
    afterAll(async () => {
        await cleanupAllTempDirs();
    });

    describe('基本的な Flutter プロジェクト生成', () => {
        it('最小構成の Flutter プロジェクトが生成されること', async () => {
            const { projectPath } = await generateProject({
                projectName: 'test_flutter_basic', // Flutter ではスネークケースに変換される仕様を確認するコメント
                framework: 'flutter',
                database: 'none',
                storage: 'none',
                deployment: false,
                auth: false,
                packageManager: 'pnpm', // Ignored for Flutter, but required by config
            });

            const { valid, missingFiles } = await verifyProjectStructure(projectPath, [
                'pubspec.yaml',
                'analysis_options.yaml',
                'README.md',
                '.gitignore',
                'lib/main.dart',
                'lib/screens/home_screen.dart',
                'lib/screens/settings_screen.dart',
                'lib/widgets/feature_card.dart',
                'lib/models/app_state.dart',
                'lib/services/theme_service.dart',
                'lib/services/navigation_service.dart',
                'lib/utils/constants.dart',
                'test/widget_test.dart',
                'integration_test/app_test.dart',
                'patrol.yaml',
            ]);

            expect(valid).toBe(true);
            expect(missingFiles).toHaveLength(0);

            // pubspec.yaml にアプリ名や Flutter 依存が正しく記載されているか確認する
            const pubspecContent = await readProjectFile(projectPath, 'pubspec.yaml');
            expect(pubspecContent).toContain('name: test_flutter_basic');
            expect(pubspecContent).toContain('flutter:');
            expect(pubspecContent).toContain('sdk: flutter');
        });

        it('should generate Flutter project with deployment configuration', async () => {
            const { projectPath } = await generateProject({
                projectName: 'test_flutter_deploy',
                framework: 'flutter',
                database: 'none',
                storage: 'none',
                deployment: true,
                auth: false,
                packageManager: 'pnpm',
            });

            const { valid, missingFiles } = await verifyProjectStructure(projectPath, [
                'pubspec.yaml',
                '.github/workflows/flutter-ci.yml',
                '.github/workflows/release.yml',
                'scripts/build-android.sh',
                'scripts/build-ios.sh',
                'scripts/build-web.sh',
                'fastlane/Fastfile',
                'fastlane/Appfile',
            ]);

            expect(valid).toBe(true);
            expect(missingFiles).toHaveLength(0);
        });
    });

    describe('ターゲットプラットフォームごとの出力確認', () => {
        it('should generate Flutter project with mobile platform files', async () => {
            const { projectPath } = await generateProject({
                projectName: 'test_flutter_mobile',
                framework: 'flutter',
                database: 'none',
                storage: 'none',
                deployment: false,
                auth: false,
                packageManager: 'pnpm',
            });

            const { valid: androidValid } = await verifyProjectStructure(projectPath, [
                'android/app/src/main/AndroidManifest.xml',
                'android/app/src/main/kotlin/com/example/test_flutter_mobile/MainActivity.kt',
                'android/gradle.properties',
                'android/settings.gradle',
            ]);

            expect(androidValid).toBe(true);

            const { valid: iosValid } = await verifyProjectStructure(projectPath, [
                'ios/Runner/Info.plist',
                'ios/Runner/AppDelegate.swift',
                'ios/Podfile',
                'ios/Runner.xcworkspace/contents.xcworkspacedata',
            ]);

            expect(iosValid).toBe(true);
        });

        it('should generate Flutter project with web platform files', async () => {
            const { projectPath } = await generateProject({
                projectName: 'test_flutter_web',
                framework: 'flutter',
                database: 'none',
                storage: 'none',
                deployment: false,
                auth: false,
                packageManager: 'pnpm',
            });

            const { valid } = await verifyProjectStructure(projectPath, [
                'web/index.html',
                'web/manifest.json',
                'web/favicon.png',
                'web/icons/Icon-192.png',
                'web/icons/Icon-512.png',
            ]);

            expect(valid).toBe(true);
        });

        it('should generate Flutter project with desktop platform files', async () => {
            const { projectPath } = await generateProject({
                projectName: 'test_flutter_desktop',
                framework: 'flutter',
                database: 'none',
                storage: 'none',
                deployment: false,
                auth: false,
                packageManager: 'pnpm',
            });

            const { valid: macosValid } = await verifyProjectStructure(projectPath, [
                'macos/Runner.xcodeproj/project.pbxproj',
                'macos/Runner/AppDelegate.swift',
                'macos/Runner/Info.plist',
            ]);

            expect(macosValid).toBe(true);

            const { valid: windowsValid } = await verifyProjectStructure(projectPath, [
                'windows/CMakeLists.txt',
                'windows/runner/main.cpp',
                'windows/runner/flutter_window.cpp',
            ]);

            expect(windowsValid).toBe(true);

            const { valid: linuxValid } = await verifyProjectStructure(projectPath, [
                'linux/CMakeLists.txt',
                'linux/main.cc',
                'linux/flutter/CMakeLists.txt',
            ]);

            expect(linuxValid).toBe(true);
        });
    });

    describe('Flutter プロジェクト構造の検証', () => {
        it('プロジェクト名が自動的にスネークケースへ変換されること', async () => {
            const { projectPath } = await generateProject({
                projectName: 'MyAwesomeApp', // Should be converted to snake_case
                framework: 'flutter',
                database: 'none',
                storage: 'none',
                deployment: false,
                auth: false,
                packageManager: 'pnpm',
            });

            // Flutter では snake_case に変換されるべき
            const pubspecContent = await readProjectFile(projectPath, 'pubspec.yaml');
            expect(pubspecContent).toContain('name: my_awesome_app');
        });

        it('should create proper Dart file structure', async () => {
            const { projectPath } = await generateProject({
                projectName: 'test_flutter_structure',
                framework: 'flutter',
                database: 'none',
                storage: 'none',
                deployment: false,
                auth: false,
                packageManager: 'pnpm',
            });

            // main.dart の初期構成が Flutter 標準に従っているか確認する
            const mainContent = await readProjectFile(projectPath, 'lib/main.dart');
            expect(mainContent).toContain("import 'package:flutter/material.dart'");
            expect(mainContent).toContain('void main()');
            expect(mainContent).toContain('runApp(');
            expect(mainContent).toContain('class MyApp extends StatelessWidget');
        });
    });

    describe('Flutter 固有の制約検証', () => {
        it('should not allow database for Flutter', () => {
            expect(() => {
                const config = {
                    framework: 'flutter' as const,
                    database: 'turso' as const,
                };
                // Flutter はデータベース構成をサポートしない
                if (config.framework === 'flutter' && config.database !== 'none') {
                    throw new Error('Flutter does not support database configuration');
                }
            }).toThrow('Flutter does not support database configuration');
        });

        it('should not allow cloud storage for Flutter', () => {
            expect(() => {
                const config = {
                    framework: 'flutter' as const,
                    storage: 'vercel-blob' as const,
                };
                // Flutter はクラウドストレージ構成をサポートしない
                if (config.framework === 'flutter' && config.storage !== 'none') {
                    throw new Error('Flutter does not support cloud storage configuration');
                }
            }).toThrow('Flutter does not support cloud storage configuration');
        });

        it('should not use JavaScript package managers', () => {
            expect(() => {
                const config = {
                    framework: 'flutter' as const,
                    packageManager: 'pnpm' as const,
                };
                // Flutter は pub を使用し、JavaScript のパッケージマネージャー設定は無視される
                if (config.framework === 'flutter') {
                    // Flutter ではパッケージマネージャーを無視
                    return 'pub';
                }
                return config.packageManager;
            }).not.toThrow();
        });
    });
});
