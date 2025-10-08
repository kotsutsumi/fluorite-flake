// Storage debug route for development
// Lists all files in the local storage directory

import fs from 'node:fs/promises';
import path from 'node:path';
import { type NextRequest, NextResponse } from 'next/server';

const STORAGE_DIR = path.join(process.cwd(), '.storage');

export async function GET(_request: NextRequest) {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
            { error: 'Debug endpoint is not available in production' },
            { status: 404 }
        );
    }

    try {
        // Ensure storage directory exists
        try {
            await fs.access(STORAGE_DIR);
        } catch {
            await fs.mkdir(STORAGE_DIR, { recursive: true });
        }

        // List all files recursively
        const files = await listFiles(STORAGE_DIR);
        const storageInfo = await Promise.all(
            files.map(async (file) => {
                const stats = await fs.stat(file);
                const relativePath = path.relative(STORAGE_DIR, file);
                return {
                    path: relativePath,
                    url: `/api/storage/${relativePath}`,
                    size: stats.size,
                    sizeFormatted: formatBytes(stats.size),
                    modified: stats.mtime.toISOString(),
                    created: stats.birthtime.toISOString(),
                };
            })
        );

        // Calculate total size
        const totalSize = storageInfo.reduce((sum, file) => sum + file.size, 0);

        return NextResponse.json({
            storageDir: STORAGE_DIR,
            environment: process.env.NODE_ENV,
            totalFiles: storageInfo.length,
            totalSize: totalSize,
            totalSizeFormatted: formatBytes(totalSize),
            files: storageInfo.sort((a, b) => b.modified.localeCompare(a.modified)),
        });
    } catch (error) {
        console.error('Storage debug error:', error);
        return NextResponse.json(
            { error: 'Failed to read storage directory', details: (error as Error).message },
            { status: 500 }
        );
    }
}

async function listFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await listFiles(fullPath)));
        } else if (entry.isFile() && entry.name !== '.gitkeep') {
            files.push(fullPath);
        }
    }

    return files;
}

function formatBytes(bytes: number): string {
    if (bytes === 0) {
        return '0 B';
    }
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}
