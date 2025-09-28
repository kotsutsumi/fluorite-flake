# Communication Architecture for TUI/GUI Integration

## Architecture Overview

This document outlines the communication architecture for Fluorite Flake's multi-interface dashboard system, supporting TUI, Tauri GUI, and potential web interfaces.

## System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   TUI Client    │    │   Tauri App     │    │   Web Client    │
│   (Terminal)    │    │   (Desktop)     │    │   (Browser)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                       │                       │
          │                       │                       │
          └───────────────────────┼───────────────────────┘
                                  │
                          ┌───────────────┐
                          │  Message Bus  │
                          │  (WebSocket)  │
                          └───────────────┘
                                  │
                          ┌───────────────┐
                          │   Core API    │
                          │   (Express)   │
                          └───────────────┘
                                  │
          ┌─────────────────────────────────────────────────┐
          │                                                 │
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   CLI Adapters  │  │   Data Store    │  │   Event Bus     │
│   (Services)    │  │   (SQLite)      │  │   (EventEmitter)│
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## Communication Protocol

### Primary Protocol: JSON-RPC 2.0 over WebSockets

```typescript
interface RPCMessage {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
  id?: string | number;
}

interface RPCResponse {
  jsonrpc: "2.0";
  result?: unknown;
  error?: RPCError;
  id: string | number;
}

interface RPCError {
  code: number;
  message: string;
  data?: unknown;
}
```

### Message Types

#### 1. Service Operations
```typescript
// CLI command execution
{
  "jsonrpc": "2.0",
  "method": "service.execute",
  "params": {
    "service": "aws",
    "operation": "s3.listBuckets",
    "args": {}
  },
  "id": "req-1"
}

// Real-time updates
{
  "jsonrpc": "2.0",
  "method": "service.notify",
  "params": {
    "service": "vercel",
    "event": "deployment.status",
    "data": { "status": "ready", "url": "..." }
  }
}
```

#### 2. Dashboard Operations
```typescript
// Subscribe to dashboard updates
{
  "jsonrpc": "2.0",
  "method": "dashboard.subscribe",
  "params": {
    "services": ["aws", "vercel"],
    "events": ["deployments", "metrics"]
  },
  "id": "sub-1"
}

// Dashboard data request
{
  "jsonrpc": "2.0",
  "method": "dashboard.getData",
  "params": {
    "service": "github",
    "view": "repositories",
    "filters": { "org": "myorg" }
  },
  "id": "dash-1"
}
```

### Fallback: HTTP REST API

For scenarios where WebSocket is not available:

```typescript
// RESTful endpoints
GET    /api/services/{service}/status
POST   /api/services/{service}/execute
GET    /api/dashboard/{service}/{view}
POST   /api/dashboard/subscribe
GET    /api/events (Server-Sent Events)
```

## Core API Server

### Express.js Server with WebSocket Support

```typescript
// src/core/api-server.ts
import express from 'express';
import { WebSocketServer } from 'ws';
import { RPCHandler } from './rpc-handler';
import { ServiceManager } from './service-manager';

class FluoriteApiServer {
  private app: express.Application;
  private wss: WebSocketServer;
  private rpcHandler: RPCHandler;
  private serviceManager: ServiceManager;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  private setupWebSocket() {
    this.wss = new WebSocketServer({ port: 8080 });
    this.wss.on('connection', (ws) => {
      ws.on('message', (data) => {
        this.handleRPCMessage(ws, data);
      });
    });
  }

  private async handleRPCMessage(ws: WebSocket, data: Buffer) {
    try {
      const message = JSON.parse(data.toString()) as RPCMessage;
      const response = await this.rpcHandler.handle(message);
      ws.send(JSON.stringify(response));
    } catch (error) {
      // Error handling
    }
  }
}
```

### Service Manager

```typescript
// src/core/service-manager.ts
import { AwsAdapter } from '../cli-adapters/aws';
import { GitHubCli } from '../cli-adapters/github';
import { SupabaseWrapper } from '../cli-adapters/supabase';

export class ServiceManager {
  private services = new Map();
  private eventBus: EventEmitter;

  constructor() {
    this.initializeServices();
    this.setupEventHandlers();
  }

  private initializeServices() {
    this.services.set('aws', new AwsAdapter());
    this.services.set('github', new GitHubCli());
    this.services.set('supabase', new SupabaseWrapper());
    // ... other services
  }

  async executeOperation(service: string, operation: string, params: any) {
    const serviceInstance = this.services.get(service);
    if (!serviceInstance) {
      throw new Error(`Service ${service} not found`);
    }

    // Execute operation with progress tracking
    return await this.executeWithProgress(serviceInstance, operation, params);
  }
}
```

## Data Store Layer

### SQLite for Local State

```sql
-- Dashboard state
CREATE TABLE dashboard_state (
  id TEXT PRIMARY KEY,
  service TEXT NOT NULL,
  view TEXT NOT NULL,
  data TEXT, -- JSON data
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Event log
CREATE TABLE event_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service TEXT NOT NULL,
  event_type TEXT NOT NULL,
  data TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Service configurations
CREATE TABLE service_configs (
  service TEXT PRIMARY KEY,
  config TEXT, -- JSON config
  last_auth DATETIME
);
```

### Data Manager

