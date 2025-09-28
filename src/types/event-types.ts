/**
 * Event System Type Definitions
 *
 * Defines the event-driven architecture for real-time communication
 * between dashboard components and core services.
 */

// Base Event Structure
export interface BaseEvent {
    id: string;
    type: string;
    source: string;
    timestamp: number;
    version: string;
    correlationId?: string;
    metadata?: Record<string, unknown>;
}

export interface EventPayload<T = unknown> extends BaseEvent {
    data: T;
}

// Event Categories
export type EventCategory =
    | 'project'
    | 'build'
    | 'deployment'
    | 'file-system'
    | 'service'
    | 'user'
    | 'system'
    | 'analytics'
    | 'collaboration';

// Project Events
export interface ProjectEvent extends BaseEvent {
    type:
        | 'project.created'
        | 'project.updated'
        | 'project.deleted'
        | 'project.opened'
        | 'project.closed';
    projectId: string;
}

export interface ProjectCreatedEvent extends ProjectEvent {
    type: 'project.created';
    data: {
        project: {
            id: string;
            name: string;
            framework: string;
            path: string;
        };
    };
}

export interface ProjectUpdatedEvent extends ProjectEvent {
    type: 'project.updated';
    data: {
        projectId: string;
        changes: Record<string, unknown>;
        previousValues?: Record<string, unknown>;
    };
}

// Build Events
export interface BuildEvent extends BaseEvent {
    type:
        | 'build.started'
        | 'build.progress'
        | 'build.completed'
        | 'build.failed'
        | 'build.cancelled';
    buildId: string;
    projectId: string;
}

export interface BuildStartedEvent extends BuildEvent {
    type: 'build.started';
    data: {
        buildId: string;
        projectId: string;
        configuration: {
            target: string;
            environment: string;
        };
    };
}

export interface BuildProgressEvent extends BuildEvent {
    type: 'build.progress';
    data: {
        buildId: string;
        stage: string;
        progress: number; // 0-100
        message?: string;
        estimatedTimeRemaining?: number;
    };
}

export interface BuildCompletedEvent extends BuildEvent {
    type: 'build.completed';
    data: {
        buildId: string;
        duration: number;
        artifacts: Array<{
            name: string;
            size: number;
            type: string;
        }>;
        metrics: {
            bundleSize: number;
            buildTime: number;
            warnings: number;
            errors: number;
        };
    };
}

// File System Events
export interface FileSystemEvent extends BaseEvent {
    type:
        | 'file.created'
        | 'file.updated'
        | 'file.deleted'
        | 'file.moved'
        | 'directory.created'
        | 'directory.deleted';
    projectId: string;
    path: string;
}

export interface FileCreatedEvent extends FileSystemEvent {
    type: 'file.created';
    data: {
        path: string;
        size: number;
        type: string;
        encoding?: string;
    };
}

export interface FileUpdatedEvent extends FileSystemEvent {
    type: 'file.updated';
    data: {
        path: string;
        size: number;
        modifiedAt: number;
        changes?: {
            linesAdded: number;
            linesRemoved: number;
            characters: number;
        };
    };
}

// Service Events
export interface ServiceEvent extends BaseEvent {
    type: 'service.started' | 'service.stopped' | 'service.error' | 'service.health-check';
    serviceId: string;
}

export interface ServiceStartedEvent extends ServiceEvent {
    type: 'service.started';
    data: {
        serviceId: string;
        serviceName: string;
        pid?: number;
        port?: number;
        version?: string;
    };
}

export interface ServiceErrorEvent extends ServiceEvent {
    type: 'service.error';
    data: {
        serviceId: string;
        error: {
            code: string;
            message: string;
            stack?: string;
        };
        recoverable: boolean;
    };
}

// User Events
export interface UserEvent extends BaseEvent {
    type: 'user.action' | 'user.session-start' | 'user.session-end';
    userId?: string;
    sessionId: string;
}

export interface UserActionEvent extends UserEvent {
    type: 'user.action';
    data: {
        action: string;
        target?: string;
        parameters?: Record<string, unknown>;
        duration?: number;
    };
}

