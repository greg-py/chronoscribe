/**
 * @fileoverview CLI argument parsing for Chronoscribe
 * 
 * Handles command-line arguments using Commander.js with validation
 * and helpful defaults.
 */

import { Command } from 'commander';
import { SERVER_DEFAULTS } from '@chronoscribe/shared';

/**
 * Parsed CLI options.
 */
export interface CliOptions {
    /** Source name identifier */
    name: string;
    /** WebSocket server URL */
    server: string;
    /** Optional preferred color */
    color?: string;
    /** Custom regex pattern for log level detection */
    levelPattern?: string;
    // Server mode options
    serve: boolean;
    open: boolean;
    wsPort: number;
    httpPort: number;
}

/**
 * Parse CLI arguments and return options.
 */
export function parseArgs(argv: string[] = process.argv): CliOptions {
    const program = new Command();
    const defaultServerUrl = `ws://localhost:${SERVER_DEFAULTS.WS_PORT}`;

    program
        .name('chronoscribe')
        .description('Unified Local-Dev Log Aggregator')
        .version('0.1.0')
        // Client options
        .option('-n, --name <name>', 'Source name (default: "cli")')
        .option('-c, --color <color>', 'Source color (hex code or name)')
        .option('-s, --server <url>', 'Server URL', defaultServerUrl)
        .option(
            '--level-pattern <regex>',
            'Custom regex for log level detection (must have named group "level")'
        )
        // Server mode options
        .option('-S, --serve', 'Start the Chronoscribe server and dashboard', false)
        .option('--no-open', 'Do not open the dashboard in the browser automatically', true)
        .option('--ws-port <port>', 'WebSocket server port', String(SERVER_DEFAULTS.WS_PORT))
        .option('--http-port <port>', 'Dashboard HTTP server port', '3211')
        .addHelpText('after', `
Examples:
  $ npm start | chronoscribe --name frontend
  $ docker logs -f mydb | chronoscribe --name database --color "#FF6B6B"
  $ chronoscribe --serve
    `);

    program.parse(argv);
    const opts = program.opts();

    // Default name if not provided
    let name = opts.name;
    if (!name && !opts.serve) {
        name = `cli-${Math.floor(Math.random() * 1000)}`;
    }

    // Validate server URL
    try {
        new URL(opts.server);
    } catch {
        console.error(`Error: Invalid server URL: ${opts.server}`);
        process.exit(1);
    }

    return {
        name: name || 'cli',
        color: opts.color,
        server: opts.server,
        levelPattern: opts.levelPattern,
        serve: opts.serve,
        open: opts.open, // Logic inverted in 'program' definition? 'no-open' implies default true. 
        // Commander handles boolean negation for flags starting with --no. 
        // If I say .option('--no-open'), the option key becomes 'open' with value false if flag present, true if not.
        wsPort: parseInt(opts.wsPort, 10),
        httpPort: parseInt(opts.httpPort, 10),
    };
}
