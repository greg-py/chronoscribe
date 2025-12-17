/**
 * @fileoverview Stdin reader for Chronoscribe CLI
 * 
 * Reads log lines from stdin with proper stream handling and
 * backpressure management.
 */

import * as readline from 'node:readline';

/**
 * Callback for processing each log line.
 */
export type LineCallback = (line: string) => void;

/**
 * Create a readline interface for stdin and process lines.
 * 
 * @param onLine - Callback for each line received
 * @param onClose - Callback when stdin closes
 * @returns Cleanup function
 */
export function readStdin(
    onLine: LineCallback,
    onClose?: () => void
): () => void {
    // Check if stdin is a TTY (interactive terminal)
    if (process.stdin.isTTY) {
        console.log('[Chronoscribe] Interactive mode: Type log lines and press Enter.');
        console.log('[Chronoscribe] Press Ctrl+D to exit.\n');
    }

    const rl = readline.createInterface({
        input: process.stdin,
        crlfDelay: Infinity, // Handle both \n and \r\n
    });

    rl.on('line', (line) => {
        // Skip empty lines
        if (line.trim()) {
            onLine(line);
        }
    });

    rl.on('close', () => {
        onClose?.();
    });

    // Handle SIGINT (Ctrl+C) gracefully
    process.on('SIGINT', () => {
        rl.close();
    });

    // Return cleanup function
    return () => {
        rl.close();
    };
}
