import path from 'node:path';
import { execa } from 'execa';
import fs from 'fs-extra';

export async function downloadAndExtract(url: string, destination: string) {
    // Create temporary directory
    const tempDir = path.join(destination, '.temp');
    await fs.ensureDir(tempDir);

    try {
        // Download file using curl
        const fileName = 'download.tar.gz';
        const filePath = path.join(tempDir, fileName);

        await execa('curl', ['-L', '-o', filePath, url], {
            stdio: 'pipe',
        });

        // Extract tar.gz
        await execa('tar', ['-xzf', filePath, '-C', destination], {
            stdio: 'pipe',
        });

        // Cleanup temp directory
        await fs.remove(tempDir);
    } catch (error) {
        // Cleanup on error
        await fs.remove(tempDir);
        throw error;
    }
}

export async function downloadFile(url: string, destination: string) {
    await execa('curl', ['-L', '-o', destination, url], {
        stdio: 'pipe',
    });
}

export async function cloneRepository(repoUrl: string, destination: string) {
    await execa('git', ['clone', '--depth', '1', repoUrl, destination], {
        stdio: 'pipe',
    });

    // Remove .git directory
    await fs.remove(path.join(destination, '.git'));
}
