/**
 * @fileoverview Chronoscribe WebSocket server entry point
 * 
 * Starts the WebSocket server that receives logs from CLI clients
 * and broadcasts them to dashboard viewers.
 */


import { randomUUID } from 'node:crypto';
import { WebSocketServer, type WebSocket } from 'ws';
import path from 'node:path';
import {
    MessageType,
    ClientType,
    SERVER_DEFAULTS,
    parseMessage,
    isMessageType,
    type SourceRegisterMessage,
    type LogMessage,
} from '@chronoscribe/shared';
import { ConnectionManager } from './connection-manager.js';
import { LogBroadcaster } from './log-broadcaster.js';
import { startStaticServer } from './static-server.js';

// Server version
const VERSION = '0.1.0';

/**
 * Options for starting the server.
 */
export interface ServerOptions {
    wsPort?: number;
    httpPort?: number;
    dashboardPath?: string;
}

/**
 * Start the Chronoscribe WebSocket server and optional static dashboard server.
 */
export function startServer(options: ServerOptions = {}): void {
    const {
        wsPort = SERVER_DEFAULTS.WS_PORT,
        httpPort = 3211,
        dashboardPath
    } = options;

    const connectionManager = new ConnectionManager();
    const logBroadcaster = new LogBroadcaster(connectionManager);

    const wss = new WebSocketServer({ port: wsPort });

    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🪵 Chronoscribe Server v${VERSION}                          ║
║                                                           ║
║   WebSocket server running on ws://localhost:${wsPort}        ║
`);

    if (dashboardPath) {
        startStaticServer(dashboardPath, httpPort);
        console.log(`║   Dashboard running on http://localhost:${httpPort}             ║`);
    }

    console.log(`║                                                           ║
║   Waiting for connections...                              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);

    wss.on('connection', (ws: WebSocket) => {
        const clientId = randomUUID();

        // Track pending registration state
        let isRegistered = false;
        let clientType: ClientType | null = null;

        // Set up ping/pong for connection health
        const pingInterval = setInterval(() => {
            if (ws.readyState === ws.OPEN) {
                ws.ping();
            }
        }, 30000);

        ws.on('message', (data: Buffer) => {
            const message = parseMessage(data.toString());
            if (!message) {
                console.warn(`[Server] Invalid message from ${clientId}`);
                return;
            }

            // Handle source registration
            if (isMessageType<SourceRegisterMessage>(message, MessageType.SOURCE_REGISTER)) {
                const { name, color } = message.payload;
                const client = connectionManager.registerSource(ws, clientId, name, color);
                isRegistered = true;
                clientType = ClientType.SOURCE;

                // Send welcome message
                connectionManager.sendToClient(clientId, {
                    type: MessageType.WELCOME,
                    payload: {
                        version: VERSION,
                        clientId,
                        clientType: ClientType.SOURCE,
                        color: client.source?.color,
                    },
                });
                return;
            }

            // Handle log messages from sources
            if (isMessageType<LogMessage>(message, MessageType.LOG)) {
                const client = connectionManager.getClient(clientId);
                if (client && client.type === ClientType.SOURCE && client.source) {
                    logBroadcaster.processLog(clientId, client.source.name, message);
                }
                return;
            }

            // Handle heartbeat
            if (message.type === MessageType.HEARTBEAT) {
                // Just acknowledge - the ping/pong handles actual health
                return;
            }
        });

        ws.on('close', () => {
            clearInterval(pingInterval);
            connectionManager.removeClient(clientId);
        });

        ws.on('error', (error) => {
            console.error(`[Server] WebSocket error for ${clientId}:`, error.message);
        });

        // If no registration within 5 seconds, treat as viewer
        setTimeout(() => {
            if (!isRegistered) {
                connectionManager.registerViewer(ws, clientId);
                isRegistered = true;
                clientType = ClientType.VIEWER;

                // Send welcome message
                connectionManager.sendToClient(clientId, {
                    type: MessageType.WELCOME,
                    payload: {
                        version: VERSION,
                        clientId,
                        clientType: ClientType.VIEWER,
                    },
                });

                // Send current sources list
                connectionManager.sendToClient(clientId, {
                    type: MessageType.SOURCES_LIST,
                    payload: {
                        sources: connectionManager.getSources(),
                    },
                });

                // Send recent logs
                logBroadcaster.sendRecentLogsToViewer(clientId);
            }
        }, 100); // Short delay to allow quick registration
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n[Server] Shutting down...');
        wss.close(() => {
            console.log('[Server] Goodbye!');
            process.exit(0);
        });
    });

    process.on('SIGTERM', () => {
        wss.close(() => {
            process.exit(0);
        });
    });
}

// Auto-start check removed for bundling compatibility
// The CLI is now the primary entry point.
