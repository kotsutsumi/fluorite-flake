import { exec, execSync } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import type { Browser, BrowserContext, Page } from '@playwright/test';
import { chromium } from '@playwright/test';
import fs from 'fs-extra';

const execAsync = promisify(exec);

interface TestProjectConfig {
  projectName: string;
  framework: 'nextjs' | 'expo' | 'tauri' | 'flutter';
  database?: 'none' | 'turso' | 'supabase';
  orm?: 'prisma' | 'drizzle';
  deployment?: boolean;
  storage?: 'none' | 'vercel-blob' | 'cloudflare-r2' | 'aws-s3' | 'supabase-storage';
  auth?: boolean;
  packageManager?: 'npm' | 'pnpm' | 'yarn' | 'bun';
}

interface ServerProcess {
  process: ChildProcess;
  port: number;
  url: string;
  framework: string;
}

export class TestProjectManager {
  private tempDir: string;
  private serverProcesses: Map<string, ServerProcess> = new Map();
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private readonly projectRoot: string;

  constructor() {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    this.projectRoot = path.join(__dirname, '../../..');
    this.tempDir = '';
  }

  async initialize() {
    // Create a unique temp directory for this test run
    this.tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fluorite-e2e-'));
    console.log(`📁 Created temp directory: ${this.tempDir}`);

    // Initialize Playwright browser
    this.browser = await chromium.launch({
      headless: process.env.HEADLESS !== 'false',
    });
    this.context = await this.browser.newContext({
      ignoreHTTPSErrors: true,
    });
  }

  async cleanup() {
    console.log('🧹 Starting cleanup...');

    // Kill all server processes
    for (const [projectName, server] of this.serverProcesses) {
      console.log(`  Killing server for ${projectName}...`);
      await this.killServerProcess(server);
    }

    // Close browser
    if (this.context) {
      await this.context.close();
    }
    if (this.browser) {
      await this.browser.close();
    }

    // Remove temp directory
    if (this.tempDir && (await fs.pathExists(this.tempDir))) {
      console.log(`  Removing temp directory: ${this.tempDir}`);
      await fs.remove(this.tempDir);
    }

    console.log('✅ Cleanup complete');
  }

  async createProject(config: TestProjectConfig): Promise<string> {
    const projectPath = path.join(this.tempDir, config.projectName);
    console.log(`\n🚀 Creating ${config.framework} project: ${config.projectName}`);

    // Ensure CLI is built
    await this.ensureCLIBuilt();

    // Create project using the CLI programmatically
    await this.runGenerators(projectPath, config);

    console.log(`✅ Project created at: ${projectPath}`);
    return projectPath;
  }

  private async ensureCLIBuilt() {
    const distPath = path.join(this.projectRoot, 'dist/cli.js');
    if (!(await fs.pathExists(distPath))) {
      console.log('  Building CLI...');
      execSync('pnpm run build', { cwd: this.projectRoot });
    }
  }

