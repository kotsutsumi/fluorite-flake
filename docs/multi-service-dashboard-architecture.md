# Multi-Service Dashboard Architecture

## Executive Summary

This document outlines the architecture for transforming fluorite-flake from a Cloudflare-specific TUI dashboard to a comprehensive multi-service dashboard system supporting Vercel, Turso, Supabase, AWS, Cloudflare, and GitHub.

## Current State Analysis

### Existing Implementation
- **Current Command**: `fluorite-flake tui` → Cloudflare Workers monitoring only
- **Architecture**: Hardcoded Cloudflare dashboard with blessed/blessed-contrib TUI
- **Communication**: IPC server/client architecture for real-time updates
- **Limitations**: Single-service, non-extensible, Cloudflare-specific

### Target Implementation
- **New Commands**: `fluorite-flake dashboard <service>` → Multi-service TUI dashboards
- **Architecture**: Modular service adapters with unified dashboard framework
- **Communication**: Pluggable protocol layer (JSON-RPC + WebSockets/MessagePack)
- **Capabilities**: Multi-service, extensible, Tauri-ready

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLI Command Layer                          │
├─────────────────────────────────────────────────────────────────┤
│  fluorite-flake dashboard <service> [options]                  │
│  ├── vercel     │ supabase   │ turso      │ aws       │ github │
│  ├── cloudflare │ all        │ multi      │ sidecar   │        │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                 Dashboard Router & Orchestrator                │
├─────────────────────────────────────────────────────────────────┤
│  ├── Service Selection & Validation                            │
│  ├── Multi-Service Coordination                                │
│  ├── Tauri Sidecar Integration                                 │
│  └── Protocol Negotiation                                      │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                  Service Adapter Layer                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│  │   Vercel    │ │  Supabase   │ │    Turso    │ │     AWS     │ │
│  │   Adapter   │ │   Adapter   │ │   Adapter   │ │   Adapter   │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
│  ┌─────────────┐ ┌─────────────┐                                │
│  │ Cloudflare  │ │   GitHub    │                                │
│  │   Adapter   │ │   Adapter   │                                │
│  └─────────────┘ └─────────────┘                                │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│              Communication Protocol Layer                      │
├─────────────────────────────────────────────────────────────────┤
│  ├── JSON-RPC 2.0 (Primary)                                    │
│  ├── WebSockets (Real-time)                                    │
│  ├── MessagePack (Binary data)                                 │
│  └── REST + SSE (Fallback)                                     │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                 TUI Framework Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  ├── Unified Component Library (blessed-contrib)               │
│  ├── Service-Specific Layouts                                  │
│  ├── Real-time Data Binding                                    │
│  └── Theme & Accessibility Support                             │
└─────────────────────────────────────────────────────────────────┘
```

## Command Structure Design

### New Command Syntax
```bash
# Service-specific dashboards
fluorite-flake dashboard vercel [options]
fluorite-flake dashboard supabase [options]
fluorite-flake dashboard turso [options]
fluorite-flake dashboard aws [options]
fluorite-flake dashboard cloudflare [options]
fluorite-flake dashboard github [options]

# Multi-service capabilities
fluorite-flake dashboard all [options]          # All configured services
fluorite-flake dashboard multi [services...]    # Selected services
fluorite-flake dashboard sidecar [options]      # Tauri sidecar mode

# Backward compatibility (deprecated)
fluorite-flake tui → fluorite-flake dashboard cloudflare
```

### Command Options
```bash
# Display options
--mode [cli|tui|json]           # Output mode (default: tui)
--theme [dark|light|auto]       # Color theme
--layout [grid|tabs|split]      # Layout style
--refresh <interval>            # Refresh interval (ms)

# Connection options
--host <host>                   # IPC/WebSocket host
--port <port>                   # Connection port
--token <token>                 # Authentication token
--protocol [ws|ipc|rest]        # Communication protocol

# Service options
--project <id>                  # Project/account filter
--region <region>               # Region filter
--env <environment>             # Environment filter

# Multi-service options
--services <list>               # Service selection for multi mode
--sync                          # Synchronize data across services
--aggregate                     # Aggregate metrics
```

## Service Adapter Architecture

### Base Service Adapter Interface
```typescript
export interface ServiceAdapter {
  // Metadata
  readonly name: string;
  readonly version: string;
  readonly capabilities: ServiceCapabilities;

  // Authentication
  authenticate(config: AuthConfig): Promise<boolean>;
  isAuthenticated(): Promise<boolean>;

  // Core operations
  initialize(): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  // Data fetching
  getDashboardData(): Promise<ServiceDashboardData>;
  getMetrics(timeRange?: TimeRange): Promise<ServiceMetrics>;
  getLogs(options?: LogOptions): AsyncIterable<LogEntry>;

  // Real-time capabilities
  subscribe(event: string, callback: EventCallback): void;
  unsubscribe(event: string): void;

