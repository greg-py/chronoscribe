/**
 * @fileoverview WebSocket hook for Chronoscribe Dashboard
 * 
 * Custom React hook for managing WebSocket connection to the Chronoscribe server
 * with automatic reconnection and message handling.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import {
    SERVER_DEFAULTS,
    parseMessage,
    type ServerMessage,
} from '@chronoscribe/shared';

/**
 * Connection status for the WebSocket.
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

/**
 * Message handler callback type.
 */
export type MessageHandler = (message: ServerMessage) => void;

/**
 * Options for the useWebSocket hook.
 */
interface UseWebSocketOptions {
    /** WebSocket server URL */
    url?: string;
    /** Message handler callback */
    onMessage: MessageHandler;
    /** Reconnection delay in milliseconds */
    reconnectDelay?: number;
    /** Maximum reconnection attempts */
    maxReconnectAttempts?: number;
}

/**
 * Return value of the useWebSocket hook.
 */
interface UseWebSocketResult {
    /** Current connection status */
    status: ConnectionStatus;
    /** Number of reconnection attempts */
    reconnectAttempts: number;
    /** Manually reconnect */
    reconnect: () => void;
}

/**
 * Default WebSocket URL.
 */
const DEFAULT_WS_URL = `ws://localhost:${SERVER_DEFAULTS.WS_PORT}`;

/**
 * Custom hook for WebSocket connection management.
 * Uses refs for stable values to prevent reconnection loops.
 */
export function useWebSocket(options: UseWebSocketOptions): UseWebSocketResult {
    const {
        url = DEFAULT_WS_URL,
        onMessage,
        reconnectDelay = 2000,
        maxReconnectAttempts = 10,
    } = options;

    const [status, setStatus] = useState<ConnectionStatus>('connecting');
    const [reconnectAttempts, setReconnectAttempts] = useState(0);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<number | null>(null);
    const messageHandlerRef = useRef(onMessage);
    const reconnectAttemptsRef = useRef(0);

    // Keep refs up to date
    messageHandlerRef.current = onMessage;
    reconnectAttemptsRef.current = reconnectAttempts;

    const connect = useCallback(() => {
        // Check if we already have an active connection or connection attempt
        if (wsRef.current) {
            if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
                return;
            }
        }

        // Clear any pending reconnect
        if (reconnectTimeoutRef.current !== null) {
            window.clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        setStatus('connecting');
        console.log('[Dashboard] Attempting to connect to:', url);

        try {
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('[Dashboard] WebSocket Connected');
                setStatus('connected');
                setReconnectAttempts(0);
                reconnectAttemptsRef.current = 0;
            };

            ws.onmessage = (event) => {
                const message = parseMessage(event.data);
                if (message) {
                    messageHandlerRef.current(message as ServerMessage);
                }
            };

            ws.onclose = (event) => {
                console.log('[Dashboard] WebSocket Disconnected', event.code);
                if (wsRef.current === ws) { // Only handle if this is still the current socket
                    setStatus('disconnected');

                    // Attempt to reconnect if appropriate
                    const currentAttempts = reconnectAttemptsRef.current;
                    if (currentAttempts < maxReconnectAttempts) {
                        setStatus('reconnecting');
                        const delay = reconnectDelay * Math.pow(1.5, currentAttempts);
                        console.log(`[Dashboard] Scheduling reconnect in ${Math.round(delay)}ms (attempt ${currentAttempts + 1})`);

                        reconnectTimeoutRef.current = window.setTimeout(() => {
                            const newAttempts = reconnectAttemptsRef.current + 1;
                            setReconnectAttempts(newAttempts);
                            reconnectAttemptsRef.current = newAttempts;
                            connect();
                        }, delay);
                    }
                }
            };

            ws.onerror = (error) => {
                console.error('[Dashboard] WebSocket Error:', error);
            };

        } catch (error) {
            console.error('[Dashboard] Connection creation failed:', error);
            setStatus('disconnected');
        }
    }, [url, reconnectDelay, maxReconnectAttempts]);

    const reconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setReconnectAttempts(0);
        reconnectAttemptsRef.current = 0;
        connect();
    }, [connect]);

    useEffect(() => {
        connect();

        return () => {
            if (reconnectTimeoutRef.current !== null) {
                window.clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                // Remove listeners to prevent state updates on unmounted component
                wsRef.current.onclose = null;
                wsRef.current.onmessage = null;
                wsRef.current.onopen = null;
                wsRef.current.onerror = null;
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [connect]);

    return {
        status,
        reconnectAttempts,
        reconnect,
    };
}
