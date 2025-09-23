import { exec } from 'node:child_process';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';
import type { FullConfig } from '@playwright/test';
import * as fs from 'fs-extra';

const execAsync = promisify(exec);

async function globalTeardown(_config: FullConfig) {
  console.log('\n🏁 Starting global E2E test teardown...');

  // Kill any remaining test processes
  console.log('🔍 Checking for lingering test processes...');
  try {
    // Kill any remaining Node.js dev servers
    if (process.platform === 'darwin' || process.platform === 'linux') {
      // Find processes listening on typical test ports (3000-4000)
      const { stdout } = await execAsync(
        "lsof -i :3000-4000 | grep LISTEN | awk '{print $2}' | uniq"
      );
      const pids = stdout.trim().split('\n').filter(Boolean);

      for (const pid of pids) {
        try {
          process.kill(Number.parseInt(pid), 'SIGTERM');
          console.log(`  Killed process ${pid}`);
        } catch (_error) {
          // Process may have already exited
        }
      }
    }

    // Kill any Expo processes
    try {
      await execAsync('pkill -f "expo start" || true');
      await execAsync('pkill -f "react-native" || true');
    } catch (_error) {
      // Ignore if no processes found
    }

    // Kill any Flutter processes
    try {
      await execAsync('pkill -f "flutter run" || true');
      await execAsync('pkill -f "dart" || true');
    } catch (_error) {
      // Ignore if no processes found
    }

    // Kill any Tauri processes
    try {
      await execAsync('pkill -f "tauri dev" || true');
      await execAsync('pkill -f "cargo" || true');
    } catch (_error) {
      // Ignore if no processes found
    }
  } catch (_error) {
    console.log('  No lingering processes found');
  }

  // Clean up test directories if not in CI (CI handles its own cleanup)
  if (!process.env.CI && !process.env.KEEP_TEST_ARTIFACTS) {
    console.log('🧹 Cleaning up test directories...');

    const tempRoot = process.env.FLUORITE_E2E_TEMP_ROOT;
    if (tempRoot && (await fs.pathExists(tempRoot))) {
      try {
        await fs.remove(tempRoot);
        console.log(`  Removed global temp root: ${tempRoot}`);
      } catch (error) {
        console.log(`  Failed to remove global temp root: ${error}`);
      }
    }

    // Clean up any other test directories
    const tempDirs = await fs.readdir(os.tmpdir());
    const fluoriteTestDirs = tempDirs.filter(
      (dir) => dir.startsWith('fluorite-e2e-') || dir.startsWith('fluorite-test-')
    );

    for (const dir of fluoriteTestDirs) {
      const fullPath = path.join(os.tmpdir(), dir);
      try {
        await fs.remove(fullPath);
        console.log(`  Removed: ${dir}`);
      } catch (_error) {
        console.log(`  Failed to remove: ${dir}`);
      }
    }
  } else if (process.env.KEEP_TEST_ARTIFACTS) {
    console.log('ℹ️  Keeping test artifacts as requested');
  }

  // Reset environment variables
  process.env.FLUORITE_E2E_TEMP_ROOT = undefined;
  process.env.FLUORITE_TEST_MODE = undefined;
  process.env.HAS_MAESTRO = undefined;
  process.env.HAS_FLUTTER = undefined;

  console.log('✅ Global teardown complete!\n');
}

export default globalTeardown;
