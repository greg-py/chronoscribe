/**
 * @fileoverview Connection manager for Chronoscribe WebSocket server
 * 
 * Handles tracking of connected sources (CLI clients) and viewers (dashboards),
 * manages source color assignment, and provides methods for broadcasting messages.
 */

import type { WebSocket } from 'ws';
import {
    ClientType,
    MessageType,
    SOURCE_COLORS,
    type Source,
    type ServerMessage,
    serializeMessage,
} from '@chronoscribe/shared';

/**
 * Represents a connected client (either source or viewer).
 */
export interface ConnectedClient {
    /** WebSocket connection */
    ws: WebSocket;
    /** Unique client ID */
    id: string;
    /** Client type */
    type: ClientType;
    /** Source info (only for SOURCE clients) */
    source?: Source;
}

/**
 * Manages WebSocket connections and client state.
 */
export class ConnectionManager {
    /** Map of client ID to connected client */
    private clients: Map<string, ConnectedClient> = new Map();

    /** Counter for color assignment */
    private colorIndex = 0;

    /** Set of used source names (for uniqueness) */
    private usedSourceNames: Set<string> = new Set();

    /**
     * Get the next color from the palette.
     */
    private getNextColor(): string {
        const color = SOURCE_COLORS[this.colorIndex % SOURCE_COLORS.length];
        this.colorIndex++;
        return color ?? SOURCE_COLORS[0] ?? '#60A5FA';
    }

    /**
     * Ensure a source name is unique by appending a number if needed.
     */
    private ensureUniqueName(baseName: string): string {
        let name = baseName;
        let counter = 1;
        while (this.usedSourceNames.has(name)) {
            name = `${baseName}-${counter}`;
            counter++;
        }
        return name;
    }

    /**
     * Register a new viewer (dashboard) connection.
     */
    registerViewer(ws: WebSocket, clientId: string): ConnectedClient {
        const client: ConnectedClient = {
            ws,
            id: clientId,
            type: ClientType.VIEWER,
        };
        this.clients.set(clientId, client);
        console.log(`[ConnectionManager] Viewer connected: ${clientId}`);
        return client;
    }

    /**
     * Register a new source (CLI) connection.
     */
    registerSource(
        ws: WebSocket,
        clientId: string,
        name: string,
        preferredColor?: string
    ): ConnectedClient {
        const uniqueName = this.ensureUniqueName(name);
        this.usedSourceNames.add(uniqueName);

        const source: Source = {
            id: clientId,
            name: uniqueName,
            color: preferredColor ?? this.getNextColor(),
            connected: true,
            connectedAt: new Date().toISOString(),
        };

        const client: ConnectedClient = {
            ws,
            id: clientId,
            type: ClientType.SOURCE,
            source,
        };

        this.clients.set(clientId, client);
        console.log(`[ConnectionManager] Source connected: ${uniqueName} (${clientId})`);

        // Notify all viewers of the new source
        this.broadcastToViewers({
            type: MessageType.SOURCE_CONNECTED,
            payload: source,
        });

        return client;
    }

    /**
     * Remove a client connection.
     */
    removeClient(clientId: string): void {
        const client = this.clients.get(clientId);
        if (!client) return;

        if (client.type === ClientType.SOURCE && client.source) {
            this.usedSourceNames.delete(client.source.name);
            console.log(`[ConnectionManager] Source disconnected: ${client.source.name}`);

            // Notify all viewers of the disconnection
            this.broadcastToViewers({
                type: MessageType.SOURCE_DISCONNECTED,
                payload: {
                    sourceId: clientId,
                    sourceName: client.source.name,
                },
            });
        } else {
            console.log(`[ConnectionManager] Viewer disconnected: ${clientId}`);
        }

        this.clients.delete(clientId);
    }

    /**
     * Get a client by ID.
     */
    getClient(clientId: string): ConnectedClient | undefined {
        return this.clients.get(clientId);
    }

    /**
     * Get all connected sources.
     */
    getSources(): Source[] {
        return Array.from(this.clients.values())
            .filter((c): c is ConnectedClient & { source: Source } =>
                c.type === ClientType.SOURCE && c.source !== undefined
            )
            .map(c => c.source);
    }

    /**
     * Get all viewer clients.
     */
    getViewers(): ConnectedClient[] {
        return Array.from(this.clients.values())
            .filter(c => c.type === ClientType.VIEWER);
    }

    /**
     * Broadcast a message to all viewers.
     */
    broadcastToViewers(message: ServerMessage): void {
        const serialized = serializeMessage(message);
        for (const client of this.getViewers()) {
            if (client.ws.readyState === client.ws.OPEN) {
                client.ws.send(serialized);
            }
        }
    }

    /**
     * Send a message to a specific client.
     */
    sendToClient(clientId: string, message: ServerMessage): void {
        const client = this.clients.get(clientId);
        if (client && client.ws.readyState === client.ws.OPEN) {
            client.ws.send(serializeMessage(message));
        }
    }

    /**
     * Get connection statistics.
     */
    getStats(): { sources: number; viewers: number; total: number } {
        const sources = this.getSources().length;
        const viewers = this.getViewers().length;
        return { sources, viewers, total: sources + viewers };
    }
}
