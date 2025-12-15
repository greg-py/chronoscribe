/**
 * @fileoverview Public API for @logloom/shared package
 * 
 * Re-exports all types, constants, and utilities needed by other packages.
 */

// Types
export {
    LogLevel,
    LOG_LEVEL_PRIORITY,
    type LogEntry,
    type Source,
    type Filter,
    type AlertConfig,
    DEFAULT_FILTER,
    DEFAULT_ALERT_CONFIG,
    SOURCE_COLORS,
    MAX_LOG_ENTRIES,
    SERVER_DEFAULTS,
} from './types.js';

// Protocol
export {
    MessageType,
    ClientType,
    type SourceRegisterMessage,
    type LogMessage,
    type HeartbeatMessage,
    type WelcomeMessage,
    type LogBroadcastMessage,
    type SourceConnectedMessage,
    type SourceDisconnectedMessage,
    type SourcesListMessage,
    type LogsBatchMessage,
    type ErrorMessage,
    type ClientMessage,
    type ServerMessage,
    type ProtocolMessage,
    isMessageType,
    parseMessage,
    serializeMessage,
    createLogMessage,
    createSourceRegisterMessage,
    createHeartbeatMessage,
} from './protocol.js';
