/**
 * @fileoverview WebSocket message protocol for Chronoscribe
 * 
 * Defines the message types and structures used for communication between
 * CLI clients, the server, and dashboard viewers. All messages are JSON-encoded.
 */

import type { LogEntry, Source } from './types.js';

/**
 * Message types for the WebSocket protocol.
 */
export enum MessageType {
    // Client -> Server messages
    /** CLI client registering as a log source */
    SOURCE_REGISTER = 'SOURCE_REGISTER',
    /** CLI client sending a log entry */
    LOG = 'LOG',
    /** Heartbeat to keep connection alive */
    HEARTBEAT = 'HEARTBEAT',

    // Server -> Client messages
    /** Welcome message with connection info */
    WELCOME = 'WELCOME',
    /** Broadcast of a new log entry to viewers */
    LOG_BROADCAST = 'LOG_BROADCAST',
    /** Source connected notification */
    SOURCE_CONNECTED = 'SOURCE_CONNECTED',
    /** Source disconnected notification */
    SOURCE_DISCONNECTED = 'SOURCE_DISCONNECTED',
    /** Full list of connected sources */
    SOURCES_LIST = 'SOURCES_LIST',
    /** Batch of recent logs for new connections */
    LOGS_BATCH = 'LOGS_BATCH',
    /** Error message */
    ERROR = 'ERROR',
}

/**
 * Client type for identifying the role of a WebSocket connection.
 */
export enum ClientType {
    /** CLI client that produces logs */
    SOURCE = 'SOURCE',
    /** Dashboard viewer that consumes logs */
    VIEWER = 'VIEWER',
}

// ============================================================================
// Client -> Server Messages
// ============================================================================

/**
 * Registration message sent by CLI client when connecting.
 */
export interface SourceRegisterMessage {
    type: MessageType.SOURCE_REGISTER;
    payload: {
        /** Source name (from --name flag) */
        name: string;
        /** Optional preferred color */
        color?: string;
    };
}

/**
 * Log message sent by CLI client.
 */
export interface LogMessage {
    type: MessageType.LOG;
    payload: {
        /** The log content */
        content: string;
        /** Original unprocessed line */
        raw: string;
        /** Detected log level */
        level: string;
        /** Optional timestamp from the log line itself */
        originalTimestamp?: string;
    };
}

/**
 * Heartbeat message to keep connection alive.
 */
export interface HeartbeatMessage {
    type: MessageType.HEARTBEAT;
    payload: {
        timestamp: string;
    };
}

// ============================================================================
// Server -> Client Messages
// ============================================================================

/**
 * Welcome message sent to new connections.
 */
export interface WelcomeMessage {
    type: MessageType.WELCOME;
    payload: {
        /** Server version */
        version: string;
        /** Assigned client ID */
        clientId: string;
        /** Client type (source or viewer) */
        clientType: ClientType;
        /** Assigned color (for sources) */
        color?: string;
    };
}

/**
 * Broadcast of a new log entry to all viewers.
 */
export interface LogBroadcastMessage {
    type: MessageType.LOG_BROADCAST;
    payload: LogEntry;
}

/**
 * Notification when a source connects.
 */
export interface SourceConnectedMessage {
    type: MessageType.SOURCE_CONNECTED;
    payload: Source;
}

/**
 * Notification when a source disconnects.
 */
export interface SourceDisconnectedMessage {
    type: MessageType.SOURCE_DISCONNECTED;
    payload: {
        /** ID of the disconnected source */
        sourceId: string;
        /** Name of the disconnected source */
        sourceName: string;
    };
}

/**
 * Full list of connected sources.
 */
export interface SourcesListMessage {
    type: MessageType.SOURCES_LIST;
    payload: {
        sources: Source[];
    };
}

/**
 * Batch of recent logs sent to new viewer connections.
 */
export interface LogsBatchMessage {
    type: MessageType.LOGS_BATCH;
    payload: {
        logs: LogEntry[];
    };
}

/**
 * Error message.
 */
export interface ErrorMessage {
    type: MessageType.ERROR;
    payload: {
        code: string;
        message: string;
    };
}

// ============================================================================
// Union Types
// ============================================================================

/**
 * All possible client-to-server messages.
 */
export type ClientMessage =
    | SourceRegisterMessage
    | LogMessage
    | HeartbeatMessage;

/**
 * All possible server-to-client messages.
 */
export type ServerMessage =
    | WelcomeMessage
    | LogBroadcastMessage
    | SourceConnectedMessage
    | SourceDisconnectedMessage
    | SourcesListMessage
    | LogsBatchMessage
    | ErrorMessage;

/**
 * Any protocol message.
 */
export type ProtocolMessage = ClientMessage | ServerMessage;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Type guard to check if a message is a specific type.
 */
export function isMessageType<T extends ProtocolMessage>(
    message: unknown,
    type: MessageType
): message is T {
    return (
        typeof message === 'object' &&
        message !== null &&
        'type' in message &&
        (message as { type: unknown }).type === type
    );
}

/**
 * Safely parse a JSON message from a WebSocket.
 * Returns null if parsing fails or message is malformed.
 */
export function parseMessage(data: string): ProtocolMessage | null {
    try {
        const parsed = JSON.parse(data) as unknown;
        if (
            typeof parsed === 'object' &&
            parsed !== null &&
            'type' in parsed &&
            'payload' in parsed
        ) {
            return parsed as ProtocolMessage;
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Serialize a message for sending over WebSocket.
 */
export function serializeMessage(message: ProtocolMessage): string {
    return JSON.stringify(message);
}

/**
 * Create a log message for sending from CLI.
 */
export function createLogMessage(
    content: string,
    raw: string,
    level: string,
    originalTimestamp?: string
): LogMessage {
    const payload: LogMessage['payload'] = {
        content,
        raw,
        level,
    };
    if (originalTimestamp !== undefined) {
        payload.originalTimestamp = originalTimestamp;
    }
    return {
        type: MessageType.LOG,
        payload,
    };
}

/**
 * Create a source register message.
 */
export function createSourceRegisterMessage(
    name: string,
    color?: string
): SourceRegisterMessage {
    const payload: SourceRegisterMessage['payload'] = { name };
    if (color !== undefined) {
        payload.color = color;
    }
    return {
        type: MessageType.SOURCE_REGISTER,
        payload,
    };
}

/**
 * Create a heartbeat message.
 */
export function createHeartbeatMessage(): HeartbeatMessage {
    return {
        type: MessageType.HEARTBEAT,
        payload: {
            timestamp: new Date().toISOString(),
        },
    };
}
