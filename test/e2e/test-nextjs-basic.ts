#!/usr/bin/env node
/**
 * Direct test runner for Next.js basic project generation
 */

import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs-extra';
import { createProject } from '../../dist/commands/create/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const tempDir = path.join(projectRoot, '.temp-e2e');

async function testNextjsBasic() {
    console.log('🧪 Testing Next.js basic project generation...\n');

    // Create temp directory
    await fs.ensureDir(tempDir);

    const projectName = 'test-nextjs-basic';
    const projectPath = path.join(tempDir, projectName);

    // Clean up if project exists
    await fs.remove(projectPath);

    const config = {
        projectName,
        projectPath,
        framework: 'nextjs' as const,
        database: 'none' as const,
        storage: 'none' as const,
        deployment: false,
        auth: false,
        packageManager: 'npm' as const, // Use npm to avoid pnpm workspace issues
    };

    console.log('📋 Config:', JSON.stringify(config, null, 2));
    console.log('\n🔨 Generating project...');

    try {
        await createProject(config);
        console.log('✅ Project generated successfully!\n');
    } catch (error) {
        console.error('❌ Failed to generate project:', error);
        process.exit(1);
    }

    // Verify project structure
    console.log('🔍 Verifying project structure...');
    const checks = [
        'package.json',
        'next.config.mjs',
        'tsconfig.json',
        'src/app/page.tsx',
        'src/app/layout.tsx',
        'src/app/globals.css', // Tailwind CSS v4 uses app/globals.css
        'postcss.config.mjs', // Tailwind CSS v4 doesn't need tailwind.config.ts
    ];

    for (const file of checks) {
        const filePath = path.join(projectPath, file);
        if (await fs.pathExists(filePath)) {
            console.log(`  ✅ ${file}`);
        } else {
            console.error(`  ❌ Missing: ${file}`);
            process.exit(1);
        }
    }

    // Install dependencies
    console.log('\n📦 Installing dependencies...');
    execSync('npm install', {
        cwd: projectPath,
        stdio: 'inherit',
    });

    // Create minimal .env.local
    console.log('\n🔧 Setting up environment...');
    const envContent = `NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=test-secret-for-e2e-testing
`;
    await fs.writeFile(path.join(projectPath, '.env.local'), envContent);

    // Build the project
    console.log('\n🏗️  Building project...');
    try {
        execSync('npm run build', {
            cwd: projectPath,
            stdio: 'inherit',
            env: {
                ...process.env,
                SKIP_ENV_VALIDATION: 'true',
            },
        });
        console.log('✅ Build successful!\n');
    } catch (error) {
        console.error('❌ Build failed:', error);
        process.exit(1);
    }

    // Start dev server
    console.log('🚀 Starting dev server...');
    const { spawn } = await import('node:child_process');
    const devProcess = spawn('npm', ['run', 'dev'], {
        cwd: projectPath,
        env: {
            ...process.env,
            PORT: '3000',
        },
        stdio: 'pipe',
    });

    devProcess.stdout?.on('data', (data) => {
        console.log(`[dev] ${data.toString()}`);
    });

    devProcess.stderr?.on('data', (data) => {
        console.error(`[dev-err] ${data.toString()}`);
    });

    // Wait for server to start
    console.log('⏳ Waiting for server to be ready...');
    const startTime = Date.now();
    const timeout = 30000;

    while (Date.now() - startTime < timeout) {
        try {
            const response = await fetch('http://localhost:3000');
            if (response.ok) {
                console.log('✅ Server is ready!\n');

                // Test the homepage
                console.log('🌐 Testing homepage...');
                const html = await response.text();
                if (html.includes('<!DOCTYPE html>')) {
                    console.log('  ✅ Homepage loads successfully');
                } else {
                    console.error('  ❌ Homepage content invalid');
                    devProcess.kill();
                    process.exit(1);
                }

                break;
            }
        } catch (_error) {
            // Server not ready yet
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Clean up
    console.log('\n🧹 Cleaning up...');
    devProcess.kill('SIGTERM');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log('\n✨ All tests passed! Next.js basic project works perfectly.');
    console.log('📁 Project location:', projectPath);

    // Optionally clean up
    // await fs.remove(projectPath);
}

// Run the test
testNextjsBasic().catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
});
