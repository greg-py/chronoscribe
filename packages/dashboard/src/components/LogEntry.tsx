/**
 * @fileoverview Log entry component for the timeline
 */

import { memo, useCallback } from 'react';
import type { LogEntry } from '@logloom/shared';
import { formatTimestamp, highlightText } from '../utils/filter';

interface LogEntryRowProps {
    log: LogEntry;
    sourceColor: string;
    searchText: string;
}

/**
 * Format log level for CSS class.
 */
function getLevelClass(level: string): string {
    return `log-entry--${level.toLowerCase()}`;
}

/**
 * Single log entry row component.
 * Memoized for performance with virtualization.
 */
export const LogEntryRow = memo(function LogEntryRow({
    log,
    sourceColor,
    searchText,
}: LogEntryRowProps) {
    const handleClick = useCallback(() => {
        // Copy log content to clipboard
        navigator.clipboard.writeText(log.raw).catch(() => {
            // Fallback: log to console
            console.log('[LogLoom] Log copied:', log.raw);
        });
    }, [log.raw]);

    const segments = highlightText(log.content, searchText);

    return (
        <div
            className={`log-entry ${getLevelClass(log.level)}`}
            onClick={handleClick}
            title="Click to copy"
        >
            <span className="log-entry__time">
                {formatTimestamp(log.timestamp)}
            </span>
            <span className="log-entry__source">
                <span
                    className="log-entry__source-dot"
                    style={{ backgroundColor: sourceColor }}
                />
                <span className="log-entry__source-name">{log.source}</span>
            </span>
            <span className="log-entry__content">
                {segments.map((segment, i) => (
                    segment.highlighted ? (
                        <mark key={i} className="log-entry__highlight">
                            {segment.text}
                        </mark>
                    ) : (
                        <span key={i}>{segment.text}</span>
                    )
                ))}
            </span>
        </div>
    );
});
