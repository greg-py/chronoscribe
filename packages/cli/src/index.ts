#!/usr/bin/env node
/**
 * @fileoverview LogLoom CLI entry point
 * 
 * Pipes stdin logs to the LogLoom server for unified viewing.
 * 
 * Usage:
 *   npm start | logloom --name frontend
 *   docker logs -f db | logloom --name database
 */

import { parseArgs } from './cli.js';
import { readStdin } from './stdin-reader.js';
import { parseLogLine } from './log-parser.js';
import { WebSocketClient } from './websocket-client.js';

/**
 * Main entry point.
 */
async function main(): Promise<void> {
    // Parse command line arguments
    const options = parseArgs();

    console.log(`
┌─────────────────────────────────────┐
│  🪵 LogLoom CLI                     │
│                                     │
│  Source: ${options.name.padEnd(26)}│
│  Server: ${options.server.padEnd(26)}│
└─────────────────────────────────────┘
`);

    // Create WebSocket client
    const client = new WebSocketClient({
        serverUrl: options.server,
        sourceName: options.name,
        color: options.color,
    });

    // Connect to server
    try {
        await client.connect();
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[LogLoom] Failed to connect to server: ${message}`);
        console.error('[LogLoom] Make sure the LogLoom server is running.');
        console.error('[LogLoom] Start it with: npm run dev -w @logloom/server');
        process.exit(1);
    }

    // Track log count for statistics
    let logCount = 0;
    const startTime = Date.now();

    // Start reading from stdin
    const cleanup = readStdin(
        (line) => {
            const parsed = parseLogLine(line, options.levelPattern);
            client.sendLog(parsed, line);
            logCount++;
        },
        () => {
            // stdin closed (Ctrl+D or pipe ended)
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`\n[LogLoom] Processed ${logCount} logs in ${duration}s`);
            client.close();
            process.exit(0);
        }
    );

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
        console.log('\n[LogLoom] Shutting down...');
        cleanup();
        client.close();
        process.exit(0);
    });
}

// Run the CLI
main().catch((error) => {
    console.error('[LogLoom] Fatal error:', error);
    process.exit(1);
});
