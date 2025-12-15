/**
 * @fileoverview CLI argument parsing for LogLoom
 * 
 * Handles command-line arguments using Commander.js with validation
 * and helpful defaults.
 */

import { Command } from 'commander';
import { SERVER_DEFAULTS } from '@logloom/shared';

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
}

/**
 * Create and configure the CLI program.
 */
export function createProgram(): Command {
    const program = new Command();

    program
        .name('logloom')
        .description('Pipe logs to the LogLoom dashboard')
        .version('0.1.0')
        .requiredOption(
            '-n, --name <name>',
            'Source identifier (e.g., "frontend", "api", "database")'
        )
        .option(
            '-s, --server <url>',
            'LogLoom server URL',
            `ws://localhost:${SERVER_DEFAULTS.WS_PORT}`
        )
        .option(
            '-c, --color <color>',
            'Preferred badge color (CSS color value)'
        )
        .option(
            '--level-pattern <regex>',
            'Custom regex for log level detection (must have named group "level")'
        )
        .addHelpText('after', `
Examples:
  $ npm start | logloom --name frontend
  $ docker logs -f mydb | logloom --name database --color "#FF6B6B"
  $ tail -f /var/log/app.log | logloom -n backend -s ws://192.168.1.100:3210
    `);

    return program;
}

/**
 * Parse CLI arguments and return options.
 */
export function parseArgs(argv: string[] = process.argv): CliOptions {
    const program = createProgram();
    program.parse(argv);

    const options = program.opts<CliOptions>();

    // Validate server URL
    try {
        new URL(options.server);
    } catch {
        console.error(`Error: Invalid server URL: ${options.server}`);
        process.exit(1);
    }

    // Validate level pattern if provided
    if (options.levelPattern) {
        try {
            const regex = new RegExp(options.levelPattern);
            if (!options.levelPattern.includes('?<level>')) {
                console.warn('Warning: --level-pattern should contain a named group "level"');
            }
        } catch {
            console.error(`Error: Invalid regex pattern: ${options.levelPattern}`);
            process.exit(1);
        }
    }

    return options;
}
