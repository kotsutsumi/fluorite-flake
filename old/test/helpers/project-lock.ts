/**
 * Cross-process semaphore for preventing concurrent project generation.
 * Uses filesystem as a coordination mechanism to ensure only one project
 * is generated at a time across all test processes.
 */
import { promisify } from 'node:util';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';

const LOCK_DIR = path.join(os.tmpdir(), 'fluorite-project-locks');
const LOCK_FILE = path.join(LOCK_DIR, 'generation.lock');
const MAX_WAIT_TIME = 120000; // 2 minutes maximum wait
const POLL_INTERVAL = 100; // Check every 100ms
const STALE_LOCK_THRESHOLD = 180000; // 3 minutes before considering lock stale

const sleep = promisify(setTimeout);

interface LockInfo {
    pid: number;
    timestamp: number;
    hostname: string;
}

/**
 * Acquire a global project generation lock.
 * This ensures only one project can be generated at a time across all processes.
 */
export async function acquireProjectLock(): Promise<void> {
    await fs.ensureDir(LOCK_DIR);

    const startTime = Date.now();
    const currentPid = process.pid;
    const hostname = os.hostname();

    while (Date.now() - startTime < MAX_WAIT_TIME) {
        try {
            // Try to acquire the lock
            const lockInfo: LockInfo = {
                pid: currentPid,
                timestamp: Date.now(),
                hostname,
            };

            // Atomic write with exclusive flag
            await fs.writeFile(LOCK_FILE, JSON.stringify(lockInfo), { flag: 'wx' });

            // Successfully acquired lock
            console.log(`🔒 Project generation lock acquired by PID ${currentPid}`);
            return;
            // biome-ignore lint/suspicious/noExplicitAny: Node.js error types are loosely typed
        } catch (error: any) {
            if (error.code === 'EEXIST') {
                // Lock exists, check if it's stale
                try {
                    const lockContent = await fs.readFile(LOCK_FILE, 'utf8');
                    const lockInfo: LockInfo = JSON.parse(lockContent);

                    // Check if lock is stale
                    if (Date.now() - lockInfo.timestamp > STALE_LOCK_THRESHOLD) {
                        console.log(
                            `🔓 Removing stale lock from PID ${lockInfo.pid} (${lockInfo.hostname})`
                        );
                        await fs.remove(LOCK_FILE);
                        continue; // Try to acquire again
                    }

                    // Lock is valid, wait and retry
                    await sleep(POLL_INTERVAL);
                } catch (_parseError) {
                    // Invalid lock file, remove it
                    console.log('🔓 Removing corrupt lock file');
                    await fs.remove(LOCK_FILE);
                }
            } else {
                throw error;
            }
        }
    }

    throw new Error(`Failed to acquire project generation lock within ${MAX_WAIT_TIME}ms`);
}

/**
 * Release the global project generation lock.
 */
export async function releaseProjectLock(): Promise<void> {
    try {
        // Verify we own the lock before releasing
        if (await fs.pathExists(LOCK_FILE)) {
            const lockContent = await fs.readFile(LOCK_FILE, 'utf8');
            const lockInfo: LockInfo = JSON.parse(lockContent);

            if (lockInfo.pid === process.pid) {
                await fs.remove(LOCK_FILE);
                console.log(`🔓 Project generation lock released by PID ${process.pid}`);
            } else {
                console.warn(`⚠️  Attempted to release lock owned by PID ${lockInfo.pid}`);
            }
        }
    } catch (error) {
        console.warn('⚠️  Error releasing project lock:', error);
    }
}

/**
 * Execute a function with the project generation lock.
 * Automatically acquires and releases the lock.
 */
export async function withProjectLock<T>(fn: () => Promise<T>): Promise<T> {
    await acquireProjectLock();
    try {
        return await fn();
    } finally {
        await releaseProjectLock();
    }
}