```typescript
// src/core/data-manager.ts
import Database from 'better-sqlite3';

export class DataManager {
  private db: Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initializeTables();
  }

  async storeDashboardData(service: string, view: string, data: any) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO dashboard_state (id, service, view, data)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(`${service}:${view}`, service, view, JSON.stringify(data));
  }

  async getDashboardData(service: string, view: string) {
    const stmt = this.db.prepare(`
      SELECT data FROM dashboard_state
      WHERE service = ? AND view = ?
    `);
    const row = stmt.get(service, view);
    return row ? JSON.parse(row.data) : null;
  }
}
```

## TUI Client Architecture

### Terminal UI with Rich Components

```typescript
// src/tui/dashboard.ts
import blessed from 'blessed';
import { WebSocket } from 'ws';

export class TUIDashboard {
  private screen: blessed.Widgets.Screen;
  private ws: WebSocket;
  private widgets = new Map();

  constructor() {
    this.setupScreen();
    this.connectWebSocket();
    this.createWidgets();
  }

  private setupScreen() {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Fluorite Flake Dashboard'
    });

    this.screen.key(['escape', 'q', 'C-c'], () => {
      process.exit(0);
    });
  }

  private createWidgets() {
    // Service status panel
    const statusPanel = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      border: { type: 'line' },
      label: 'Services'
    });

    // Main content area
    const contentArea = blessed.box({
      top: 3,
      left: 0,
      width: '100%',
      height: '100%-3',
      border: { type: 'line' }
    });

    this.screen.append(statusPanel);
    this.screen.append(contentArea);
  }

  private async connectWebSocket() {
    this.ws = new WebSocket('ws://localhost:8080');

    this.ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      this.handleServerMessage(message);
    });
  }
}
```

## Tauri Sidecar Integration

### Sidecar Binary Configuration

```json
// tauri.conf.json
{
  "tauri": {
    "bundle": {
      "externalBin": [
        {
          "name": "fluorite-flake",
          "src": "../target/release/fluorite-flake-sidecar"
        }
      ]
    }
  }
}
```

### Rust Sidecar Implementation

```rust
// src-tauri/src/sidecar.rs
use serde_json::Value;
use std::process::{Command, Stdio};
use tokio::process::Command as TokioCommand;

pub struct FluoriteSidecar {
    child: Option<tokio::process::Child>,
}

impl FluoriteSidecar {
    pub async fn start() -> Result<Self, Box<dyn std::error::Error>> {
        let child = TokioCommand::new("fluorite-flake-sidecar")
            .arg("--mode=sidecar")
            .arg("--port=8081")
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()?;

        Ok(Self { child: Some(child) })
    }

    pub async fn send_command(&self, command: Value) -> Result<Value, Box<dyn std::error::Error>> {
        // Send JSON-RPC command to sidecar
        // Return parsed response
        todo!()
    }
}
```

### TypeScript Frontend Integration

```typescript
// src-tauri/src/frontend/api.ts
import { invoke } from '@tauri-apps/api/tauri';

export class FluoriteAPI {
  async executeServiceCommand(service: string, operation: string, params: any) {
    return await invoke('execute_service_command', {
      service,
      operation,
      params
    });
  }

  async subscribeToDashboard(services: string[]) {
    return await invoke('subscribe_dashboard', { services });
  }

  async getDashboardData(service: string, view: string) {
    return await invoke('get_dashboard_data', { service, view });
  }
}
```

## Message Serialization

### Primary: JSON for Human-Readable
```typescript
const message = {
  jsonrpc: "2.0",
  method: "aws.s3.listBuckets",
  params: {},
  id: "req-1"
};
```

### Binary: MessagePack for Large Data
```typescript
import * as msgpack from '@msgpack/msgpack';

// For large dataset transfers
const binaryData = msgpack.encode({
  service: "github",
  data: largeRepositoryList,
  compressed: true
});
```

## Real-time Updates

### Event Streaming Pattern

```typescript
// Server-side event emission
class ServiceEventEmitter extends EventEmitter {
  emitServiceUpdate(service: string, event: string, data: any) {
    this.emit('service:update', {
      service,
      event,
      data,
      timestamp: Date.now()
    });
  }
}

// Client-side subscription
ws.send(JSON.stringify({
  jsonrpc: "2.0",
  method: "events.subscribe",
  params: {
    patterns: ["aws.*", "vercel.deployment.*"]
  }
}));
```

## Security Considerations

### Authentication
- JWT tokens for client authentication
- Service-specific credential management
- Rate limiting per client

### Data Protection
- Encrypt sensitive CLI credentials
- Audit logging for all operations
- Sandbox CLI execution

## Performance Optimizations

### Caching Strategy
```typescript
class CacheManager {
  private cache = new Map();
  private ttl = new Map();

  set(key: string, value: any, ttlMs: number = 300000) {
    this.cache.set(key, value);
    this.ttl.set(key, Date.now() + ttlMs);
  }

  get(key: string) {
    if (this.ttl.get(key) < Date.now()) {
      this.cache.delete(key);
      this.ttl.delete(key);
      return null;
    }
    return this.cache.get(key);
  }
}
```

### Connection Pooling
- WebSocket connection reuse
- CLI command batching
- Lazy service initialization

## Development Workflow

### Local Development
1. Start API server: `npm run start:api`
2. Launch TUI client: `npm run start:tui`
3. Run Tauri app: `npm run tauri:dev`

### Production Deployment
1. Build sidecar binary
2. Package with Tauri app
3. Configure service endpoints

This architecture provides a flexible, scalable foundation for dashboard integration across TUI and GUI interfaces while maintaining performance and security.