// System Events
export interface SystemEvent extends BaseEvent {
    type: 'system.startup' | 'system.shutdown' | 'system.error' | 'system.resource-warning';
}

export interface SystemResourceWarningEvent extends SystemEvent {
    type: 'system.resource-warning';
    data: {
        resource: 'memory' | 'cpu' | 'disk' | 'network';
        current: number;
        threshold: number;
        unit: string;
        recommendation?: string;
    };
}

// Analytics Events
export interface AnalyticsEvent extends BaseEvent {
    type: 'analytics.metric' | 'analytics.milestone' | 'analytics.report-generated';
}

export interface AnalyticsMetricEvent extends AnalyticsEvent {
    type: 'analytics.metric';
    data: {
        metric: string;
        value: number;
        unit?: string;
        tags?: Record<string, string>;
        context?: Record<string, unknown>;
    };
}

// Collaboration Events
export interface CollaborationEvent extends BaseEvent {
    type:
        | 'collaboration.user-joined'
        | 'collaboration.user-left'
        | 'collaboration.cursor-moved'
        | 'collaboration.file-edited';
    sessionId: string;
    userId: string;
}

export interface CollaborationUserJoinedEvent extends CollaborationEvent {
    type: 'collaboration.user-joined';
    data: {
        user: {
            id: string;
            name: string;
            avatar?: string;
            role: string;
        };
        sessionId: string;
    };
}

// Event Handler Types
export type EventHandler<T extends BaseEvent = BaseEvent> = (event: T) => Promise<void> | void;

export type EventMiddleware = (event: BaseEvent, next: () => Promise<void>) => Promise<void>;

export interface EventFilter {
    type?: string | string[];
    source?: string | string[];
    category?: EventCategory | EventCategory[];
    metadata?: Record<string, unknown>;
    custom?: (event: BaseEvent) => boolean;
}

// Event Store and Persistence
export interface EventStoreConfig {
    maxEvents: number;
    retentionDays: number;
    batchSize: number;
    compressionEnabled: boolean;
    indexFields: string[];
}

export interface StoredEvent extends BaseEvent {
    persistedAt: number;
    sequence: number;
    checksum?: string;
}

export interface EventQuery {
    types?: string[];
    sources?: string[];
    startTime?: number;
    endTime?: number;
    correlationId?: string;
    limit?: number;
    offset?: number;
    orderBy?: 'timestamp' | 'sequence';
    orderDirection?: 'asc' | 'desc';
}

// Event Streaming and Subscriptions
export interface EventStream {
    id: string;
    filter: EventFilter;
    batchSize: number;
    maxBatchWaitTime: number;
    resumeToken?: string;
}

export interface EventBatch {
    streamId: string;
    events: BaseEvent[];
    resumeToken: string;
    hasMore: boolean;
}

export interface EventSubscription {
    id: string;
    filter: EventFilter;
    connectionId: string;
    createdAt: number;
    lastActivity: number;
    deliveryMode: 'realtime' | 'batch' | 'replay';
    acknowledgmentRequired: boolean;
}

// Event Acknowledgment
export interface EventAcknowledgment {
    subscriptionId: string;
    eventIds: string[];
    timestamp: number;
    status: 'processed' | 'failed' | 'skipped';
    error?: string;
}

// Event Bus Configuration
export interface EventBusConfig {
    maxListeners: number;
    eventTTL: number;
    retryPolicy: {
        maxRetries: number;
        backoffMultiplier: number;
        maxBackoffTime: number;
    };
    deadLetterQueue: {
        enabled: boolean;
        maxSize: number;
    };
    metrics: {
        enabled: boolean;
        flushInterval: number;
    };
}

// Event Performance Metrics
export interface EventMetrics {
    totalEvents: number;
    eventsPerSecond: number;
    averageProcessingTime: number;
    failureRate: number;
    queueDepth: number;
    activeSubscriptions: number;
    lastProcessedEventTime: number;
}

// Unified Event Types Union
export type DashboardEvent =
    | ProjectEvent
    | BuildEvent
    | FileSystemEvent
    | ServiceEvent
    | UserEvent
    | SystemEvent
    | AnalyticsEvent
    | CollaborationEvent;