  // Management operations
  listResources(): Promise<Resource[]>;
  executeAction(action: ServiceAction): Promise<ActionResult>;

  // Health and status
  healthCheck(): Promise<HealthStatus>;
  getStatus(): ServiceStatus;
}

export interface ServiceCapabilities {
  realTimeUpdates: boolean;
  logStreaming: boolean;
  metricsHistory: boolean;
  resourceManagement: boolean;
  multiProject: boolean;
  deployments: boolean;
  analytics: boolean;
}
```

### Service-Specific Adapters

#### Vercel Adapter
```typescript
export class VercelAdapter implements ServiceAdapter {
  name = 'vercel';
  capabilities = {
    realTimeUpdates: true,
    logStreaming: true,
    metricsHistory: true,
    resourceManagement: true,
    multiProject: true,
    deployments: true,
    analytics: true
  };

  // Dashboard sections
  async getDashboardData() {
    return {
      projects: await this.getProjects(),
      deployments: await this.getDeployments(),
      domains: await this.getDomains(),
      analytics: await this.getAnalytics(),
      functions: await this.getFunctions()
    };
  }
}
```

#### Supabase Adapter
```typescript
export class SupabaseAdapter implements ServiceAdapter {
  name = 'supabase';
  capabilities = {
    realTimeUpdates: true,
    logStreaming: true,
    metricsHistory: true,
    resourceManagement: true,
    multiProject: true,
    deployments: false,
    analytics: true
  };

  async getDashboardData() {
    return {
      projects: await this.getProjects(),
      databases: await this.getDatabases(),
      auth: await this.getAuthMetrics(),
      storage: await this.getStorageUsage(),
      functions: await this.getEdgeFunctions(),
      realtime: await this.getRealtimeStats()
    };
  }
}
```

## TUI Framework Design

### Unified Component System
```typescript
export class DashboardUI {
  private screen: blessed.Widgets.Screen;
  private layout: DashboardLayout;
  private widgets: Map<string, Widget> = new Map();

  constructor(
    private adapter: ServiceAdapter,
    private options: DashboardOptions
  ) {}

  // Service-agnostic rendering
  render(data: ServiceDashboardData): void {
    const config = this.getLayoutConfig(this.adapter.name);
    this.layout.apply(config);
    this.updateWidgets(data);
  }

  // Dynamic layout based on service capabilities
  getLayoutConfig(serviceName: string): LayoutConfig {
    return LAYOUT_CONFIGS[serviceName] || LAYOUT_CONFIGS.default;
  }
}

// Service-specific layout configurations
const LAYOUT_CONFIGS = {
  vercel: {
    grid: { rows: 12, cols: 12 },
    widgets: [
      { type: 'table', position: [0,0,4,6], title: '🚀 Deployments' },
      { type: 'table', position: [0,6,4,6], title: '🌐 Domains' },
      { type: 'line', position: [4,0,4,12], title: '📊 Analytics' },
      { type: 'log', position: [8,0,4,12], title: '📝 Function Logs' }
    ]
  },

  supabase: {
    grid: { rows: 12, cols: 12 },
    widgets: [
      { type: 'table', position: [0,0,4,6], title: '🗄️ Databases' },
      { type: 'gauge', position: [0,6,4,3], title: '👥 Auth Users' },
      { type: 'gauge', position: [0,9,4,3], title: '💾 Storage' },
      { type: 'line', position: [4,0,4,12], title: '⚡ Realtime' },
      { type: 'log', position: [8,0,4,12], title: '📝 Query Logs' }
    ]
  },

  aws: {
    grid: { rows: 12, cols: 16 },
    widgets: [
      { type: 'table', position: [0,0,3,8], title: '💻 EC2 Instances' },
      { type: 'table', position: [0,8,3,8], title: '⚡ Lambda Functions' },
      { type: 'table', position: [3,0,3,8], title: '🪣 S3 Buckets' },
      { type: 'gauge', position: [3,8,3,4], title: '💰 Costs' },
      { type: 'gauge', position: [3,12,3,4], title: '🔋 Usage' },
      { type: 'line', position: [6,0,6,16], title: '📊 CloudWatch Metrics' }
    ]
  }
};
```

### Multi-Service Dashboard
```typescript
export class MultiServiceDashboard {
  private services: Map<string, ServiceAdapter> = new Map();
  private tabManager: TabManager;

  async initialize(serviceNames: string[]) {
    for (const name of serviceNames) {
      const adapter = await this.createAdapter(name);
      await adapter.initialize();
      this.services.set(name, adapter);
    }

    this.setupTabs();
    this.startAggregation();
  }

