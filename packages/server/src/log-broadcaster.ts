/**
 * @fileoverview Log broadcaster for Chronoscribe server
 * 
 * Handles processing incoming logs from sources, maintaining a buffer
 * of recent logs for new connections, and broadcasting to viewers.
 */

import { randomUUID } from 'node:crypto';
import {
    MessageType,
    LogLevel,
    SERVER_DEFAULTS,
    type LogEntry,
    type LogMessage,
} from '@chronoscribe/shared';
import type { ConnectionManager } from './connection-manager.js';

/**
 * Manages log processing and broadcasting.
 */
export class LogBroadcaster {
    /** Buffer of recent logs for new connections */
    private recentLogs: LogEntry[] = [];

    /** Maximum buffer size */
    private readonly bufferSize: number;

    /** Reference to connection manager */
    private readonly connectionManager: ConnectionManager;

    constructor(connectionManager: ConnectionManager, bufferSize?: number) {
        this.connectionManager = connectionManager;
        this.bufferSize = bufferSize ?? SERVER_DEFAULTS.RECENT_LOGS_BUFFER;
    }

    /**
     * Process an incoming log from a source and broadcast to viewers.
     */
    processLog(sourceId: string, sourceName: string, message: LogMessage): LogEntry | null {
        // Create the log entry
        const entry: LogEntry = {
            id: randomUUID(),
            timestamp: new Date().toISOString(),
            source: sourceName,
            level: this.parseLogLevel(message.payload.level),
            content: message.payload.content,
            raw: message.payload.raw,
        };

        // Add to recent logs buffer
        this.recentLogs.push(entry);
        if (this.recentLogs.length > this.bufferSize) {
            this.recentLogs.shift();
        }

        // Broadcast to all viewers
        this.connectionManager.broadcastToViewers({
            type: MessageType.LOG_BROADCAST,
            payload: entry,
        });

        return entry;
    }

    /**
     * Get recent logs for a new viewer connection.
     */
    getRecentLogs(): LogEntry[] {
        return [...this.recentLogs];
    }

    /**
     * Send recent logs to a specific viewer.
     */
    sendRecentLogsToViewer(clientId: string): void {
        this.connectionManager.sendToClient(clientId, {
            type: MessageType.LOGS_BATCH,
            payload: {
                logs: this.recentLogs,
            },
        });
    }

    /**
     * Parse a log level string to the LogLevel enum.
     */
    private parseLogLevel(level: string): LogLevel {
        const normalized = level.toUpperCase();
        if (normalized in LogLevel) {
            return normalized as LogLevel;
        }
        // Common aliases
        if (normalized === 'WARNING') return LogLevel.WARN;
        if (normalized === 'ERR') return LogLevel.ERROR;
        if (normalized === 'DBG') return LogLevel.DEBUG;
        return LogLevel.INFO;
    }

    /**
     * Clear the log buffer.
     */
    clearBuffer(): void {
        this.recentLogs = [];
    }

    /**
     * Get buffer statistics.
     */
    getStats(): { bufferedLogs: number; maxBufferSize: number } {
        return {
            bufferedLogs: this.recentLogs.length,
            maxBufferSize: this.bufferSize,
        };
    }
}
