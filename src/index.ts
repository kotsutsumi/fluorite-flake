// Main library exports for programmatic usage
export { createProject, type ProjectConfig } from './commands/create/index.js';
export { setupAuth } from './generators/auth-generator.js';
export { setupDatabase } from './generators/database-generator.js';
export { setupDeployment } from './generators/deployment-generator.js';
export { setupStorage } from './generators/storage-generator.js';
export { generateNextProject } from './generators/next-generator.js';
export { generateExpoProject } from './generators/expo-generator.js';
export { generateTauriProject } from './generators/tauri-generator.js';
export { generateFlutterProject } from './generators/flutter-generator.js';

// Wrangler Dashboard exports
export {
    WranglerDashboard,
    createWranglerDashboard,
    formatDashboardData,
    type WranglerDashboardData,
} from './utils/wrangler-dashboard.js';

// IPC Server/Client exports
export {
    IPCServer,
    createIPCServer,
    type IPCServerOptions,
    type IPCMethods,
    type JsonRpcRequest,
    type JsonRpcResponse,
} from './ipc/ipc-server.js';

export { IPCClient, createIPCClient, type IPCClientOptions } from './ipc/ipc-client.js';

// TUI Dashboard exports
export { TUIDashboard, startTUIDashboard, type DashboardOptions } from './tui/dashboard.js';

// Tauri Sidecar exports
export {
    TauriSidecar,
    createTauriSidecar,
    SidecarState,
    initializeSidecar,
    shutdownSidecar,
    getDashboardData,
    deployWorker,
    listR2Buckets,
    createR2Bucket,
    deleteR2Bucket,
    getSidecarState,
    isSidecarRunning,
    type SidecarOptions,
} from './tauri/sidecar.js';
