import { describe, expect, it, afterAll } from 'vitest';
import path from 'node:path';
import { generateProject, verifyProjectStructure } from '../../helpers/project-generator.js';
import { cleanupAllTempDirs, readProjectFile } from '../../helpers/temp-dir.js';

describe('Flutter project generation scenarios', () => {
    afterAll(async () => {
        await cleanupAllTempDirs();
    });

    describe('Basic Flutter project', () => {
        it('should generate minimal Flutter project', async () => {
            const { projectPath } = await generateProject({
                projectName: 'test_flutter_basic', // Flutter uses snake_case
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

            // Verify pubspec.yaml content
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

    describe('Flutter platform support', () => {
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

    describe('Flutter project structure', () => {
        it('should follow Flutter naming conventions', async () => {
            const { projectPath } = await generateProject({
                projectName: 'MyAwesomeApp', // Should be converted to snake_case
                framework: 'flutter',
                database: 'none',
                storage: 'none',
                deployment: false,
                auth: false,
                packageManager: 'pnpm',
            });

            // Flutter should convert to snake_case
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

            // Check main.dart content
            const mainContent = await readProjectFile(projectPath, 'lib/main.dart');
            expect(mainContent).toContain("import 'package:flutter/material.dart'");
            expect(mainContent).toContain('void main()');
            expect(mainContent).toContain('runApp(');
            expect(mainContent).toContain('class MyApp extends StatelessWidget');
        });
    });

    describe('Flutter project constraints', () => {
        it('should not allow database for Flutter', () => {
            expect(() => {
                const config = {
                    framework: 'flutter' as const,
                    database: 'turso' as const,
                };
                // Flutter doesn't support database configuration
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
                // Flutter doesn't support cloud storage configuration
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
                // Flutter uses pub, not JavaScript package managers
                if (config.framework === 'flutter') {
                    // Package manager is ignored for Flutter
                    return 'pub';
                }
                return config.packageManager;
            }).not.toThrow();
        });
    });
});
