#!/usr/bin/env node
/**
 * @fileoverview Chronoscribe CLI entry point
 * 
 * Pipes stdin logs to the Chronoscribe server for unified viewing.
 * Can also start the server itself.
 * 
 * Usage:
 *   chronoscribe --serve
 *   npm start | chronoscribe --name frontend
 */

import { parseArgs } from './cli.js';
import { readStdin } from './stdin-reader.js';
import { parseLogLine } from './log-parser.js';
import { WebSocketClient } from './websocket-client.js';
import { startServer } from '@chronoscribe/server';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { exec } from 'node:child_process';

/**
 * Open URL in default browser.
 */
function openBrowser(url: string): void {
    const start = (process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open');
    exec(`${start} ${url}`);
}

/**
 * Find the dashboard directory.
 */
function getDashboardPath(): string {
    // In the bundled distribution, __dirname is the root dist/ folder
    // and the dashboard is at dist/dashboard/ (sibling to dist/index.js)
    return path.resolve(__dirname, 'dashboard');
}

/**
 * Main entry point.
 */
async function main(): Promise<void> {
    // Parse command line arguments
    const options = parseArgs();

    // Handle Server Mode
    if (options.serve) {
        console.log('[Chronoscribe] Starting server...');

        try {
            startServer({
                wsPort: options.wsPort,
                httpPort: options.httpPort,
                dashboardPath: getDashboardPath(),
            });

            if (options.open) {
                setTimeout(() => {
                    openBrowser(`http://localhost:${options.httpPort}`);
                }, 1000);
            }

            // Keep process alive
            return;
        } catch (error: any) {
            console.error('[Chronoscribe] Failed to start server:', error.message);
            process.exit(1);
        }
    }

    // Client/Pipe Mode
    console.log(`
┌─────────────────────────────────────┐
│  🪵 Chronoscribe CLI                     │
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
        console.error(`[Chronoscribe] Failed to connect to server: ${message}`);
        console.error('[Chronoscribe] Make sure the Chronoscribe server is running.');
        console.error(`[Chronoscribe] Start it with: chronoscribe --serve`);
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
            console.log(`\n[Chronoscribe] Processed ${logCount} logs in ${duration}s`);
            client.close();
            process.exit(0);
        }
    );

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
        console.log('\n[Chronoscribe] Shutting down...');
        cleanup();
        client.close();
        process.exit(0);
    });
}

// Run the CLI
main().catch((error) => {
    console.error('[Chronoscribe] Fatal error:', error);
    process.exit(1);
});
