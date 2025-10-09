// Storage API catch-all route for local development
// Serves files from the .storage directory during local development

import fs from 'node:fs/promises';
import path from 'node:path';
import { type NextRequest, NextResponse } from 'next/server';

const STORAGE_DIR = path.join(process.cwd(), '.storage');

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ path?: string[] }> }
) {
    const resolvedParams = await params;
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
            { error: 'Storage API is not available in production' },
            { status: 404 }
        );
    }

    const pathSegments = resolvedParams?.path ?? [];
    // パスセグメントが指定されていない場合は即座にエラーを返す
    if (pathSegments.length === 0) {
        return NextResponse.json({ error: 'Path segment is required' }, { status: 400 });
    }

    const pathname = pathSegments.join('/');
    const filepath = path.join(STORAGE_DIR, pathname);

    try {
        // Security: Prevent path traversal
        const normalizedPath = path.normalize(filepath);
        if (!normalizedPath.startsWith(STORAGE_DIR)) {
            return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
        }

        // Read file
        const buffer = await fs.readFile(filepath);
        const stats = await fs.stat(filepath);

        // Determine content type based on extension
        const ext = path.extname(filepath).toLowerCase();
        const contentTypes: Record<string, string> = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
            '.pdf': 'application/pdf',
            '.json': 'application/json',
            '.txt': 'text/plain',
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.mp4': 'video/mp4',
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
        };

        const contentType = contentTypes[ext] || 'application/octet-stream';

        // Return file with proper headers
        return new NextResponse(new Uint8Array(buffer), {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Length': stats.size.toString(),
                'Cache-Control': 'public, max-age=3600',
                'Last-Modified': stats.mtime.toUTCString(),
            },
        });
    } catch (error: unknown) {
        if (
            error instanceof Error &&
            'code' in error &&
            (error as NodeJS.ErrnoException).code === 'ENOENT'
        ) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        console.error('Storage API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ path?: string[] }> }
) {
    const resolvedParams = await params;
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
            { error: 'Storage API is not available in production' },
            { status: 404 }
        );
    }

    const pathSegments = resolvedParams?.path ?? [];
    // パスセグメントが無い削除リクエストは危険なため拒否する
    if (pathSegments.length === 0) {
        return NextResponse.json({ error: 'Path segment is required' }, { status: 400 });
    }

    const pathname = pathSegments.join('/');
    const filepath = path.join(STORAGE_DIR, pathname);

    try {
        // Security: Prevent path traversal
        const normalizedPath = path.normalize(filepath);
        if (!normalizedPath.startsWith(STORAGE_DIR)) {
            return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
        }

        // Delete file
        await fs.unlink(filepath);

        return NextResponse.json({ message: 'File deleted successfully' }, { status: 200 });
    } catch (error: unknown) {
        if (
            error instanceof Error &&
            'code' in error &&
            (error as NodeJS.ErrnoException).code === 'ENOENT'
        ) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        console.error('Storage API delete error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
