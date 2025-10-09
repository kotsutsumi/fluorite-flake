// Local storage emulation for development
// This file provides local file system storage for development environments

import crypto from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

const STORAGE_DIR = path.join(process.cwd(), '.storage');

type LocalBlob = {
    url: string;
    pathname: string;
    size: number;
    uploadedAt: Date;
};

// Ensure storage directory exists
async function ensureStorageDir() {
    try {
        await fs.access(STORAGE_DIR);
    } catch {
        await fs.mkdir(STORAGE_DIR, { recursive: true });
    }
}

export async function uploadLocal(file: File | Buffer, options?: { pathname?: string }) {
    await ensureStorageDir();

    // Generate unique filename if not provided
    const filename = options?.pathname || `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    const filepath = path.join(STORAGE_DIR, filename);

    // Ensure subdirectories exist
    await fs.mkdir(path.dirname(filepath), { recursive: true });

    // Write file to local storage
    if (file instanceof File) {
        const buffer = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(filepath, buffer);
    } else {
        await fs.writeFile(filepath, file);
    }

    return {
        url: `/api/storage/${filename}`,
        pathname: filename,
        contentType: file instanceof File ? file.type : 'application/octet-stream',
        size: file instanceof File ? file.size : file.length,
    };
}

export async function getLocal(pathname: string) {
    const filepath = path.join(STORAGE_DIR, pathname);

    try {
        const stats = await fs.stat(filepath);
        const buffer = await fs.readFile(filepath);

        return {
            url: `/api/storage/${pathname}`,
            pathname,
            size: stats.size,
            uploadedAt: stats.mtime,
            buffer,
        };
    } catch (error) {
        if (
            error instanceof Error &&
            'code' in error &&
            (error as NodeJS.ErrnoException).code === 'ENOENT'
        ) {
            throw new Error('File not found');
        }
        throw error;
    }
}

export async function deleteLocal(pathname: string) {
    const filepath = path.join(STORAGE_DIR, pathname);

    try {
        await fs.unlink(filepath);
        return true;
    } catch (error) {
        if (
            error instanceof Error &&
            'code' in error &&
            (error as NodeJS.ErrnoException).code === 'ENOENT'
        ) {
            return false;
        }
        throw error;
    }
}

export async function listLocal(options?: { prefix?: string; limit?: number }) {
    await ensureStorageDir();

    const files = await fs.readdir(STORAGE_DIR, { recursive: true, withFileTypes: true });
    const blobs: LocalBlob[] = [];

    for (const file of files) {
        if (file.isFile()) {
            const pathname = path.relative(
                STORAGE_DIR,
                path.join(file.parentPath ?? STORAGE_DIR, file.name)
            );

            // Apply prefix filter if specified
            if (options?.prefix && !pathname.startsWith(options.prefix)) {
                continue;
            }

            const filepath = path.join(STORAGE_DIR, pathname);
            const stats = await fs.stat(filepath);

            blobs.push({
                url: `/api/storage/${pathname}`,
                pathname,
                size: stats.size,
                uploadedAt: stats.mtime,
            });

            // Apply limit if specified
            if (options?.limit && blobs.length >= options.limit) {
                break;
            }
        }
    }

    return { blobs };
}

export async function copyLocal(from: string, to: string) {
    const fromPath = path.join(STORAGE_DIR, from);
    const toPath = path.join(STORAGE_DIR, to);

    // Ensure destination directory exists
    await fs.mkdir(path.dirname(toPath), { recursive: true });

    // Copy file
    await fs.copyFile(fromPath, toPath);

    const stats = await fs.stat(toPath);
    return {
        url: `/api/storage/${to}`,
        pathname: to,
        size: stats.size,
        uploadedAt: stats.mtime,
    };
}

// Stream support for large files
export function createReadStreamLocal(pathname: string) {
    const filepath = path.join(STORAGE_DIR, pathname);
    return createReadStream(filepath);
}

export function createWriteStreamLocal(pathname: string) {
    const filepath = path.join(STORAGE_DIR, pathname);
    return createWriteStream(filepath);
}
