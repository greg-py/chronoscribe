/**
 * @fileoverview Main LogLoom Dashboard Application
 * 
 * Orchestrates the WebSocket connection and renders the log viewer UI.
 */

import { useCallback, useRef } from 'react';
import { MessageType, type ServerMessage } from '@logloom/shared';
import { useWebSocket, type ConnectionStatus } from './hooks/useWebSocket';
import { useLogStore } from './hooks/useLogStore';
import { FilterBar } from './components/FilterBar';
import { Timeline } from './components/Timeline';
import { AlertConfig } from './components/AlertConfig';
import { playAlertSound, showNotification, matchesAlertPattern } from './utils/notifications';

/**
 * Get status indicator dot class.
 */
function getStatusDotClass(status: ConnectionStatus): string {
    switch (status) {
        case 'connected':
            return 'header__status-dot';
        case 'connecting':
        case 'reconnecting':
            return 'header__status-dot'; // Could add animation class
        case 'disconnected':
            return 'header__status-dot header__status-dot--disconnected';
        default:
            return 'header__status-dot header__status-dot--disconnected';
    }
}

/**
 * Get status text.
 */
function getStatusText(status: ConnectionStatus, attempts: number): string {
    switch (status) {
        case 'connected':
            return 'Connected';
        case 'connecting':
            return 'Connecting...';
        case 'reconnecting':
            return `Reconnecting (${attempts})...`;
        case 'disconnected':
            return 'Disconnected';
        default:
            return 'Unknown';
    }
}

function App() {
    // Store actions
    const addLog = useLogStore((state) => state.addLog);
    const addLogs = useLogStore((state) => state.addLogs);
    const addSource = useLogStore((state) => state.addSource);
    const removeSource = useLogStore((state) => state.removeSource);
    const setSources = useLogStore((state) => state.setSources);
    const logs = useLogStore((state) => state.logs);
    const alertConfig = useLogStore((state) => state.alertConfig);

    // Track last alert time to debounce
    const lastAlertTimeRef = useRef(0);

    // Handle incoming WebSocket messages
    const handleMessage = useCallback((message: ServerMessage) => {
        switch (message.type) {
            case MessageType.LOG_BROADCAST: {
                const log = message.payload;
                addLog(log);

                // Check for alert pattern match
                if (
                    alertConfig.enabled &&
                    alertConfig.pattern &&
                    matchesAlertPattern(log.content, alertConfig.pattern)
                ) {
                    const now = Date.now();
                    // Debounce alerts to max 1 per second
                    if (now - lastAlertTimeRef.current > 1000) {
                        lastAlertTimeRef.current = now;

                        if (alertConfig.playSound) {
                            playAlertSound();
                        }
                        if (alertConfig.showNotification) {
                            showNotification(
                                `LogLoom Alert: ${log.source}`,
                                log.content.slice(0, 100)
                            );
                        }
                    }
                }
                break;
            }

            case MessageType.LOGS_BATCH: {
                addLogs(message.payload.logs);
                break;
            }

            case MessageType.SOURCE_CONNECTED: {
                addSource(message.payload);
                break;
            }

            case MessageType.SOURCE_DISCONNECTED: {
                removeSource(message.payload.sourceId);
                break;
            }

            case MessageType.SOURCES_LIST: {
                setSources(message.payload.sources);
                break;
            }

            case MessageType.WELCOME: {
                console.log('[Dashboard] Welcome from server:', message.payload.version);
                break;
            }

            case MessageType.ERROR: {
                console.error('[Dashboard] Server error:', message.payload);
                break;
            }
        }
    }, [addLog, addLogs, addSource, removeSource, setSources, alertConfig]);

    // WebSocket connection
    const { status, reconnectAttempts, reconnect } = useWebSocket({
        onMessage: handleMessage,
    });

    return (
        <div className="app">
            {/* Header */}
            <header className="header">
                <div className="header__logo">
                    <span className="header__logo-icon">🪵</span>
                    <span>LogLoom</span>
                </div>
                <div className="header__status">
                    <span className={getStatusDotClass(status)} />
                    <span>{getStatusText(status, reconnectAttempts)}</span>
                    {status === 'disconnected' && (
                        <button
                            onClick={reconnect}
                            style={{
                                marginLeft: '8px',
                                padding: '4px 8px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                background: 'var(--color-bg-tertiary)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '4px',
                                color: 'var(--color-text-secondary)',
                            }}
                        >
                            Retry
                        </button>
                    )}
                </div>
            </header>

            {/* Filter bar */}
            <FilterBar />

            {/* Log timeline */}
            <Timeline />

            {/* Alert configuration */}
            <AlertConfig />

            {/* Footer with stats */}
            <footer className="footer">
                <div className="footer__stats">
                    <span>{logs.length.toLocaleString()} logs</span>
                </div>
                <div>
                    <span>LogLoom v0.1.0</span>
                </div>
            </footer>
        </div>
    );
}

export default App;
