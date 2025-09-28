/**
 * Tauri Sidecar Integration
 *
 * Provides a bridge between Tauri desktop applications and the
 * Fluorite Flake CLI for Cloudflare Workers management.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { createIPCClient, type IPCClient } from '../ipc/ipc-client.js';

/**
 * Sidecar configuration options
 */
export interface SidecarOptions {
    /** Path to the fluorite-flake CLI binary */
    cliPath?: string;
    /** IPC server port */
    ipcPort?: number;
    /** IPC server host */
    ipcHost?: string;
    /** Authentication token for IPC */
    authToken?: string;
    /** Enable debug output */
    debug?: boolean;
    /** Auto-restart on crash */
    autoRestart?: boolean;
    /** Restart delay in milliseconds */
    restartDelay?: number;
}

/**
 * Sidecar process states
 */
export enum SidecarState {
    IDLE = 'idle',
    STARTING = 'starting',
    RUNNING = 'running',
    STOPPING = 'stopping',
    STOPPED = 'stopped',
    ERROR = 'error',
    RESTARTING = 'restarting',
}

/**
 * Tauri Sidecar Manager
 *
 * Manages the lifecycle of the Fluorite Flake CLI sidecar process
 * and provides a high-level API for Tauri applications.
 */
export class TauriSidecar extends EventEmitter {
    private process: ChildProcess | null = null;
    private ipcClient: IPCClient | null = null;
    private state: SidecarState = SidecarState.IDLE;
    private restartTimer?: NodeJS.Timeout;
    private restartCount = 0;
    private maxRestarts = 5;

    constructor(private options: SidecarOptions = {}) {
        super();
        this.options = {
            cliPath: options.cliPath || 'fluorite-flake',
            ipcPort: options.ipcPort || 9123,
            ipcHost: options.ipcHost || '127.0.0.1',
            debug: options.debug || false,
            autoRestart: options.autoRestart || true,
            restartDelay: options.restartDelay || 5000,
            ...options,
        };
    }

    /**
     * Start the sidecar process
     */
    async start(): Promise<void> {
        if (this.state === SidecarState.RUNNING) {
            return;
        }

        this.setState(SidecarState.STARTING);

        try {
            // Start the IPC server process
            await this.startIPCServer();

            // Connect to the IPC server
            await this.connectToIPC();

            this.setState(SidecarState.RUNNING);
            this.restartCount = 0;
            this.emit('started');
        } catch (error) {
            this.setState(SidecarState.ERROR);
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * Stop the sidecar process
     */
    async stop(): Promise<void> {
        if (this.state === SidecarState.STOPPED || this.state === SidecarState.IDLE) {
            return;
        }

        this.setState(SidecarState.STOPPING);

        // Clear restart timer
        if (this.restartTimer) {
            clearTimeout(this.restartTimer);
            this.restartTimer = undefined;
        }

        // Disconnect IPC client
        if (this.ipcClient) {
            this.ipcClient.disconnect();
            this.ipcClient = null;
        }

        // Kill the process
        if (this.process) {
            this.process.kill('SIGTERM');
            await new Promise<void>((resolve) => {
                const timeout = setTimeout(() => {
                    this.process?.kill('SIGKILL');
                    resolve();
                }, 5000);

                this.process?.once('exit', () => {
                    clearTimeout(timeout);
                    resolve();
                });
            });
            this.process = null;
        }

        this.setState(SidecarState.STOPPED);
        this.emit('stopped');
    }

    /**
     * Restart the sidecar process
     */
    async restart(): Promise<void> {
        await this.stop();
        await this.start();
    }

    /**
     * Start the IPC server process
     */
    private async startIPCServer(): Promise<void> {
        const args = [
            'ipc',
            '--port',
            (this.options.ipcPort || 9123).toString(),
            '--host',
            this.options.ipcHost || '127.0.0.1',
        ];

        if (this.options.authToken) {
            args.push('--token', this.options.authToken);
        }

        if (this.options.debug) {
            args.push('--verbose');
        }

        this.process = spawn(this.options.cliPath || 'fluorite-flake', args, {
            stdio: this.options.debug ? 'inherit' : 'ignore',
            detached: false,
        });

        this.process.on('error', (error) => {
            this.emit('process-error', error);
            this.handleProcessError(error);
        });

        this.process.on('exit', (code, signal) => {
            this.emit('process-exit', { code, signal });
            this.handleProcessExit(code, signal);
        });

        // Wait for the server to be ready
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('IPC server startup timeout'));
            }, 10000);

            const checkServer = async () => {
                try {
                    const testClient = createIPCClient({
                        port: this.options.ipcPort,
                        host: this.options.ipcHost,
                        authToken: this.options.authToken,
                    });

                    await testClient.connect();
                    testClient.disconnect();
                    clearTimeout(timeout);
                    resolve();
                } catch {
                    setTimeout(checkServer, 500);
                }
            };

