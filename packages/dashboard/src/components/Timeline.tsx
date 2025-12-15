/**
 * @fileoverview Virtualized log timeline component
 */

import { useRef, useEffect, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useFilteredLogs, useLogStore, useSourcesArray } from '../hooks/useLogStore';
import { LogEntryRow } from './LogEntry';

// Default colors for sources
const DEFAULT_COLORS = [
    '#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA',
    '#FB923C', '#2DD4BF', '#F472B6', '#818CF8', '#4ADE80',
];

export function Timeline() {
    const logs = useFilteredLogs();
    const sources = useSourcesArray();
    const filter = useLogStore((state) => state.filter);
    const isPaused = useLogStore((state) => state.isPaused);
    const setPaused = useLogStore((state) => state.setPaused);

    const parentRef = useRef<HTMLDivElement>(null);
    const scrollEndRef = useRef(true);

    // Build color map
    const sourceColorMap = new Map<string, string>();
    sources.forEach((source) => {
        sourceColorMap.set(source.name, source.color);
    });

    // Get color for a source name
    const getSourceColor = useCallback((sourceName: string) => {
        const color = sourceColorMap.get(sourceName);
        if (color) return color;

        // Fallback to hash-based color
        const allNames = [...new Set(logs.map((l) => l.source))];
        const index = allNames.indexOf(sourceName);
        return DEFAULT_COLORS[index % DEFAULT_COLORS.length] ?? '#60A5FA';
    }, [sourceColorMap, logs]);

    // Virtual list setup
    const virtualizer = useVirtualizer({
        count: logs.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 32, // Estimated row height
        overscan: 20,
    });

    // Auto-scroll to bottom when new logs arrive
    useEffect(() => {
        if (scrollEndRef.current && !isPaused && logs.length > 0) {
            virtualizer.scrollToIndex(logs.length - 1, { align: 'end' });
        }
    }, [logs.length, virtualizer, isPaused]);

    // Handle scroll to detect if user scrolled up
    const handleScroll = useCallback(() => {
        const element = parentRef.current;
        if (!element) return;

        const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 100;
        scrollEndRef.current = atBottom;

        if (!atBottom && !isPaused) {
            setPaused(true);
        } else if (atBottom && isPaused) {
            setPaused(false);
        }
    }, [isPaused, setPaused]);

    // Resume auto-scroll
    const handleResumeScroll = useCallback(() => {
        setPaused(false);
        scrollEndRef.current = true;
        if (logs.length > 0) {
            virtualizer.scrollToIndex(logs.length - 1, { align: 'end' });
        }
    }, [logs.length, virtualizer, setPaused]);

    if (logs.length === 0) {
        return (
            <div className="timeline">
                <div className="timeline__empty">
                    <div className="timeline__empty-icon">🪵</div>
                    <h2 className="timeline__empty-title">No logs yet</h2>
                    <p className="timeline__empty-text">
                        Connect a source with:<br />
                        <code style={{ color: 'var(--color-accent-primary)' }}>
                            npm start | npx logloom --name myapp
                        </code>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="timeline">
            <div
                ref={parentRef}
                className="timeline__container"
                onScroll={handleScroll}
            >
                <div
                    style={{
                        height: `${virtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                    }}
                >
                    {virtualizer.getVirtualItems().map((virtualItem) => {
                        const log = logs[virtualItem.index];
                        if (!log) return null;

                        return (
                            <div
                                key={log.id}
                                data-index={virtualItem.index}
                                ref={virtualizer.measureElement}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    transform: `translateY(${virtualItem.start}px)`,
                                }}
                            >
                                <LogEntryRow
                                    log={log}
                                    sourceColor={getSourceColor(log.source)}
                                    searchText={filter.searchText}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            {isPaused && (
                <button
                    onClick={handleResumeScroll}
                    style={{
                        position: 'absolute',
                        bottom: '16px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        padding: '8px 16px',
                        backgroundColor: 'var(--color-accent-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    }}
                >
                    ↓ Resume auto-scroll
                </button>
            )}
        </div>
    );
}
