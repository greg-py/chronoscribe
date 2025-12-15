/**
 * @fileoverview Log parser for detecting log levels
 * 
 * Analyzes log lines to extract timestamps and log levels using
 * common patterns from various frameworks and log formats.
 */

import { LogLevel } from '@logloom/shared';

/**
 * Result of parsing a log line.
 */
export interface ParsedLog {
    /** Detected log level */
    level: LogLevel;
    /** Processed content for display */
    content: string;
    /** Original timestamp if found in the log */
    originalTimestamp?: string;
}

/**
 * Common log level patterns from various frameworks.
 * Listed in order of priority (most specific first).
 */
const LEVEL_PATTERNS: Array<{ pattern: RegExp; level: LogLevel }> = [
    // ERROR patterns
    { pattern: /\b(ERROR|ERR|FATAL|CRITICAL|CRIT)\b/i, level: LogLevel.ERROR },
    { pattern: /\[error\]/i, level: LogLevel.ERROR },
    { pattern: /❌|🔴|💥/, level: LogLevel.ERROR },

    // WARN patterns
    { pattern: /\b(WARN|WARNING|WRN)\b/i, level: LogLevel.WARN },
    { pattern: /\[warn(ing)?\]/i, level: LogLevel.WARN },
    { pattern: /⚠️|🟡|🟠/, level: LogLevel.WARN },

    // DEBUG patterns
    { pattern: /\b(DEBUG|DBG|TRACE|VERBOSE)\b/i, level: LogLevel.DEBUG },
    { pattern: /\[debug\]/i, level: LogLevel.DEBUG },
    { pattern: /🔍|🐛/, level: LogLevel.DEBUG },

    // INFO patterns (checked last as it's the default)
    { pattern: /\b(INFO|INF|LOG)\b/i, level: LogLevel.INFO },
    { pattern: /\[info\]/i, level: LogLevel.INFO },
    { pattern: /ℹ️|🟢|✅/, level: LogLevel.INFO },
];

/**
 * Patterns for extracting timestamps from log lines.
 */
const TIMESTAMP_PATTERNS: RegExp[] = [
    // ISO 8601: 2023-12-15T14:30:00.000Z
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?/,
    // Common format: 2023-12-15 14:30:00
    /\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/,
    // Time only: 14:30:00 or 14:30:00.123
    /\d{2}:\d{2}:\d{2}(?:\.\d{3})?/,
    // Date command format: Sun Dec 15 14:30:00 EST 2023
    /[A-Z][a-z]{2}\s+[A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}/,
];

/**
 * Parse a log line to extract level, content, and timestamp.
 */
export function parseLogLine(line: string, customPattern?: string): ParsedLog {
    let level = LogLevel.INFO;
    let originalTimestamp: string | undefined;

    // Try custom pattern first if provided
    if (customPattern) {
        try {
            const regex = new RegExp(customPattern);
            const match = line.match(regex);
            if (match?.groups?.['level']) {
                level = normalizeLevel(match.groups['level']);
            }
        } catch {
            // Custom pattern failed, continue with defaults
        }
    }

    // Try default patterns if no custom pattern or it didn't match
    if (level === LogLevel.INFO && !customPattern) {
        for (const { pattern, level: detectedLevel } of LEVEL_PATTERNS) {
            if (pattern.test(line)) {
                level = detectedLevel;
                break;
            }
        }
    }

    // Try to extract timestamp
    for (const pattern of TIMESTAMP_PATTERNS) {
        const match = line.match(pattern);
        if (match?.[0]) {
            originalTimestamp = match[0];
            break;
        }
    }

    return {
        level,
        content: line.trim(),
        originalTimestamp,
    };
}

/**
 * Normalize a level string to a LogLevel enum value.
 */
function normalizeLevel(levelStr: string): LogLevel {
    const upper = levelStr.toUpperCase();

    if (upper === 'ERROR' || upper === 'ERR' || upper === 'FATAL' || upper === 'CRITICAL') {
        return LogLevel.ERROR;
    }
    if (upper === 'WARN' || upper === 'WARNING' || upper === 'WRN') {
        return LogLevel.WARN;
    }
    if (upper === 'DEBUG' || upper === 'DBG' || upper === 'TRACE' || upper === 'VERBOSE') {
        return LogLevel.DEBUG;
    }
    if (upper === 'INFO' || upper === 'INF' || upper === 'LOG') {
        return LogLevel.INFO;
    }

    return LogLevel.INFO;
}