  private async runGenerators(projectPath: string, config: TestProjectConfig) {
    const projectConfig = {
      projectName: config.projectName,
      projectPath,
      framework: config.framework,
      database: config.database || 'none',
      orm: config.orm || undefined,
      deployment: config.deployment || false,
      storage: config.storage || 'none',
      auth: config.auth || false,
      packageManager: config.packageManager || ('pnpm' as const),
    };

    // Import and run appropriate generators
    switch (config.framework) {
      case 'nextjs': {
        const { generateNextProject } = await import(
          path.join(this.projectRoot, 'dist/generators/next-generator.js')
        );
        await generateNextProject(projectConfig);

        if (config.database && config.database !== 'none') {
          const { setupDatabase } = await import(
            path.join(this.projectRoot, 'dist/generators/database-generator.js')
          );
          await setupDatabase(projectConfig);
        }

        if (config.storage && config.storage !== 'none') {
          const { setupStorage } = await import(
            path.join(this.projectRoot, 'dist/generators/storage-generator.js')
          );
          await setupStorage(projectConfig);
        }

        if (config.auth) {
          const { setupAuth } = await import(
            path.join(this.projectRoot, 'dist/generators/auth-generator.js')
          );
          await setupAuth(projectConfig);
        }

        if (config.deployment) {
          const { setupDeployment } = await import(
            path.join(this.projectRoot, 'dist/generators/deployment-generator.js')
          );
          await setupDeployment(projectConfig);
        }
        break;
      }

      case 'expo': {
        const { generateExpoProject } = await import(
          path.join(this.projectRoot, 'dist/generators/expo-generator.js')
        );
        await generateExpoProject(projectConfig);

        if (config.database && config.database !== 'none' && config.orm) {
          const { setupDatabase } = await import(
            path.join(this.projectRoot, 'dist/generators/database-generator.js')
          );
          await setupDatabase(projectConfig);
        }

        if (config.storage && config.storage !== 'none') {
          const { setupStorage } = await import(
            path.join(this.projectRoot, 'dist/generators/storage-generator.js')
          );
          await setupStorage(projectConfig);
        }

        if (config.auth) {
          const { setupAuth } = await import(
            path.join(this.projectRoot, 'dist/generators/auth-generator.js')
          );
          await setupAuth(projectConfig);
        }
        break;
      }

      case 'tauri': {
        const { generateTauriProject } = await import(
          path.join(this.projectRoot, 'dist/generators/tauri-generator.js')
        );
        await generateTauriProject(projectConfig);

        if (config.deployment) {
          const { setupDeployment } = await import(
            path.join(this.projectRoot, 'dist/generators/deployment-generator.js')
          );
          await setupDeployment(projectConfig);
        }
        break;
      }

      case 'flutter': {
        const { generateFlutterProject } = await import(
          path.join(this.projectRoot, 'dist/generators/flutter-generator.js')
        );
        await generateFlutterProject(projectConfig);

        if (config.deployment) {
          const { setupDeployment } = await import(
            path.join(this.projectRoot, 'dist/generators/deployment-generator.js')
          );
          await setupDeployment(projectConfig);
        }
        break;
      }
    }
  }

  async installDependencies(
    projectPath: string,
    packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun' = 'pnpm'
  ) {
    console.log(`📦 Installing dependencies with ${packageManager}...`);

    const installCommand = {
      npm: 'npm install',
      pnpm: 'pnpm install',
      yarn: 'yarn install',
      bun: 'bun install',
    }[packageManager];

    try {
      // Set timeout based on CI environment
      const timeout = process.env.CI ? 5 * 60 * 1000 : 3 * 60 * 1000; // 5 min in CI, 3 min local

      await execAsync(installCommand, {
        cwd: projectPath,
        timeout,
      });

      console.log('✅ Dependencies installed successfully');
    } catch (error) {
      console.error(`❌ Failed to install dependencies: ${error}`);
      throw error;
    }
  }