            setTimeout(checkServer, 1000);
        });
    }

    /**
     * Connect to the IPC server
     */
    private async connectToIPC(): Promise<void> {
        this.ipcClient = createIPCClient({
            port: this.options.ipcPort,
            host: this.options.ipcHost,
            authToken: this.options.authToken,
            reconnect: true,
            reconnectInterval: 5000,
        });

        await this.ipcClient.connect();

        this.ipcClient.on('disconnected', () => {
            this.emit('ipc-disconnected');
        });

        this.ipcClient.on('connected', () => {
            this.emit('ipc-connected');
        });

        this.ipcClient.on('error', (error) => {
            this.emit('ipc-error', error);
        });
    }

    /**
     * Handle process errors
     */
    private handleProcessError(error: Error): void {
        if (this.options.debug) {
            console.error('[Sidecar] Process error:', error);
        }

        if (this.options.autoRestart && this.restartCount < this.maxRestarts) {
            this.scheduleRestart();
        } else {
            this.setState(SidecarState.ERROR);
        }
    }

    /**
     * Handle process exit
     */
    private handleProcessExit(code: number | null, signal: string | null): void {
        if (this.options.debug) {
            console.log(`[Sidecar] Process exited with code ${code}, signal ${signal}`);
        }

        if (this.state === SidecarState.STOPPING) {
            return; // Expected exit
        }

        if (this.options.autoRestart && this.restartCount < this.maxRestarts) {
            this.scheduleRestart();
        } else if (this.restartCount >= this.maxRestarts) {
            this.setState(SidecarState.ERROR);
            this.emit('max-restarts-reached', this.restartCount);
        }
    }

    /**
     * Schedule a restart
     */
    private scheduleRestart(): void {
        this.setState(SidecarState.RESTARTING);
        this.restartCount++;

        this.restartTimer = setTimeout(async () => {
            try {
                await this.start();
            } catch (error) {
                this.emit('restart-failed', error);
            }
        }, this.options.restartDelay);
    }

    /**
     * Set the sidecar state
     */
    private setState(state: SidecarState): void {
        const oldState = this.state;
        this.state = state;
        this.emit('state-change', { from: oldState, to: state });
    }

    /**
     * Get the current state
     */
    getState(): SidecarState {
        return this.state;
    }

    /**
     * Check if the sidecar is running
     */
    isRunning(): boolean {
        return this.state === SidecarState.RUNNING;
    }

    /**
     * Get the IPC client
     */
    getIPCClient(): IPCClient | null {
        return this.ipcClient;
    }

    /**
     * Call an IPC method
     */
    async call<T = unknown>(method: string, params?: unknown): Promise<T> {
        if (!this.ipcClient) {
            throw new Error('IPC client not connected');
        }
        return this.ipcClient.call(method as never, params as never) as T;
    }
}

/**
 * Create a new Tauri sidecar instance
 */
export function createTauriSidecar(options?: SidecarOptions): TauriSidecar {
    return new TauriSidecar(options);
}

/**
 * Tauri command bindings
 *
 * These functions can be exposed to the Tauri frontend via the
 * Tauri command system for direct invocation from the UI.
 */

let sidecar: TauriSidecar | null = null;

/**
 * Initialize the sidecar
 */
export async function initializeSidecar(options?: SidecarOptions): Promise<void> {
    if (sidecar) {
        await sidecar.stop();
    }

    sidecar = createTauriSidecar(options);
    await sidecar.start();
}

/**
 * Shutdown the sidecar
 */
export async function shutdownSidecar(): Promise<void> {
    if (sidecar) {
        await sidecar.stop();
        sidecar = null;
    }
}

/**
 * Get dashboard data
 */
export async function getDashboardData(): Promise<unknown> {
    if (!sidecar) {
        throw new Error('Sidecar not initialized');
    }
    return sidecar.call('dashboard.getData');
}

/**
 * Deploy a worker
 */
export async function deployWorker(params: {
    name?: string;
    env?: string;
    dryRun?: boolean;
}): Promise<unknown> {
    if (!sidecar) {
        throw new Error('Sidecar not initialized');
    }
    return sidecar.call('dashboard.deployWorker', params);
}

/**
 * List R2 buckets
 */
export async function listR2Buckets(): Promise<unknown> {
    if (!sidecar) {
        throw new Error('Sidecar not initialized');
    }
    return sidecar.call('dashboard.listR2Buckets');
}

/**
 * Create an R2 bucket
 */
export async function createR2Bucket(name: string): Promise<unknown> {
    if (!sidecar) {
        throw new Error('Sidecar not initialized');
    }
    return sidecar.call('dashboard.createR2Bucket', { name });
}

/**
 * Delete an R2 bucket
 */
export async function deleteR2Bucket(name: string): Promise<unknown> {
    if (!sidecar) {
        throw new Error('Sidecar not initialized');
    }
    return sidecar.call('dashboard.deleteR2Bucket', { name });
}

/**
 * Get sidecar state
 */
export function getSidecarState(): SidecarState | null {
    return sidecar ? sidecar.getState() : null;
}

/**
 * Check if sidecar is running
 */
export function isSidecarRunning(): boolean {
    return sidecar ? sidecar.isRunning() : false;
}