  private setupTabs() {
    this.services.forEach((adapter, name) => {
      this.tabManager.addTab({
        id: name,
        title: adapter.name,
        content: new DashboardUI(adapter, this.options)
      });
    });

    // Add aggregate view
    this.tabManager.addTab({
      id: 'overview',
      title: 'Overview',
      content: new AggregateDashboard(this.services)
    });
  }
}
```

## Communication Protocol Selection

### Primary: JSON-RPC 2.0 over WebSockets

**Rationale**:
- Bidirectional communication for real-time updates
- Structured request/response pattern
- Built-in batch operations
- Standard error handling
- Wide language support

```typescript
// Protocol specification
interface RPCMessage {
  jsonrpc: '2.0';
  id?: string | number | null;
  method?: string;
  params?: any;
  result?: any;
  error?: RPCError;
}

// Dashboard method calls
await rpc.call('dashboard.getData', { service: 'vercel' });
await rpc.call('metrics.subscribe', { service: 'supabase', interval: 5000 });
await rpc.batch([
  { method: 'vercel.getDeployments' },
  { method: 'supabase.getProjects' },
  { method: 'aws.getInstances' }
]);
```

### Binary Data: MessagePack

**Use Cases**:
- Large dataset transfers (logs, metrics)
- File uploads/downloads
- Image/media content
- Bulk operations

### Fallback: REST + Server-Sent Events

**Use Cases**:
- HTTP-only environments
- Proxy limitations
- Mobile networks
- Legacy support

## Tauri Sidecar Integration

### Architecture
```
┌─────────────────┐    JSON-RPC     ┌─────────────────┐
│  Tauri Frontend │◄──WebSockets───►│ Fluorite Flake  │
│  (React/Vue)    │                 │ Sidecar Process │
└─────────────────┘                 └─────────────────┘
                                             │
                                      CLI Adapters
                                             │
                              ┌─────────────────────────────┐
                              │ Cloud Service APIs          │
                              │ Vercel │ AWS │ Supabase... │
                              └─────────────────────────────┘
```

### Sidecar Command
```bash
# Start Tauri sidecar mode
fluorite-flake dashboard sidecar \
  --port 9123 \
  --protocol ws \
  --services vercel,supabase,aws \
  --token <auth-token>
```

### Tauri Integration
```rust
// tauri.conf.json sidecar configuration
{
  "tauri": {
    "bundle": {
      "externalBin": ["fluorite-flake"]
    }
  }
}

// Start sidecar from Tauri
use tauri::api::process::{Command, CommandEvent};

let (mut rx, mut child) = Command::new_sidecar("fluorite-flake")?
  .args(["dashboard", "sidecar", "--port", "9123"])
  .spawn()?;
```

## Implementation Phases

### Phase 1: Core Architecture (2-3 weeks)
- [ ] Design service adapter interfaces
- [ ] Implement dashboard router and orchestrator
- [ ] Create base TUI framework with service abstraction
- [ ] Add Vercel and Supabase adapters (highest CLI coverage)
- [ ] Update CLI command structure

### Phase 2: Service Expansion (2-3 weeks)
- [ ] Add Turso, AWS, GitHub, enhanced Cloudflare adapters
- [ ] Implement multi-service dashboard capabilities
- [ ] Add real-time communication layer (JSON-RPC + WebSockets)
- [ ] Create service-specific TUI layouts

### Phase 3: Advanced Features (2-3 weeks)
- [ ] Tauri sidecar integration
- [ ] MessagePack binary protocol support
- [ ] Multi-service aggregation and cross-service analytics
- [ ] Advanced TUI components (charts, data tables, interactive forms)

### Phase 4: Polish & Testing (1-2 weeks)
- [ ] Comprehensive testing suite
- [ ] Performance optimization
- [ ] Documentation and examples
- [ ] Migration guides for existing users

## Testing Strategy

### Unit Tests
- Service adapter implementations
- Protocol serialization/deserialization
- TUI component rendering
- CLI command parsing

### Integration Tests
- Multi-service coordination
- Real-time communication
- Tauri sidecar communication
- End-to-end dashboard workflows

### Performance Tests
- Real-time data throughput
- Memory usage with multiple services
- TUI rendering performance
- Protocol overhead analysis

## Migration Strategy

### Backward Compatibility
```bash
# Current (deprecated, with warning)
fluorite-flake tui → "Warning: 'tui' is deprecated, use 'dashboard cloudflare'"

# New
fluorite-flake dashboard cloudflare
```

### Configuration Migration
- Automatically migrate existing IPC settings
- Preserve theme and layout preferences
- Convert Cloudflare-specific configs to new format

### Documentation Updates
- Migration guide from old to new commands
- Service-specific setup guides
- Tauri integration examples
- Troubleshooting documentation

## Success Metrics

### Functional Metrics
- All 6 services have working TUI dashboards
- Real-time updates working across all services
- Tauri sidecar integration operational
- Multi-service dashboard functional

### Performance Metrics
- Dashboard startup time < 3 seconds
- Real-time update latency < 100ms
- Memory usage < 100MB for single service, < 200MB for multi-service
- TUI rendering at 60fps

### Developer Experience
- Easy service adapter development (< 1 day for basic implementation)
- Clear documentation and examples
- Consistent API across all services
- Comprehensive error handling and debugging support