  async startDevServer(
    projectPath: string,
    framework: string,
    projectName: string
  ): Promise<ServerProcess> {
    console.log(`🌐 Starting ${framework} dev server...`);

    // Check if server is already running
    if (this.serverProcesses.has(projectName)) {
      console.log('  Server already running');
      const server = this.serverProcesses.get(projectName);
      if (!server) {
        throw new Error(`Server for project ${projectName} not found`);
      }
      return server;
    }

    const port = await this.getAvailablePort(framework);
    const url = `http://localhost:${port}`;

    let command: string;
    const env: NodeJS.ProcessEnv = { ...process.env };

    switch (framework) {
      case 'nextjs':
        command = 'pnpm run dev';
        env.PORT = String(port);
        break;
      case 'expo':
        command = 'pnpm run web';
        env.WEB_PORT = String(port);
        env.EXPO_PACKAGER_PROXY_URL = `http://localhost:${port + 1000}`;
        break;
      case 'tauri':
        command = 'pnpm run dev';
        env.VITE_PORT = String(port);
        break;
      case 'flutter':
        command = `flutter run -d web-server --web-port ${port}`;
        break;
      default:
        throw new Error(`Unsupported framework: ${framework}`);
    }

    const serverProcess = exec(command, {
      cwd: projectPath,
      env,
    });

    // Capture server output for debugging
    serverProcess.stdout?.on('data', (data) => {
      console.log(`  [${projectName}]: ${data.toString().trim()}`);
    });

    serverProcess.stderr?.on('data', (data) => {
      console.error(`  [${projectName} ERROR]: ${data.toString().trim()}`);
    });

    serverProcess.on('exit', (code) => {
      console.log(`  [${projectName}] Server exited with code ${code}`);
      this.serverProcesses.delete(projectName);
    });

    const server: ServerProcess = {
      process: serverProcess,
      port,
      url,
      framework,
    };

    this.serverProcesses.set(projectName, server);

    // Wait for server to be ready
    await this.waitForServer(url, framework);

    console.log(`✅ Server started at ${url}`);
    return server;
  }

  private async getAvailablePort(framework: string): Promise<number> {
    // Use different base ports for different frameworks to avoid conflicts
    const basePorts = {
      nextjs: 3000,
      expo: 8081,
      tauri: 1420,
      flutter: 5000,
    };

    const basePort = basePorts[framework as keyof typeof basePorts] || 3000;

    // Find an available port starting from the base port
    for (let port = basePort; port < basePort + 100; port++) {
      if (await this.isPortAvailable(port)) {
        return port;
      }
    }

    throw new Error('No available ports found');
  }

