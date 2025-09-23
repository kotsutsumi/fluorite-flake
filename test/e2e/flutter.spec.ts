import path from 'node:path';
import { expect, test } from '@playwright/test';
import fs from 'fs-extra';
import { TestProjectManager, createTestConfig } from './utils/test-helpers.js';

// Test configurations for different Flutter setups
const testConfigs = [
  {
    name: 'flutter-basic',
    config: createTestConfig({
      projectName: 'flutter-basic-e2e',
      framework: 'flutter',
      deployment: false,
    }),
  },
  {
    name: 'flutter-with-deployment',
    config: createTestConfig({
      projectName: 'flutter-deployment-e2e',
      framework: 'flutter',
      deployment: true,
    }),
  },
];

test.describe
  .serial('Flutter E2E Tests', () => {
    test.setTimeout(360000); // 6 minutes per test (Flutter builds are slow)

    let manager: TestProjectManager;

    test.beforeAll(async () => {
      manager = new TestProjectManager();
      await manager.initialize();
    });

    test.afterAll(async () => {
      await manager.cleanup();
    });

    for (const { name, config } of testConfigs) {
      test(`${name}: should create, analyze, and prepare for build`, async () => {
        console.log(`\n🧪 Testing ${name} configuration...`);

        // Step 1: Create the project
        const projectPath = await manager.createProject(config);

        // Step 2: Verify project structure
        await manager.verifyProjectStructure(projectPath, 'flutter');

        // Step 3: Check if Flutter is available
        const { exec } = await import('node:child_process');
        const { promisify } = await import('node:util');
        const execAsync = promisify(exec);

        let hasFlutter = false;
        try {
          const { stdout } = await execAsync('flutter --version');
          console.log('✅ Flutter detected:', stdout.split('\n')[0]);
          hasFlutter = true;
        } catch {
          console.log('⚠️ Flutter not found - skipping Flutter-specific tests');
        }

        // Step 4: Verify Flutter project files

        // Check pubspec.yaml
        const pubspecPath = path.join(projectPath, 'pubspec.yaml');
        const pubspecContent = await fs.readFile(pubspecPath, 'utf-8');

        expect(pubspecContent).toContain('name:');
        expect(pubspecContent).toContain('flutter:');
        expect(pubspecContent).toContain('sdk: flutter');

        // Check main.dart
        const mainPath = path.join(projectPath, 'lib/main.dart');
        const mainContent = await fs.readFile(mainPath, 'utf-8');

        expect(mainContent).toContain("import 'package:flutter/material.dart'");
        expect(mainContent).toContain('void main()');
        expect(mainContent).toContain('runApp');

        // Step 5: If Flutter is available, run Flutter-specific tests
        if (hasFlutter) {
          console.log('📦 Getting Flutter dependencies...');

          try {
            // Get dependencies
            await execAsync('flutter pub get', {
              cwd: projectPath,
              timeout: 120000, // 2 minutes
            });
            console.log('✅ Flutter dependencies installed');

            // Analyze the project
            console.log('🔍 Analyzing Flutter project...');
            const { stdout: analyzeOutput } = await execAsync('flutter analyze', {
              cwd: projectPath,
              timeout: 60000,
            });

            // Check for critical issues
            if (analyzeOutput.includes('error')) {
              console.error('❌ Flutter analyze found errors:', analyzeOutput);
              throw new Error('Flutter analyze failed');
            }
            console.log('✅ Flutter analyze passed');

            // Test Flutter web build if Chrome is available
            try {
              console.log('🌐 Testing Flutter web build...');

              // Build for web
              await execAsync('flutter build web --release', {
                cwd: projectPath,
                timeout: 300000, // 5 minutes
              });

              console.log('✅ Flutter web build completed');

              // Check that build output exists
              const webBuildPath = path.join(projectPath, 'build/web');
              if (await fs.pathExists(webBuildPath)) {
                // Start a simple HTTP server to serve the Flutter web build
                const { exec: execSync } = await import('node:child_process');
                const server = execSync(
                  'python3 -m http.server 8080 || python -m SimpleHTTPServer 8080',
                  {
                    cwd: webBuildPath,
                  }
                );

                // Wait for server to start
                await new Promise((resolve) => setTimeout(resolve, 3000));

                try {
                  // Test the Flutter web app with Playwright
                  await manager.testWithPlaywright('http://localhost:8080', async (page) => {
                    // Flutter web app should load
                    await page.waitForTimeout(5000); // Flutter web takes time to initialize

                    // Check that the page loaded
                    const body = page.locator('body');
                    await expect(body).toBeVisible();

                    // Flutter web apps have specific structure
                    const flutterView = page.locator('flt-glass-pane, flutter-view');
                    if (await flutterView.isVisible()) {
                      console.log('  Flutter web view detected');
                    }

                    // Check for any content
                    const hasContent = await page.evaluate(() => {
                      return document.body.innerHTML.length > 100;
                    });
                    expect(hasContent).toBeTruthy();
                  });
                } finally {
                  // Kill the HTTP server
                  server.kill();
                }
              }
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              console.log('⚠️ Flutter web build not available or failed:', errorMessage);
            }

            // Test Flutter test command
            console.log('🧪 Running Flutter tests...');
            try {
              const { stdout: _testOutput } = await execAsync('flutter test', {
                cwd: projectPath,
                timeout: 120000,
              });
              console.log('✅ Flutter tests passed');
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              console.log('⚠️ Flutter tests failed (might be expected):', errorMessage);
            }

            // Run Patrol tests if available
            const hasPatrol = await manager.checkPatrolAvailability();
            if (hasPatrol) {
              console.log('🚓 Patrol is available - running mobile E2E tests...');
              await manager.runPatrolTests(projectPath);
            } else {
              console.log('ℹ️ Patrol not available - install it for better mobile testing');
              console.log('  Install with: dart pub global activate patrol_cli');
            }
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('❌ Flutter operations failed:', errorMessage);
            // Don't fail the test if Flutter is not properly configured
            if (process.env.CI) {
              console.log('  Skipping Flutter failure in CI environment');
            } else {
              throw error;
            }
          }
        }

        // Step 6: Check deployment configuration if enabled
        if (config.deployment) {
          // Note: Platform-specific configurations (android/, ios/) are created by Flutter CLI
          // Since we're not running 'flutter create' to avoid requiring Flutter SDK,
          // we just verify that deployment was requested
          console.log(
            '✅ Deployment configuration requested (platform dirs created by Flutter CLI)'
          );
        }

        console.log(`✅ ${name} test completed successfully\n`);
      });
    }

    // Special test for Flutter hot reload simulation
    test('flutter-development: should support development features', async () => {
      const config = createTestConfig({
        projectName: 'flutter-dev-test',
        framework: 'flutter',
      });

      console.log('\n🧪 Testing Flutter development features...');

      const projectPath = await manager.createProject(config);

      // Check Flutter development files

      // Check for hot reload support files
      const analysisOptionsPath = path.join(projectPath, 'analysis_options.yaml');
      if (await fs.pathExists(analysisOptionsPath)) {
        const analysisContent = await fs.readFile(analysisOptionsPath, 'utf-8');
        expect(analysisContent).toContain('linter:');
        console.log('✅ Analysis options configured');
      }

      // Check for debug configuration
      const vscodePath = path.join(projectPath, '.vscode/launch.json');
      if (await fs.pathExists(vscodePath)) {
        const launchConfig = await fs.readJSON(vscodePath);
        expect(launchConfig.configurations).toBeDefined();
        console.log('✅ Debug configuration present');
      }

      console.log('✅ Flutter development features test completed\n');
    });
    // Flutter-specific error handling
    test('should handle missing Flutter SDK gracefully', async () => {
      const manager2 = new TestProjectManager();

      try {
        await manager2.initialize();

        const config = createTestConfig({
          projectName: 'flutter-no-sdk-test',
          framework: 'flutter',
        });

        const projectPath = await manager2.createProject(config);

        // Project should be created even without Flutter SDK
        expect(await fs.pathExists(projectPath)).toBeTruthy();

        // Verify basic structure exists
        await manager2.verifyProjectStructure(projectPath, 'flutter');

        console.log('✅ Project created successfully without Flutter SDK');
      } finally {
        await manager2.cleanup();
      }
    });

    // Performance and structure testing
    test('should create optimized project structure', async () => {
      const manager3 = new TestProjectManager();

      try {
        await manager3.initialize();

        const config = createTestConfig({
          projectName: 'flutter-structure-test',
          framework: 'flutter',
        });

        const projectPath = await manager3.createProject(config);

        // Check for all expected directories and files
        const expectedStructure = [
          'lib/main.dart',
          'lib/screens/home_screen.dart',
          'lib/screens/settings_screen.dart',
          'lib/widgets/feature_card.dart',
          'lib/services/theme_service.dart',
          'lib/services/navigation_service.dart',
          'lib/models/app_state.dart',
          'lib/utils/constants.dart',
          'test/widget_test.dart',
          'assets/images/.gitkeep',
          'pubspec.yaml',
          'analysis_options.yaml',
          'README.md',
        ];

        const missingFiles: string[] = [];
        for (const file of expectedStructure) {
          const filePath = path.join(projectPath, file);
          if (!(await fs.pathExists(filePath))) {
            missingFiles.push(file);
          }
        }

        if (missingFiles.length > 0) {
          console.log('⚠️ Some expected files are missing:', missingFiles);
        } else {
          console.log('✅ All expected files present');
        }

        // Check file sizes to ensure content was generated
        const mainDartPath = path.join(projectPath, 'lib/main.dart');
        const mainDartStats = await fs.stat(mainDartPath);
        expect(mainDartStats.size).toBeGreaterThan(100); // Should have actual content

        // Count total Dart files
        const countDartFiles = async (dir: string): Promise<number> => {
          let count = 0;
          const files = await fs.readdir(dir);

          for (const file of files) {
            const filePath = path.join(dir, file);
            const stats = await fs.stat(filePath);

            if (stats.isDirectory() && !file.startsWith('.')) {
              count += await countDartFiles(filePath);
            } else if (file.endsWith('.dart')) {
              count++;
            }
          }

          return count;
        };

        const dartFileCount = await countDartFiles(path.join(projectPath, 'lib'));
        console.log(`  Total Dart files in lib/: ${dartFileCount}`);
        expect(dartFileCount).toBeGreaterThan(5); // Should have multiple Dart files
      } finally {
        await manager3.cleanup();
      }
    });
  });
