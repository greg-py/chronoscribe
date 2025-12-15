/**
 * @fileoverview Timestamp parsing and formatting utilities
 */

export interface ParsedTimestamp {
    found: boolean;
    timestamp: Date | null;
    format: string | null;
    remainder: string;
}

export type TimeDisplayMode = 'relative' | 'absolute' | 'both';

/**
 * Common timestamp patterns with parsers.
 */
const TIMESTAMP_PATTERNS = [
    {
        name: 'ISO8601',
        regex: /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?)/,
        parse: (match: string) => new Date(match),
    },
    {
        name: 'ISO8601_Simple',
        regex: /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d{3})?)/,
        parse: (match: string) => new Date(match.replace(' ', 'T')),
    },
    {
        name: 'RFC2822',
        regex: /((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\s+\d{2}:\d{2}:\d{2})/,
        parse: (match: string) => new Date(match),
    },
    {
        name: 'UNIX_Seconds',
        regex: /^(\d{10})(?:\s|$)/,
        parse: (match: string) => new Date(parseInt(match, 10) * 1000),
    },
    {
        name: 'UNIX_Milliseconds',
        regex: /^(\d{13})(?:\s|$)/,
        parse: (match: string) => new Date(parseInt(match, 10)),
    },
    {
        name: 'Common',
        regex: /(\d{4}[-\/]\d{2}[-\/]\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d{3})?)/,
        parse: (match: string) => new Date(match.replace(/\//g, '-')),
    },
    {
        name: 'Syslog',
        regex: /^((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})/,
        parse: (match: string) => {
            const year = new Date().getFullYear();
            return new Date(`${match} ${year}`);
        },
    },
    {
        name: 'ShortDate',
        regex: /^(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/,
        parse: (match: string) => new Date(match),
    },
] as const;

/**
 * Parse timestamp from log content.
 * Returns parsed timestamp and remaining content.
 */
export function parseTimestamp(content: string): ParsedTimestamp {
    const trimmed = content.trim();

    for (const pattern of TIMESTAMP_PATTERNS) {
        const match = trimmed.match(pattern.regex);
        if (match) {
            try {
                const timestamp = pattern.parse(match[1]);
                if (timestamp && !isNaN(timestamp.getTime())) {
                    return {
                        found: true,
                        timestamp,
                        format: pattern.name,
                        remainder: trimmed.replace(pattern.regex, '').trim(),
                    };
                }
            } catch {
                // Try next pattern
                continue;
            }
        }
    }

    return {
        found: false,
        timestamp: null,
        format: null,
        remainder: content,
    };
}

/**
 * Format timestamp as relative time (e.g., "2m ago").
 */
export function formatRelativeTime(timestamp: string | Date): string {
    const now = Date.now();
    const then = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp.getTime();
    const diff = now - then;

    // Handle future timestamps
    if (diff < 0) {
        const future = Math.abs(diff);
        const seconds = Math.floor(future / 1000);
        if (seconds < 60) return `in ${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `in ${minutes}m`;
        return 'in the future';
    }

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);

    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (weeks < 4) return `${weeks}w ago`;
    if (months < 12) return `${months}mo ago`;

    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

/**
 * Format timestamp as absolute time.
 */
export function formatAbsoluteTime(
    timestamp: string | Date,
    format: 'short' | 'long' = 'short'
): string {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

    if (format === 'short') {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        });
    }

    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
}

/**
 * Format timestamp with milliseconds.
 */
export function formatDetailTimestamp(timestamp: string | Date): string {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

    const dateStr = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });

    const timeStr = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });

    const ms = date.getMilliseconds().toString().padStart(3, '0');

    return `${dateStr} ${timeStr}.${ms}`;
}

/**
 * Get timestamp for display based on mode.
 */
export function formatTimestamp(
    timestamp: string | Date,
    mode: TimeDisplayMode
): { primary: string; secondary?: string; tooltip: string } {
    const relative = formatRelativeTime(timestamp);
    const absolute = formatAbsoluteTime(timestamp, 'short');
    const full = formatDetailTimestamp(timestamp);

    switch (mode) {
        case 'relative':
            return {
                primary: relative,
                tooltip: full,
            };
        case 'absolute':
            return {
                primary: absolute,
                tooltip: full,
            };
        case 'both':
            return {
                primary: relative,
                secondary: absolute,
                tooltip: full,
            };
    }
}

/**
 * Check if timestamp is from today.
 */
export function isToday(timestamp: string | Date): boolean {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const today = new Date();

    return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
    );
}

/**
 * Get time ago update interval in ms based on age.
 * Returns optimal update frequency for relative time display.
 */
export function getUpdateInterval(timestamp: string | Date): number {
    const now = Date.now();
    const then = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp.getTime();
    const diff = now - then;

    const seconds = diff / 1000;

    if (seconds < 60) return 1000; // Update every second for "Xs ago"
    if (seconds < 3600) return 10000; // Every 10s for minutes
    if (seconds < 86400) return 60000; // Every minute for hours
    return 300000; // Every 5 minutes for days+
}
