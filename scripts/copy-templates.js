#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const srcTemplates = path.join(rootDir, 'src', 'templates');
const distTemplates = path.join(rootDir, 'dist', 'templates');

async function copyTemplates() {
    try {
        console.log('Copying template files...');

        // Ensure dist/templates directory exists
        await fs.ensureDir(distTemplates);

        // Copy all template directories and files
        const templateDirs = await fs.readdir(srcTemplates);

        for (const dir of templateDirs) {
            const srcPath = path.join(srcTemplates, dir);
            const distPath = path.join(distTemplates, dir);

            // Copy the entire directory
            await fs.copy(srcPath, distPath, {
                overwrite: true,
                filter: (_src) => {
                    // Include all files including .template files
                    return true;
                },
            });
        }

        console.log('✅ Template files copied successfully');
    } catch (error) {
        console.error('Error copying template files:', error);
        process.exit(1);
    }
}

copyTemplates();