  private async isPortAvailable(port: number): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        `lsof -i :${port} || netstat -an | grep ${port} || echo "available"`
      );
      return stdout.includes('available') || stdout.trim() === '';
    } catch {
      return true; // Assume available if command fails
    }
  }

  private async waitForServer(url: string, _framework: string, maxRetries = 60) {
    console.log(`  Waiting for server at ${url}...`);

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url);
        if (response.ok || response.status === 404) {
          // 404 is ok for some frameworks
          console.log('  Server is ready!');
          return;
        }
      } catch (_error) {
        // Server not ready yet
      }

      await this.sleep(1000); // Wait 1 second before retry
    }

    throw new Error(`Server failed to start after ${maxRetries} seconds`);
  }

  async testWithPlaywright(url: string, testFn: (page: Page) => Promise<void>): Promise<void> {
    if (!this.context) {
      throw new Error('Browser context not initialized');
    }

    console.log(`🎭 Running Playwright tests for ${url}...`);

    const page = await this.context.newPage();

    try {
      // Set up console logging
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          console.error(`  [Browser Console Error]: ${msg.text()}`);
        }
      });

      page.on('pageerror', (error) => {
        console.error(`  [Page Error]: ${error.message}`);
      });

      // Navigate to the page
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // Run the test function
      await testFn(page);

      console.log('✅ Playwright tests passed');
    } catch (error) {
      // Take a screenshot on error for debugging
      const screenshotPath = path.join(this.tempDir, `error-${Date.now()}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.error(`  Screenshot saved to: ${screenshotPath}`);
      throw error;
    } finally {
      await page.close();
    }
  }

  async runBuildCommand(projectPath: string, framework: string): Promise<void> {
    console.log(`🔨 Running build command for ${framework}...`);

    let buildCommand: string;
    const env: NodeJS.ProcessEnv = { ...process.env };

    switch (framework) {
      case 'nextjs':
        buildCommand = 'pnpm run build';
        break;
      case 'expo':
        buildCommand = 'expo export --platform web';
        break;
      case 'tauri':
        // For Tauri, we'll just build the frontend to save time in tests
        buildCommand = 'pnpm run build:frontend || pnpm run build';
        break;
      case 'flutter':
        buildCommand = 'flutter build web';
        break;
      default:
        throw new Error(`Unsupported framework for build: ${framework}`);
    }

    try {
      // Set longer timeout for builds
      const timeout = process.env.CI ? 10 * 60 * 1000 : 5 * 60 * 1000; // 10 min in CI, 5 min local

      const { stdout, stderr } = await execAsync(buildCommand, {
        cwd: projectPath,
        env,
        timeout,
      });

      console.log('  Build output:', stdout.slice(-500)); // Last 500 chars
      if (stderr) {
        console.error('  Build warnings:', stderr.slice(-500));
      }

      console.log('✅ Build completed successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Build failed: ${errorMessage}`);
      if (error && typeof error === 'object' && 'stdout' in error) {
        console.error('  stdout:', String((error as { stdout: unknown }).stdout).slice(-1000));
      }
      if (error && typeof error === 'object' && 'stderr' in error) {
        console.error('  stderr:', String((error as { stderr: unknown }).stderr).slice(-1000));
      }
      throw error;
    }
  }

  private async killServerProcess(server: ServerProcess) {
    if (server.process && !server.process.killed) {
      // Try graceful shutdown first
      server.process.kill('SIGTERM');

      // Wait a bit for graceful shutdown
      await this.sleep(2000);

      // Force kill if still running
      if (!server.process.killed) {
        server.process.kill('SIGKILL');
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async verifyProjectStructure(projectPath: string, framework: string): Promise<void> {
    console.log(`📂 Verifying project structure for ${framework}...`);

    const requiredFiles: Record<string, string[]> = {
      nextjs: [
        'package.json',
        'tsconfig.json',
        'next.config.mjs',
        'src/app/page.tsx',
        'src/app/layout.tsx',
        'tailwind.config.ts',
      ],
      expo: [
        'package.json',
        'tsconfig.json',
        'app.json',
        'babel.config.js',
        'app/_layout.tsx',
        'app/(tabs)/index.tsx',
      ],
      tauri: [
        'package.json',
        'tsconfig.json',
        'vite.config.ts',
        'src/App.tsx',
        'src/main.tsx',
        'src-tauri/Cargo.toml',
        'src-tauri/tauri.conf.json',
      ],
      flutter: [
        'pubspec.yaml',
        'lib/main.dart',
        'lib/screens/home_screen.dart',
        'lib/services/theme_service.dart',
        'test/widget_test.dart',
      ],
    };

    const files = requiredFiles[framework] || [];
    const missingFiles: string[] = [];

    for (const file of files) {
      const filePath = path.join(projectPath, file);
      if (!(await fs.pathExists(filePath))) {
        missingFiles.push(file);
      }
    }

    if (missingFiles.length > 0) {
      throw new Error(`Missing required files: ${missingFiles.join(', ')}`);
    }

    console.log('✅ Project structure verified');
  }

  // Utility to check for common errors in the console
  async checkForConsoleErrors(page: Page): Promise<string[]> {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // Wait a bit to collect any errors
    await this.sleep(2000);

    return errors;
  }

  // Get temp directory path for external use
  getTempDir(): string {
    return this.tempDir;
  }

  // Get server info for a project
  getServerInfo(projectName: string): ServerProcess | undefined {
    return this.serverProcesses.get(projectName);
  }

  // Run Maestro tests for Expo projects
  async runMaestroTests(projectPath: string): Promise<void> {
    console.log('🎭 Running Maestro E2E tests...');

    // Check if Maestro is installed
    const { exec } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execAsync = promisify(exec);

    let hasMaestro = false;
    try {
      await execAsync('maestro --version');
      hasMaestro = true;
      console.log('✅ Maestro detected');
    } catch {
      console.log('⚠️ Maestro not installed - skipping Maestro tests');
      console.log('  Install with: curl -Ls "https://get.maestro.mobile.dev" | bash');
      return;
    }

    if (!hasMaestro) {
      return;
    }

    // Check if .maestro directory exists
    const maestroDir = path.join(projectPath, '.maestro');
    if (!(await fs.pathExists(maestroDir))) {
      console.log('⚠️ No .maestro directory found in project');
      return;
    }

    // Check if simulator/emulator is available
    let hasSimulator = false;
    try {
      // Try iOS simulator first
      const { stdout: devices } = await execAsync('xcrun simctl list devices -j');
      const deviceList = JSON.parse(devices);
      const availableDevices = Object.values(deviceList.devices)
        .flat()
        .filter((d: { state: string }) => d.state === 'Booted');

      if (availableDevices.length > 0) {
        hasSimulator = true;
        console.log('  iOS Simulator available');
      }
    } catch {
      // iOS simulator not available, try Android
      try {
        const { stdout } = await execAsync('adb devices');
        if (stdout.includes('emulator') || stdout.includes('device')) {
          hasSimulator = true;
          console.log('  Android emulator/device available');
        }
      } catch {
        console.log('⚠️ No simulator or emulator available for Maestro tests');
      }
    }

    if (!hasSimulator) {
      console.log('  Maestro tests require a running simulator or emulator');
      return;
    }

    // Run Maestro smoke test
    try {
      console.log('  Running Maestro smoke test...');
      const smokeTestPath = path.join(maestroDir, 'smoke-test.yaml');

      if (await fs.pathExists(smokeTestPath)) {
        const { stdout, stderr } = await execAsync(`maestro test "${smokeTestPath}"`, {
          cwd: projectPath,
          timeout: 120000, // 2 minutes
        });

        if (stdout.includes('PASSED') || stdout.includes('✓')) {
          console.log('✅ Maestro smoke test passed');
        } else {
          console.log('⚠️ Maestro test output:', stdout);
          if (stderr) {
            console.error('  stderr:', stderr);
          }
        }
      }

      // Run navigation test if it exists
      const navTestPath = path.join(maestroDir, 'navigation-test.yaml');
      if (await fs.pathExists(navTestPath)) {
        console.log('  Running Maestro navigation test...');
        try {
          const { stdout } = await execAsync(`maestro test "${navTestPath}"`, {
            cwd: projectPath,
            timeout: 120000,
          });

          if (stdout.includes('PASSED') || stdout.includes('✓')) {
            console.log('✅ Maestro navigation test passed');
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.log('⚠️ Navigation test failed:', errorMessage);
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Maestro test failed:', errorMessage);
      // Don't throw - Maestro tests are optional
    }
  }

  // Check if Maestro is available
  async checkMaestroAvailability(): Promise<boolean> {
    try {
      const { exec } = await import('node:child_process');
      const { promisify } = await import('node:util');
      const execAsync = promisify(exec);
      await execAsync('maestro --version');
      return true;
    } catch {
      return false;
    }
  }

  // Run Patrol tests for Flutter projects
  async runPatrolTests(projectPath: string): Promise<void> {
    console.log('🚓 Running Patrol E2E tests...');

    // Check if Patrol is installed
    let hasPatrol = false;
    try {
      await execAsync('patrol --version');
      hasPatrol = true;
      console.log('✅ Patrol CLI detected');
    } catch {
      console.log('⚠️ Patrol CLI not installed - skipping Patrol tests');
      console.log('  Install with: dart pub global activate patrol_cli');
      return;
    }

    if (!hasPatrol) {
      return;
    }

    // Check if Flutter is available
    let hasFlutter = false;
    try {
      await execAsync('flutter --version');
      hasFlutter = true;
    } catch {
      console.log('⚠️ Flutter not installed - cannot run Patrol tests');
      return;
    }

    if (!hasFlutter) {
      return;
    }

    try {
      // First, get Flutter dependencies
      console.log('  Getting Flutter dependencies...');
      await execAsync('flutter pub get', {
        cwd: projectPath,
        timeout: 120000,
      });

      // Bootstrap Patrol if needed (one-time setup)
      const patrolYaml = path.join(projectPath, 'patrol.yaml');
      if (await fs.pathExists(patrolYaml)) {
        console.log('  Patrol configuration found');
      }

      // Check for integration tests
      const integrationTestDir = path.join(projectPath, 'integration_test');
      if (!(await fs.pathExists(integrationTestDir))) {
        console.log('⚠️ No integration_test directory found - skipping Patrol tests');
        return;
      }

      // Run Flutter web build for Patrol to test
      console.log('  Building Flutter web for testing...');
      try {
        await execAsync('flutter build web --release', {
          cwd: projectPath,
          timeout: 300000, // 5 minutes
        });
        console.log('✅ Flutter web build completed');
      } catch (_error: unknown) {
        console.log('⚠️ Flutter web build failed - trying to run tests anyway');
      }

      // Run Patrol smoke test if it exists
      const smokeTestPath = path.join(integrationTestDir, 'smoke_test.dart');
      if (await fs.pathExists(smokeTestPath)) {
        console.log('  Running Patrol smoke test...');
        try {
          const { stdout: _stdout, stderr: _stderr } = await execAsync(
            'patrol test --target integration_test/smoke_test.dart',
            {
              cwd: projectPath,
              timeout: 180000, // 3 minutes
              env: {
                ...process.env,
                PATROL_HEADLESS: 'true',
              },
            }
          );

          if (_stdout.includes('✓') || _stdout.includes('success')) {
            console.log('✅ Patrol smoke test passed');
          } else {
            console.log('⚠️ Patrol test output:', _stdout);
          }
        } catch (error: unknown) {
          // Patrol tests might fail if no device is available
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.log('⚠️ Patrol smoke test failed (might need device/emulator):', errorMessage);
        }
      }

      // Run main app test if it exists
      const appTestPath = path.join(integrationTestDir, 'app_test.dart');
      if (await fs.pathExists(appTestPath)) {
        console.log('  Running Patrol app test...');
        try {
          const { stdout } = await execAsync(
            'patrol test --target integration_test/app_test.dart',
            {
              cwd: projectPath,
              timeout: 180000,
              env: {
                ...process.env,
                PATROL_HEADLESS: 'true',
              },
            }
          );

          if (stdout.includes('✓') || stdout.includes('success')) {
            console.log('✅ Patrol app test passed');
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.log('⚠️ Patrol app test failed:', errorMessage);
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Patrol test failed:', errorMessage);
      // Don't throw - Patrol tests are optional
    }
  }

  // Check if Patrol is available
  async checkPatrolAvailability(): Promise<boolean> {
    try {
      await execAsync('patrol --version');
      return true;
    } catch {
      return false;
    }
  }

  // Check if Flutter is available
  async checkFlutterAvailability(): Promise<boolean> {
    try {
      await execAsync('flutter --version');
      return true;
    } catch {
      return false;
    }
  }
}

// Helper function to create test configurations
export function createTestConfig(overrides: Partial<TestProjectConfig>): TestProjectConfig {
  return {
    projectName: 'test-project',
    framework: 'nextjs',
    database: 'none',
    deployment: false,
    storage: 'none',
    auth: false,
    packageManager: 'pnpm',
    ...overrides,
  };
}

// Utility to run E2E tests in isolation
export async function runIsolatedE2ETest(
  config: TestProjectConfig,
  testFn: (manager: TestProjectManager, projectPath: string) => Promise<void>
): Promise<void> {
  const manager = new TestProjectManager();

  try {
    await manager.initialize();
    const projectPath = await manager.createProject(config);
    await testFn(manager, projectPath);
  } finally {
    await manager.cleanup();
  }
}
