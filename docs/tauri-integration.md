# Tauri Sidecar Integration

The Fluorite Flake CLI provides a sidecar integration for Tauri desktop applications, enabling seamless management of Cloudflare Workers from your desktop app.

## Overview

The Tauri sidecar runs the Fluorite Flake IPC server as a child process, providing a stable JSON-RPC 2.0 API for your Tauri application to interact with Cloudflare Workers, R2 buckets, KV namespaces, and more.

## Installation

```bash
npm install fluorite-flake
# or
pnpm add fluorite-flake
```

## Basic Usage

### TypeScript/JavaScript Backend

```typescript
import { initializeSidecar, shutdownSidecar, getDashboardData } from 'fluorite-flake/tauri';

// Initialize the sidecar when your app starts
await initializeSidecar({
  ipcPort: 9123,
  debug: true,
  autoRestart: true
});

// Get dashboard data
const data = await getDashboardData();

// Shutdown when your app closes
await shutdownSidecar();
```

### Advanced Usage

```typescript
import { TauriSidecar, SidecarState } from 'fluorite-flake/tauri';

// Create a custom sidecar instance
const sidecar = new TauriSidecar({
  cliPath: '/path/to/fluorite-flake',
  ipcPort: 9123,
  authToken: 'your-secret-token',
  debug: true,
  autoRestart: true,
  restartDelay: 5000
});

// Listen to events
sidecar.on('started', () => {
  console.log('Sidecar started');
});

sidecar.on('error', (error) => {
  console.error('Sidecar error:', error);
});

sidecar.on('state-change', ({ from, to }) => {
  console.log(`State changed from ${from} to ${to}`);
});

// Start the sidecar
await sidecar.start();

// Make IPC calls
const workers = await sidecar.call('dashboard.getData');
const deployResult = await sidecar.call('dashboard.deployWorker', {
  name: 'my-worker',
  dryRun: false
});

// Check state
if (sidecar.isRunning()) {
  console.log('Sidecar is running');
}

// Restart if needed
await sidecar.restart();

// Stop when done
await sidecar.stop();
```

## Tauri Command Integration

### Rust Backend (src-tauri/src/main.rs)

```rust
use tauri::Manager;

#[tauri::command]
async fn get_dashboard_data() -> Result<String, String> {
    // Call your Node.js backend that uses the sidecar
    // This would typically communicate with your Node process
    Ok("dashboard data".to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_dashboard_data])
        .setup(|app| {
            // Initialize sidecar on app startup
            // You might spawn a Node.js process here that manages the sidecar
            Ok(())
        })
        .on_window_event(|event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event.event() {
                // Shutdown sidecar on app close
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Frontend (React/Vue/Svelte)

```typescript
import { invoke } from '@tauri-apps/api';

// Get dashboard data from the backend
const data = await invoke('get_dashboard_data');

// Display in your UI
console.log(data);
```

## API Reference

### SidecarOptions

```typescript
interface SidecarOptions {
  cliPath?: string;        // Path to fluorite-flake CLI (default: 'fluorite-flake')
  ipcPort?: number;        // IPC server port (default: 9123)
  ipcHost?: string;        // IPC server host (default: '127.0.0.1')
  authToken?: string;      // Authentication token for IPC
  debug?: boolean;         // Enable debug output (default: false)
  autoRestart?: boolean;   // Auto-restart on crash (default: true)
  restartDelay?: number;   // Restart delay in ms (default: 5000)
}
```

### SidecarState

```typescript
enum SidecarState {
  IDLE = 'idle',
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  ERROR = 'error',
  RESTARTING = 'restarting'
}
```

### Events

The sidecar emits the following events:

- `started` - Sidecar successfully started
- `stopped` - Sidecar stopped
- `error` - An error occurred
- `state-change` - State changed
- `process-error` - Process error
- `process-exit` - Process exited
- `ipc-connected` - IPC client connected
- `ipc-disconnected` - IPC client disconnected
- `ipc-error` - IPC error
- `max-restarts-reached` - Maximum restart attempts reached
- `restart-failed` - Restart attempt failed

## Available IPC Methods

The sidecar provides access to all IPC methods:

### Dashboard Methods

- `dashboard.getData()` - Get all dashboard data
- `dashboard.deployWorker(params)` - Deploy a worker
- `dashboard.listR2Buckets()` - List R2 buckets
- `dashboard.createR2Bucket(params)` - Create an R2 bucket
- `dashboard.deleteR2Bucket(params)` - Delete an R2 bucket
- `dashboard.tailLogs(params)` - Tail worker logs (streaming)

### Project Methods

- `project.create(params)` - Create a new project

### System Methods

- `system.ping()` - Ping the server
- `system.version()` - Get version info
- `system.shutdown()` - Shutdown the server

## Error Handling

The sidecar includes automatic error recovery:

```typescript
const sidecar = new TauriSidecar({
  autoRestart: true,      // Automatically restart on crash
  restartDelay: 5000,     // Wait 5 seconds before restart
  maxRestarts: 5          // Maximum 5 restart attempts
});

sidecar.on('max-restarts-reached', (count) => {
  console.error(`Sidecar failed after ${count} restart attempts`);
  // Notify user or take corrective action
});
```

## Security

Always use authentication tokens in production:

```typescript
const crypto = require('crypto');

const authToken = crypto.randomBytes(32).toString('hex');

const sidecar = new TauriSidecar({
  authToken,
  // Other options...
});
```

## Debugging

Enable debug mode to see detailed logs:

```typescript
const sidecar = new TauriSidecar({
  debug: true  // Enables verbose logging
});
```

## Best Practices

1. **Initialize Early**: Start the sidecar during app initialization
2. **Handle Errors**: Always listen for error events
3. **Clean Shutdown**: Ensure proper cleanup on app close
4. **Use Tokens**: Always use authentication in production
5. **Monitor State**: Track state changes for UI updates
6. **Batch Operations**: Group multiple calls when possible

## Example Tauri App Structure

```
tauri-app/
├── src/                    # Frontend source
│   ├── App.tsx
│   └── services/
│       └── cloudflare.ts   # Sidecar API wrapper
├── src-tauri/             # Rust backend
│   ├── src/
│   │   └── main.rs
│   └── Cargo.toml
├── node-backend/          # Node.js backend for sidecar
│   ├── index.js
│   └── sidecar.js        # Sidecar management
└── package.json
```

## Troubleshooting

### Sidecar won't start

- Check if the CLI is installed globally or provide the correct path
- Ensure the IPC port is not already in use
- Check debug logs for detailed error messages

### Connection issues

- Verify the IPC host and port settings
- Check if authentication token matches
- Ensure firewall allows local connections

### Process crashes

- Enable debug mode to see detailed logs
- Check system resources (memory, CPU)
- Verify Cloudflare credentials are valid