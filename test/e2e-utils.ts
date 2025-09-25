import os from 'node:os';
import path from 'node:path';
import { execa } from 'execa';
import fs from 'fs-extra';
import type { ProjectConfig } from '../src/commands/create.js';

/**
 * E2E Test Utilities
 */

// Type for execa errors
interface ExecaError extends Error {
  stdout?: string;
  stderr?: string;
  exitCode?: number;
}

export interface E2ETestConfig extends ProjectConfig {
  skipInstall?: boolean;
  skipBuild?: boolean;
  timeout?: number;
}

export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

/**
 * Create a temporary test directory
 */
export async function createTestDirectory(prefix = 'fluorite-e2e-'): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

/**
 * Clean up test directory
 */
export async function cleanupTestDirectory(dirPath: string): Promise<void> {
  if (dirPath && (await fs.pathExists(dirPath))) {
    await fs.remove(dirPath);
  }
}

/**
 * Run a command in the project directory
 */
export async function runCommand(
  command: string,
  args: string[],
  cwd: string,
  timeout = 60000
): Promise<CommandResult> {
  const startTime = Date.now();

  try {
    const result = await execa(command, args, {
      cwd,
      timeout,
      reject: false,
    });

    return {
      success: result.exitCode === 0,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode || 0,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    const execaError = error as ExecaError;
    return {
      success: false,
      stdout: execaError.stdout || '',
      stderr: execaError.stderr || execaError.message,
      exitCode: execaError.exitCode || 1,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Run npm/pnpm/yarn/bun command
 */
export async function runPackageManagerCommand(
  packageManager: string,
  args: string[],
  cwd: string,
  timeout = 60000
): Promise<CommandResult> {
  return runCommand(packageManager, args, cwd, timeout);
}

/**
 * Verify project structure
 */
export async function verifyProjectStructure(
  projectPath: string,
  expectedFiles: string[]
): Promise<{ success: boolean; missing: string[] }> {
  const missing: string[] = [];

  for (const file of expectedFiles) {
    const fullPath = path.join(projectPath, file);
    if (!(await fs.pathExists(fullPath))) {
      missing.push(file);
    }
  }

  return {
    success: missing.length === 0,
    missing,
  };
}

/**
 * Verify package.json scripts
 */
export async function verifyPackageScripts(
  projectPath: string,
  expectedScripts: string[]
): Promise<{ success: boolean; missing: string[] }> {
  const packageJsonPath = path.join(projectPath, 'package.json');

  if (!(await fs.pathExists(packageJsonPath))) {
    return { success: false, missing: ['package.json not found'] };
  }

  const packageJson = await fs.readJSON(packageJsonPath);
  const scripts = packageJson.scripts || {};
  const missing: string[] = [];

  for (const script of expectedScripts) {
    if (!(script in scripts)) {
      missing.push(script);
    }
  }

  return {
    success: missing.length === 0,
    missing,
  };
}

/**
 * Test all scripts in sequence
 */
export async function testAllScripts(
  projectPath: string,
  packageManager: string,
  scripts: string[],
  timeout = 60000
): Promise<Map<string, CommandResult>> {
  const results = new Map<string, CommandResult>();

  for (const script of scripts) {
    const result = await runPackageManagerCommand(
      packageManager,
      ['run', script],
      projectPath,
      timeout
    );
    results.set(script, result);
  }

  return results;
}

/**
 * Create a file with issues for testing lint/format/check commands
 */
export async function createTestFileWithIssues(
  projectPath: string,
  filename: string,
  type: 'lint' | 'format' | 'both' = 'both'
): Promise<string> {
  const filePath = path.join(projectPath, 'src', filename);

  let content = '';

  if (type === 'lint' || type === 'both') {
    content += `
// Linting issues
const unused = 1;  // Unused variable
let reassigned = 5;
reassigned = 10;  // Should use const
`;
  }

  if (type === 'format' || type === 'both') {
    content += `
// Formatting issues
const badly    =    "formatted"  ;
console.log(   badly   )  ;
function  messy  (  )  {return    true}
`;
  }

  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content);

  return filePath;
}

/**
 * Verify build output exists
 */
export async function verifyBuildOutput(
  projectPath: string,
  framework: string
): Promise<{ success: boolean; missing: string[] }> {
  const missing: string[] = [];

  switch (framework) {
    case 'nextjs': {
      const nextBuildPath = path.join(projectPath, '.next');
      if (!(await fs.pathExists(nextBuildPath))) {
        missing.push('.next');
      }
      if (!(await fs.pathExists(path.join(nextBuildPath, 'static')))) {
        missing.push('.next/static');
      }
      if (!(await fs.pathExists(path.join(nextBuildPath, 'server')))) {
        missing.push('.next/server');
      }
      break;
    }
    case 'expo': {
      // Expo doesn't have traditional build output in the same way
      break;
    }
    case 'tauri': {
      const distPath = path.join(projectPath, 'dist');
      if (!(await fs.pathExists(distPath))) {
        missing.push('dist');
      }
      break;
    }
    case 'flutter': {
      const buildPath = path.join(projectPath, 'build');
      if (!(await fs.pathExists(buildPath))) {
        missing.push('build');
      }
      break;
    }
  }

  return {
    success: missing.length === 0,
    missing,
  };
}

/**
 * Wait for a process to be ready (useful for dev servers)
 */
export async function waitForReady(
  checkFn: () => Promise<boolean>,
  timeout = 30000,
  interval = 1000
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await checkFn()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  return false;
}

/**
 * Test configuration presets
 */
export const TEST_CONFIGS = {
  nextjs: {
    basic: {
      framework: 'nextjs' as const,
      database: 'none' as const,
      deployment: false,
      storage: 'none' as const,
      auth: false,
    },
    withTurso: {
      framework: 'nextjs' as const,
      database: 'turso' as const,
      orm: 'prisma' as const,
      deployment: false,
      storage: 'none' as const,
      auth: false,
    },
    withSupabase: {
      framework: 'nextjs' as const,
      database: 'supabase' as const,
      orm: 'prisma' as const,
      deployment: false,
      storage: 'none' as const,
      auth: false,
    },
    withVercel: {
      framework: 'nextjs' as const,
      database: 'none' as const,
      deployment: true,
      storage: 'vercel-blob' as const,
      auth: false,
    },
    full: {
      framework: 'nextjs' as const,
      database: 'turso' as const,
      orm: 'prisma' as const,
      deployment: true,
      storage: 'vercel-blob' as const,
      auth: true,
    },
  },
};

/**
 * Expected files for each configuration
 */
export const EXPECTED_FILES = {
  nextjs: {
    basic: [
      'package.json',
      'tsconfig.json',
      'next.config.mjs',
      'biome.json',
      '.gitignore',
      'src/app/page.tsx',
      'src/app/layout.tsx',
      'src/components/ui/button.tsx',
      'src/lib/utils.ts',
      'src/app/globals.css',
    ],
    withDatabase: ['prisma/schema.prisma', 'prisma/seed.ts', 'src/lib/db.ts'],
    withDeployment: ['vercel.json', 'scripts/setup-deployment.sh', 'scripts/destroy-deployment.sh'],
    withAuth: [
      'src/lib/auth.ts',
      'src/app/(auth)/sign-in/page.tsx',
      'src/app/(auth)/sign-up/page.tsx',
    ],
  },
};

/**
 * Expected scripts for each configuration
 */
export const EXPECTED_SCRIPTS = {
  nextjs: {
    basic: [
      'dev',
      'build',
      'start',
      'lint',
      'lint:fix',
      'format',
      'format:check',
      'check',
      'check:fix',
    ],
    withDatabase: ['db:generate', 'db:push', 'db:seed', 'db:studio'],
    withDeployment: [
      'deploy',
      'deploy:prod',
      'deploy:staging',
      'deploy:dev',
      'deploy:setup',
      'deploy:destroy',
    ],
  },
};
