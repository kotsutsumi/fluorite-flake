/**
 * IPC Integration module
 *
 * Connects the IPC server with existing CLI functionality
 */

import { createIPCServer, type IPCServer } from './ipc-server.js';
import { createWranglerDashboard } from '../utils/wrangler-dashboard.js';
import { createProject } from '../commands/create/index.js';
import type { ProjectConfig } from '../commands/create/types.js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Setup IPC server with all method handlers
 */
export function setupIPCServer(options?: {
    port?: number;
    socketPath?: string;
    authToken?: string;
}): IPCServer {
    const server = createIPCServer(options);
    const dashboard = createWranglerDashboard();

    // Dashboard methods
    server.registerMethod('dashboard.getData', async () => {
        return await dashboard.getDashboardData();
    });

    server.registerMethod('dashboard.deployWorker', async (params) => {
        return await dashboard.deployWorker({
            name: params?.name,
            env: params?.env,
            dryRun: params?.dryRun,
        });
    });

    server.registerMethod('dashboard.listR2Buckets', async () => {
        return await dashboard.listR2Buckets();
    });

    server.registerMethod('dashboard.createR2Bucket', async (params) => {
        if (!params?.name) {
            throw new Error('Bucket name is required');
        }
        return await dashboard.createR2Bucket(params.name);
    });

    server.registerMethod('dashboard.deleteR2Bucket', async (params) => {
        if (!params?.name) {
            throw new Error('Bucket name is required');
        }
        return await dashboard.deleteR2Bucket(params.name);
    });

    server.registerMethod('dashboard.tailLogs', async function* (params) {
        const logStream = await dashboard.tailLogs(params?.workerName, {
            format: params?.format,
        });

        for await (const log of logStream) {
            yield log;
        }
    });

    // Project creation methods
    server.registerMethod('project.create', async (params) => {
        if (!params?.framework || !params?.name || !params?.path) {
            throw new Error('Framework, name, and path are required');
        }

        const config: ProjectConfig = {
            framework: params.framework as ProjectConfig['framework'],
            projectName: params.name,
            projectPath: params.path,
            database: (params.database || 'none') as ProjectConfig['database'],
            orm: params.orm as ProjectConfig['orm'],
            storage: (params.storage || 'none') as ProjectConfig['storage'],
            auth: params.auth ?? false,
            deployment: params.deployment ?? false,
            packageManager: (params.packageManager || 'npm') as ProjectConfig['packageManager'],
            mode: 'full',
        };

        try {
            await createProject(config);
            return { success: true, projectPath: config.projectPath };
        } catch (error) {
            throw new Error(`Project creation failed: ${(error as Error).message}`);
        }
    });

    // System methods
    server.registerMethod('system.ping', async () => {
        return { pong: true, timestamp: Date.now() };
    });

    server.registerMethod('system.version', async () => {
        const packageJson = JSON.parse(
            readFileSync(join(__dirname, '../../package.json'), 'utf-8')
        );
        return {
            version: packageJson.version,
            node: process.version,
        };
    });

    server.registerMethod('system.shutdown', async () => {
        setTimeout(() => {
            server.stop();
            process.exit(0);
        }, 100);
        return { success: true };
    });

    return server;
}

/**
 * Start IPC server as a daemon
 */
export async function startIPCDaemon(options?: {
    port?: number;
    socketPath?: string;
    authToken?: string;
    verbose?: boolean;
}): Promise<void> {
    const server = setupIPCServer(options);

    server.on('listening', (info) => {
        if (options?.verbose) {
            console.log('IPC Server listening:', info);
        }
        // Write connection info to stdout for clients
        console.log(
            JSON.stringify({
                type: 'ipc-server-ready',
                ...info,
            })
        );
    });

    server.on('connection', () => {
        if (options?.verbose) {
            console.log('Client connected');
        }
    });

    server.on('disconnection', () => {
        if (options?.verbose) {
            console.log('Client disconnected');
        }
    });

    server.on('error', (error) => {
        console.error('IPC Server error:', error);
    });

    try {
        await server.start();

        // Handle shutdown signals
        process.on('SIGINT', async () => {
            await server.stop();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            await server.stop();
            process.exit(0);
        });
    } catch (error) {
        console.error('Failed to start IPC server:', error);
        process.exit(1);
    }
}
