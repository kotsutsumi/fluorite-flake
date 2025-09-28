/**
 * Dashboard Data Interfaces
 *
 * Type definitions for dashboard state, project management,
 * and UI component data structures.
 */

// Project Management Types
export interface Project {
    id: string;
    name: string;
    framework: 'nextjs' | 'expo' | 'tauri' | 'flutter';
    path: string;
    status: 'active' | 'inactive' | 'building' | 'error';
    createdAt: number;
    updatedAt: number;
    metadata: ProjectMetadata;
    configuration: ProjectConfiguration;
    statistics: ProjectStatistics;
}

export interface ProjectMetadata {
    description?: string;
    version?: string;
    author?: string;
    tags: string[];
    repository?: string;
    lastActivity?: number;
    thumbnailPath?: string;
}

export interface ProjectConfiguration {
    database: 'none' | 'turso' | 'supabase';
    orm?: 'prisma' | 'drizzle';
    deployment: boolean;
    storage: 'none' | 'vercel-blob' | 'cloudflare-r2' | 'aws-s3' | 'supabase-storage';
    auth: boolean;
    packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun';
    customConfigurations?: Record<string, unknown>;
}

export interface ProjectStatistics {
    buildCount: number;
    deploymentCount: number;
    lastBuildTime?: number;
    lastDeploymentTime?: number;
    buildSuccessRate: number;
    averageBuildDuration: number;
    fileCount?: number;
    lineCount?: number;
    dependencyCount?: number;
}

// Build and Deployment Types
export interface BuildProcess {
    id: string;
    projectId: string;
    type: 'development' | 'production' | 'preview';
    status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
    startTime: number;
    endTime?: number;
    duration?: number;
    logs: BuildLog[];
    artifacts: BuildArtifact[];
    configuration: BuildConfiguration;
    triggeredBy: string;
}

export interface BuildLog {
    id: string;
    timestamp: number;
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    source: string;
    metadata?: Record<string, unknown>;
}

export interface BuildArtifact {
    id: string;
    name: string;
    type: 'bundle' | 'source-map' | 'asset' | 'report';
    path: string;
    size: number;
    checksum: string;
    createdAt: number;
}

export interface BuildConfiguration {
    target: string;
    optimization: boolean;
    minification: boolean;
    sourceMap: boolean;
    environment: Record<string, string>;
    customFlags?: string[];
}

// Service and Process Management
export interface ServiceStatus {
    id: string;
    name: string;
    type: 'cli-adapter' | 'build-server' | 'dev-server' | 'database' | 'external';
    status: 'running' | 'stopped' | 'starting' | 'stopping' | 'error';
    pid?: number;
    port?: number;
    uptime?: number;
    memoryUsage?: number;
    cpuUsage?: number;
    lastHeartbeat?: number;
    configuration: ServiceConfiguration;
    metrics: ServiceMetrics;
}

export interface ServiceConfiguration {
    autoRestart: boolean;
    maxRestarts: number;
    healthCheckInterval: number;
    timeout: number;
    environment: Record<string, string>;
    dependencies: string[];
}

export interface ServiceMetrics {
    requestCount: number;
    errorCount: number;
    averageResponseTime: number;
    lastRequestTime?: number;
    uptime: number;
    restartCount: number;
}

// File System and Project Structure
export interface FileSystemNode {
    id: string;
    name: string;
    path: string;
    type: 'file' | 'directory';
    size?: number;
    modifiedAt: number;
    permissions?: string;
    children?: FileSystemNode[];
    isExpanded?: boolean;
    metadata?: FileMetadata;
}

export interface FileMetadata {
    language?: string;
    lineCount?: number;
    encoding?: string;
    gitStatus?: 'added' | 'modified' | 'deleted' | 'untracked' | 'staged';
    isGenerated?: boolean;
    lastEditor?: string;
}

// Dashboard UI State
export interface DashboardState {
    activeProject?: string;
    selectedFiles: string[];
    openTabs: TabState[];
    sidebarVisible: boolean;
    theme: 'light' | 'dark' | 'auto';
    layout: LayoutConfiguration;
    notifications: Notification[];
    filters: FilterConfiguration;
}

export interface TabState {
    id: string;
    type: 'file' | 'terminal' | 'build-log' | 'settings';
    title: string;
    path?: string;
    isActive: boolean;
    isDirty?: boolean;
    metadata?: Record<string, unknown>;
}

export interface LayoutConfiguration {
    primaryPanel: 'explorer' | 'build' | 'deploy' | 'settings';
    secondaryPanel?: 'terminal' | 'logs' | 'metrics';
    panelSizes: Record<string, number>;
    isSecondaryPanelCollapsed: boolean;
}

export interface Notification {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    timestamp: number;
    isRead: boolean;
    actions?: NotificationAction[];
    autoClose?: number;
}

export interface NotificationAction {
    id: string;
    label: string;
    action: string;
    style?: 'primary' | 'secondary' | 'danger';
}

export interface FilterConfiguration {
    projectStatus?: string[];
    fileTypes?: string[];
    dateRange?: { start: number; end: number };
    tags?: string[];
    buildTypes?: string[];
}

// Analytics and Monitoring
export interface AnalyticsData {
    projectActivity: ProjectActivity[];
    buildTrends: BuildTrend[];
    performanceMetrics: PerformanceMetric[];
    userActivity: UserActivity[];
    systemHealth: SystemHealthMetric[];
}

export interface ProjectActivity {
    projectId: string;
    timestamp: number;
    action: 'created' | 'opened' | 'built' | 'deployed' | 'edited';
    metadata?: Record<string, unknown>;
}

export interface BuildTrend {
    date: string;
    buildCount: number;
    successCount: number;
    failureCount: number;
    averageDuration: number;
}

export interface PerformanceMetric {
    timestamp: number;
    metric: 'cpu' | 'memory' | 'disk' | 'network';
    value: number;
    unit: string;
    source: string;
}

export interface UserActivity {
    timestamp: number;
    action: string;
    duration?: number;
    projectId?: string;
    metadata?: Record<string, unknown>;
}

export interface SystemHealthMetric {
    timestamp: number;
    component: string;
    status: 'healthy' | 'warning' | 'critical';
    value?: number;
    message?: string;
    details?: Record<string, unknown>;
}

// Search and Discovery
export interface SearchQuery {
    text: string;
    type?: 'files' | 'projects' | 'logs' | 'all';
    filters?: SearchFilter[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}

export interface SearchFilter {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'starts_with' | 'ends_with';
    value: unknown;
}

export interface SearchResult {
    id: string;
    type: 'file' | 'project' | 'log' | 'build';
    title: string;
    description?: string;
    path?: string;
    score: number;
    highlights?: SearchHighlight[];
    metadata?: Record<string, unknown>;
}

export interface SearchHighlight {
    field: string;
    fragments: string[];
}

// Real-time Collaboration
export interface CollaborationSession {
    id: string;
    projectId: string;
    participants: Participant[];
    createdAt: number;
    lastActivity: number;
    isActive: boolean;
}

export interface Participant {
    id: string;
    name: string;
    avatar?: string;
    role: 'owner' | 'editor' | 'viewer';
    isOnline: boolean;
    lastSeen?: number;
    cursor?: CursorPosition;
}

export interface CursorPosition {
    fileId: string;
    line: number;
    column: number;
    selection?: { start: number; end: number };
}
