import path from 'node:path';
import fs from 'fs-extra';

import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * Maestro E2Eテストフレームワークのセットアップを行う
 * モバイルアプリ用の軽量E2Eテストフレームワークを設定し、基本的なテストファイルを作成
 * @param config プロジェクト設定
 */
export async function setupMaestroTesting(config: ProjectConfig) {
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
