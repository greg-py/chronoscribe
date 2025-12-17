/**
 * @fileoverview Core type definitions for Chronoscribe
 * 
 * This module defines the fundamental types used across all Chronoscribe packages
 * for representing log entries, sources, and filter configurations.
 */

/**
 * Log severity levels, ordered from most verbose to most critical.
 * These map to common logging conventions across different frameworks.
 */
export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
}

/**
 * Numeric priority for log levels (higher = more severe).
 * Used for filtering logs by minimum severity.
 */
export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3,
};

/**
 * Represents a single log entry in the unified timeline.
 */
export interface LogEntry {
    /** Unique identifier for this log entry (UUID v4) */
    id: string;

    /** ISO 8601 timestamp when the log was received by the server */
    timestamp: string;

    /** Name of the source that generated this log (e.g., "frontend", "api") */
    source: string;

    /** Detected or explicit severity level */
    level: LogLevel;

    /** The processed log content for display */
    content: string;

    /** Original unprocessed log line */
    raw: string;

    /** Parsed timestamp from log content (if found) */
    originalTimestamp?: string;

    /** Format of the original timestamp */
    timestampFormat?: string;
}

/**
 * Represents a connected log source (CLI client).
 */
export interface Source {
    /** Unique identifier for this source connection */
    id: string;

    /** Human-readable name (from --name flag) */
    name: string;

    /** Display color for the source badge (CSS color value) */
    color: string;

    /** Whether this source is currently connected */
    connected: boolean;

    /** ISO 8601 timestamp of when this source connected */
    connectedAt: string;
}

/**
 * Time range filter configuration.
 */
export interface TimeRangeFilter {
    /** Whether time filtering is enabled */
    enabled: boolean;

    /** Type of time range */
    type: 'relative' | 'absolute';

    /** For relative: number of minutes to look back */
    last?: number;

    /** For absolute: start time (ISO 8601) */
    start?: string;

    /** For absolute: end time (ISO 8601) */
    end?: string;
}

/**
 * Filter configuration for the log timeline.
 */
export interface Filter {
    /** Sources to include (empty = all sources) */
    sources: string[];

    /** Sources to explicitly exclude */
    excludeSources: string[];

    /** Minimum log level to display */
    minLevel: LogLevel;

    /** Text to search for (case-insensitive substring match) */
    searchText: string;

    /** Search mode: text or regex */
    searchMode: 'text' | 'regex';

    /** Optional regex pattern for advanced filtering */
    regex: string | null;

    /** Source filter logic: match any or all */
    sourceFilterMode: 'any' | 'all';

    /** Time range filtering */
    timeRange: TimeRangeFilter;
}


/**
 * Bookmark with optional annotation.
 */
export interface Bookmark {
    /** ID of the bookmarked log */
    logId: string;

    /** Optional annotation/note */
    note: string;

    /** When this bookmark was created */
    createdAt: string;

    /** Optional color tag for organization */
    color?: 'red' | 'yellow' | 'green' | 'blue' | 'purple';
}

/**
 * Alert configuration for pattern-based notifications.
 */
export interface AlertConfig {
    /** Whether alerting is enabled */
    enabled: boolean;

    /** Regex pattern to match against log content */
    pattern: string;

    /** Play audio alert when pattern matches */
    playSound: boolean;

    /** Show browser notification when pattern matches */
    showNotification: boolean;
}

/**
 * Default filter configuration showing all logs.
 */
export const DEFAULT_FILTER: Filter = {
    sources: [],
    excludeSources: [],
    minLevel: LogLevel.DEBUG,
    searchText: '',
    searchMode: 'text',
    regex: null,
    sourceFilterMode: 'any',
    timeRange: {
        enabled: false,
        type: 'relative',
    },
};

/**
 * Default alert configuration (disabled).
 */
export const DEFAULT_ALERT_CONFIG: AlertConfig = {
    enabled: false,
    pattern: '',
    playSound: true,
    showNotification: true,
};

/**
 * Predefined color palette for source badges.
 * Colors are chosen for good contrast on dark backgrounds.
 */
export const SOURCE_COLORS = [
    '#60A5FA', // Blue
    '#34D399', // Green
    '#FBBF24', // Yellow
    '#F87171', // Red
    '#A78BFA', // Purple
    '#FB923C', // Orange
    '#2DD4BF', // Teal
    '#F472B6', // Pink
    '#818CF8', // Indigo
    '#4ADE80', // Lime
] as const;

/**
 * Maximum number of log entries to keep in memory.
 * Older entries are removed when this limit is exceeded.
 */
export const MAX_LOG_ENTRIES = 10_000;

/**
 * Server configuration defaults.
 */
export const SERVER_DEFAULTS = {
    /** Default WebSocket server port */
    WS_PORT: 3210,

    /** Default dashboard development server port */
    DASHBOARD_PORT: 3211,

    /** Number of recent logs to send to new connections */
    RECENT_LOGS_BUFFER: 1000,
} as const;
