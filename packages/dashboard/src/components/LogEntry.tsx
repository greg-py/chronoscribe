/**
 * @fileoverview Log entry component for the timeline
 */

import { memo, useCallback, useState } from 'react';
import type { LogEntry } from '@logloom/shared';
import { formatTimestamp, highlightText } from '../utils/filter';
import { isMultiLine, isStackTrace, parseStackTrace, truncateForTimeline } from '../utils/stackTrace';
import { useLogStore } from '../hooks/useLogStore';

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
    const [isExpanded, setIsExpanded] = useState(false);
    const setSelectedLog = useLogStore((state) => state.setSelectedLog);

    const multiLine = isMultiLine(log.content);
    const hasStackTrace = multiLine && isStackTrace(log.content);
    const { preview, isTruncated } = truncateForTimeline(log.content, 3);

    const handleClick = useCallback((e: React.MouseEvent) => {
        // If clicking the expand button, don't open details panel
        if ((e.target as HTMLElement).closest('.log-entry__expand-btn')) {
            return;
        }
        setSelectedLog(log.id);
    }, [log.id, setSelectedLog]);

    const handleExpandToggle = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    }, [isExpanded]);

    const segments = highlightText(isExpanded || !isTruncated ? log.content : preview, searchText);

    // Parse stack trace if expanded and is stack trace
    const stackTraceLines = hasStackTrace && isExpanded ? parseStackTrace(log.content) : [];

    return (
        <div
            className={`log-entry ${getLevelClass(log.level)} ${isExpanded ? 'log-entry--expanded' : ''}`}
            onClick={handleClick}
            title="Click to view details"
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
                {hasStackTrace && isExpanded ? (
                    <div className="log-entry__stack-trace">
                        {stackTraceLines.map((line, i) => (
                            <div
                                key={i}
                                className={`stack-trace-line ${line.isError ? 'stack-trace-line--error' : ''
                                    } ${line.isFrame ? 'stack-trace-line--frame' : ''}`}
                                style={{ paddingLeft: `${line.indent * 12}px` }}
                            >
                                {line.text}
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        {segments.map((segment, i) => (
                            segment.highlighted ? (
                                <mark key={i} className="log-entry__highlight">
                                    {segment.text}
                                </mark>
                            ) : (
                                <span key={i}>{segment.text}</span>
                            )
                        ))}
                    </>
                )}
                {multiLine && (
                    <button
                        className="log-entry__expand-btn"
                        onClick={handleExpandToggle}
                        title={isExpanded ? 'Collapse' : 'Expand'}
                    >
                        {isExpanded ? '▲ Collapse' : '▼ Expand'}
                    </button>
                )}
            </span>
        </div>
    );
});
