/**
 * @fileoverview Log details slide-out panel
 */

import { useEffect, useCallback } from 'react';
import type { LogEntry } from '@logloom/shared';
import { useLogStore } from '../hooks/useLogStore';
import { tryParseJSON, formatDetailTimestamp, isStackTrace, parseStackTrace } from '../utils/stackTrace';

interface LogDetailsPanelProps {
    log: LogEntry;
    onClose: () => void;
}

export function LogDetailsPanel({ log, onClose }: LogDetailsPanelProps) {
    const selectNextLog = useLogStore((state) => state.selectNextLog);
    const selectPreviousLog = useLogStore((state) => state.selectPreviousLog);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectNextLog();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectPreviousLog();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, selectNextLog, selectPreviousLog]);

    // Try to parse as JSON
    const jsonResult = tryParseJSON(log.content);

    // Check if it's a stack trace
    const hasStackTrace = isStackTrace(log.content);
    const stackTraceLines = hasStackTrace ? parseStackTrace(log.content) : [];

    // Copy handlers
    const copyContent = useCallback(() => {
        navigator.clipboard.writeText(log.content).then(() => {
            console.log('[LogLoom] Content copied to clipboard');
        });
    }, [log.content]);

    const copyRaw = useCallback(() => {
        navigator.clipboard.writeText(log.raw).then(() => {
            console.log('[LogLoom] Raw log copied to clipboard');
        });
    }, [log.raw]);

    const copyJSON = useCallback(() => {
        if (jsonResult.formatted) {
            navigator.clipboard.writeText(jsonResult.formatted).then(() => {
                console.log('[LogLoom] Formatted JSON copied to clipboard');
            });
        }
    }, [jsonResult.formatted]);

    return (
        <>
            <div className="log-details-panel__backdrop" onClick={onClose} />
            <aside className="log-details-panel">
                <header className="log-details-panel__header">
                    <h2>Log Details</h2>
                    <button
                        className="log-details-panel__close"
                        onClick={onClose}
                        title="Close (Esc)"
                    >
                        ×
                    </button>
                </header>

                <div className="log-details-panel__content">
                    {/* Metadata Section */}
                    <section className="log-details-panel__section">
                        <h3>Metadata</h3>
                        <dl className="log-details-panel__metadata">
                            <div className="log-details-panel__metadata-row">
                                <dt>Timestamp</dt>
                                <dd>{formatDetailTimestamp(log.timestamp)}</dd>
                            </div>
                            <div className="log-details-panel__metadata-row">
                                <dt>Source</dt>
                                <dd>
                                    <span className="source-badge" style={{ fontSize: '13px' }}>
                                        {log.source}
                                    </span>
                                </dd>
                            </div>
                            <div className="log-details-panel__metadata-row">
                                <dt>Level</dt>
                                <dd>
                                    <span className={`level-badge level-badge--${log.level.toLowerCase()}`}>
                                        {log.level}
                                    </span>
                                </dd>
                            </div>
                            <div className="log-details-panel__metadata-row">
                                <dt>ID</dt>
                                <dd>
                                    <code style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                        {log.id}
                                    </code>
                                </dd>
                            </div>
                        </dl>
                    </section>

                    {/* Content Section */}
                    <section className="log-details-panel__section">
                        <div className="log-details-panel__section-header">
                            <h3>Content</h3>
                            <button
                                className="log-details-panel__copy-btn"
                                onClick={copyContent}
                                title="Copy content"
                            >
                                Copy
                            </button>
                        </div>

                        {jsonResult.success ? (
                            <>
                                <button
                                    className="log-details-panel__copy-btn"
                                    onClick={copyJSON}
                                    title="Copy formatted JSON"
                                    style={{ marginBottom: '8px' }}
                                >
                                    Copy Formatted
                                </button>
                                <pre className="log-details-panel__json">{jsonResult.formatted}</pre>
                            </>
                        ) : hasStackTrace ? (
                            <div className="log-details-panel__stack-trace">
                                {stackTraceLines.map((line, index) => (
                                    <div
                                        key={index}
                                        className={`stack-trace-line ${line.isError ? 'stack-trace-line--error' : ''
                                            }`}
                                        style={{ paddingLeft: `${line.indent * 16}px` }}
                                    >
                                        {line.text}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <pre className="log-details-panel__pre">{log.content}</pre>
                        )}
                    </section>

                    {/* Raw Log Section */}
                    {log.raw !== log.content && (
                        <section className="log-details-panel__section">
                            <div className="log-details-panel__section-header">
                                <h3>Raw Log</h3>
                                <button
                                    className="log-details-panel__copy-btn"
                                    onClick={copyRaw}
                                    title="Copy raw log"
                                >
                                    Copy
                                </button>
                            </div>
                            <pre className="log-details-panel__pre">{log.raw}</pre>
                        </section>
                    )}
                </div>

                <footer className="log-details-panel__footer">
                    <button
                        className="log-details-panel__nav-btn"
                        onClick={selectPreviousLog}
                        title="Previous log (↑)"
                    >
                        ← Previous
                    </button>
                    <button
                        className="log-details-panel__nav-btn"
                        onClick={selectNextLog}
                        title="Next log (↓)"
                    >
                        Next →
                    </button>
                </footer>
            </aside>
        </>
    );
}
