/**
 * @fileoverview WebSocket client for Chronoscribe CLI
 * 
 * Manages the WebSocket connection to the Chronoscribe server with
 * automatic reconnection and message buffering.
 */

import WebSocket from 'ws';
import {
    MessageType,
    createSourceRegisterMessage,
    createLogMessage,
    parseMessage,
    serializeMessage,
    type WelcomeMessage,
    isMessageType,
} from '@chronoscribe/shared';
import type { ParsedLog } from './log-parser.js';

/**
 * Configuration for the WebSocket client.
 */
export interface WebSocketClientConfig {
    /** Server URL */
    serverUrl: string;
    /** Source name */
    sourceName: string;
    /** Preferred color (optional, can be undefined) */
    color?: string | undefined;
    /** Reconnection settings */
    reconnect?: {
        enabled: boolean;
        maxAttempts: number;
        baseDelayMs: number;
    };
}

/**
 * Default reconnection settings.
 */
const DEFAULT_RECONNECT = {
    enabled: true,
    maxAttempts: 10,
    baseDelayMs: 1000,
};

/**
 * WebSocket client for sending logs to the server.
 */
export class WebSocketClient {
    private ws: WebSocket | null = null;
    private serverUrl: string;
    private sourceName: string;
    private color: string | undefined;
    private reconnectConfig: {
        enabled: boolean;
        maxAttempts: number;
        baseDelayMs: number;
    };
    private isConnected = false;
    private reconnectAttempts = 0;
    private messageBuffer: string[] = [];
    private assignedColor?: string;
    private shouldReconnect = true;

    constructor(config: WebSocketClientConfig) {
        this.serverUrl = config.serverUrl;
        this.sourceName = config.sourceName;
        this.color = config.color;
        this.reconnectConfig = config.reconnect ?? DEFAULT_RECONNECT;
    }

    /**
     * Connect to the server.
     */
    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.serverUrl);

                this.ws.on('open', () => {
                    console.log(`[Chronoscribe] Connected to ${this.serverUrl}`);
                    this.reconnectAttempts = 0;

                    // Register as a source
                    const registerMsg = createSourceRegisterMessage(
                        this.sourceName,
                        this.color
                    );
                    this.ws?.send(serializeMessage(registerMsg));
                });

                this.ws.on('message', (data: Buffer) => {
                    const message = parseMessage(data.toString());
                    if (!message) return;

                    if (isMessageType<WelcomeMessage>(message, MessageType.WELCOME)) {
                        this.isConnected = true;
                        this.assignedColor = message.payload.color;
                        console.log(`[Chronoscribe] Registered as "${this.sourceName}" (color: ${this.assignedColor})`);

                        // Send any buffered messages
                        this.flushBuffer();
                        resolve();
                    }

                    if (message.type === MessageType.ERROR) {
                        console.error(`[Chronoscribe] Server error: ${message.payload.message}`);
                    }
                });

                this.ws.on('close', () => {
                    this.isConnected = false;
                    if (this.shouldReconnect && this.reconnectConfig.enabled) {
                        this.attemptReconnect();
                    }
                });

                this.ws.on('error', (error) => {
                    if (!this.isConnected) {
                        // Connection failed
                        reject(error);
                    } else {
                        console.error(`[Chronoscribe] WebSocket error: ${error.message}`);
                    }
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Attempt to reconnect with exponential backoff.
     */
    private attemptReconnect(): void {
        if (this.reconnectAttempts >= this.reconnectConfig.maxAttempts) {
            console.error('[Chronoscribe] Max reconnection attempts reached. Exiting.');
            process.exit(1);
        }

        const delay = this.reconnectConfig.baseDelayMs * Math.pow(2, this.reconnectAttempts);
        this.reconnectAttempts++;

        console.log(`[Chronoscribe] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.reconnectConfig.maxAttempts})...`);

        setTimeout(() => {
            this.connect().catch(() => {
                // Will trigger another reconnect through the 'close' event
            });
        }, delay);
    }

    /**
     * Send a log to the server.
     */
    sendLog(parsedLog: ParsedLog, rawLine: string): void {
        const message = createLogMessage(
            parsedLog.content,
            rawLine,
            parsedLog.level,
            parsedLog.originalTimestamp
        );
        const serialized = serializeMessage(message);

        if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(serialized);
        } else {
            // Buffer the message for later
            this.messageBuffer.push(serialized);
            // Limit buffer size to prevent memory issues
            if (this.messageBuffer.length > 1000) {
                this.messageBuffer.shift();
            }
        }
    }

    /**
     * Flush the message buffer.
     */
    private flushBuffer(): void {
        if (this.messageBuffer.length === 0) return;

        console.log(`[Chronoscribe] Sending ${this.messageBuffer.length} buffered messages...`);

        for (const message of this.messageBuffer) {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(message);
            }
        }

        this.messageBuffer = [];
    }

    /**
     * Close the connection.
     */
    close(): void {
        this.shouldReconnect = false;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    /**
     * Get connection status.
     */
    get connected(): boolean {
        return this.isConnected;
    }
}
