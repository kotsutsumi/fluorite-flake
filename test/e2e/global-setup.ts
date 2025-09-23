import { promises as fsPromises } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { type FullConfig, chromium } from '@playwright/test';
import * as fs from 'fs-extra';

async function globalSetup(_config: FullConfig) {
  console.log('🚀 Starting global E2E test setup...');

  // Create a persistent temp directory for all E2E tests
  const tempRoot = path.join(os.tmpdir(), 'fluorite-e2e-global');
  await fs.ensureDir(tempRoot);

  // Store temp directory path in environment variable
  process.env.FLUORITE_E2E_TEMP_ROOT = tempRoot;

  // Pre-download browsers if needed
  if (!process.env.CI) {
    console.log('📦 Ensuring Playwright browsers are installed...');
    const browser = await chromium.launch();
    await browser.close();
  }

  // Check for required tools
  const requiredTools = [
    { name: 'Node.js', command: 'node --version', minVersion: '18.0.0' },
    { name: 'pnpm', command: 'pnpm --version', optional: false },
  ];

  // Optional tools for mobile testing
  const optionalTools = [
    { name: 'Maestro', command: 'maestro --version', forFramework: 'expo' },
    { name: 'Flutter', command: 'flutter --version', forFramework: 'flutter' },
  ];

  console.log('🔍 Checking required tools...');
  for (const tool of requiredTools) {
    try {
      const { execSync } = await import('node:child_process');
      const version = execSync(tool.command, { encoding: 'utf8' }).trim();
      console.log(`✅ ${tool.name}: ${version}`);
    } catch (_error) {
      if (!tool.optional) {
        console.error(`❌ ${tool.name} is required but not installed`);
        throw new Error(`Missing required tool: ${tool.name}`);
      }
    }
  }

  console.log('🔍 Checking optional tools...');
  for (const tool of optionalTools) {
    try {
      const { execSync } = await import('node:child_process');
      const version = execSync(tool.command, { encoding: 'utf8' }).trim();
      console.log(`✅ ${tool.name}: ${version} (will enable ${tool.forFramework} mobile testing)`);
      process.env[`HAS_${tool.name.toUpperCase()}`] = 'true';
    } catch (_error) {
      console.log(`⚠️  ${tool.name}: Not installed (${tool.forFramework} mobile testing disabled)`);
      process.env[`HAS_${tool.name.toUpperCase()}`] = 'false';
    }
  }

  // Set up test environment variables
  process.env.FLUORITE_TEST_MODE = 'e2e';
  process.env.NODE_ENV = 'test';

  // Clean up any leftover test directories from previous runs
  console.log('🧹 Cleaning up previous test artifacts...');
  const tempDirs = await fsPromises.readdir(os.tmpdir());
  const fluoriteTestDirs = tempDirs.filter(
    (dir) => dir.startsWith('fluorite-e2e-') || dir.startsWith('fluorite-test-')
  );

  for (const dir of fluoriteTestDirs) {
    const fullPath = path.join(os.tmpdir(), dir);
    try {
      // Skip the current global temp root
      if (fullPath !== tempRoot) {
        await fs.remove(fullPath);
        console.log(`  Removed: ${dir}`);
      }
    } catch (_error) {
      console.log(`  Failed to remove: ${dir} (may be in use)`);
    }
  }

  console.log('✅ Global setup complete!');
  console.log(`📁 Test temp root: ${tempRoot}`);
  console.log('');
}

export default globalSetup;
