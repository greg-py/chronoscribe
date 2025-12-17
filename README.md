# Chronoscribe

[![npm version](https://img.shields.io/npm/v/chronoscribe.svg)](https://www.npmjs.com/package/chronoscribe)
[![npm downloads](https://img.shields.io/npm/dm/chronoscribe.svg)](https://www.npmjs.com/package/chronoscribe)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/chronoscribe.svg)](https://nodejs.org/)
[![GitHub](https://img.shields.io/github/stars/greg-py/chronoscribe?style=social)](https://github.com/greg-py/chronoscribe)

> A Unified Local-Dev Log Aggregator

**The Gap**: When running a modern stack locally (e.g., docker-compose with frontend, backend, database, and Redis), your terminal becomes a chaotic "wall of text." Debugging race conditions across services is a nightmare of scrolling.

**The Solution**: A lightweight web-based dashboard that aggregates logs from multiple local sources into a single, filterable timeline.

![Chronoscribe Architecture](https://via.placeholder.com/800x300/161b22/58a6ff?text=Frontend+%7C+Backend+%7C+Database+→+Chronoscribe+Dashboard)

## Features

- **Unified Timeline**: See logs from all services interleaved chronologically
- **Powerful Filtering**: Filter by source, log level, or text search
- **Source Color Coding**: Each source gets a distinct color for easy identification
- **Regex Alerting**: Get sound or browser notifications when patterns match
- **Virtualized List**: Handle thousands of logs without performance issues
- **Dark Theme**: Easy on the eyes for long debugging sessions

## Quick Start

### 1. Run with npx (No Installation Required)

Start the dashboard server:

```bash
npx chronoscribe --serve
# Opens http://localhost:3211
```

### 2. Pipe Your Logs

In other terminal windows, pipe your application logs to Chronoscribe:

```bash
# Frontend
npm start | npx chronoscribe --name frontend

# Docker container
docker logs -f db | npx chronoscribe --name database --color "#FF6B6B"
```

### 3. Watch Logs Flow

Go to the dashboard and see your logs aggregated in real-time!

---

## Installation (Optional)

You can install Chronoscribe globally for easier access:

```bash
npm install -g chronoscribe
```

Then use it directly:

```bash
chronoscribe --serve
npm start | chronoscribe --name my-app
```

## CLI Usage

```bash
chronoscribe [options]

Options:
  -S, --serve              Start the Chronoscribe server and dashboard
  --no-open                Do not open the dashboard in the browser automatically
  -n, --name <name>        Source identifier (required for piping)
  -s, --server <url>       Server URL (default: ws://localhost:3210)
  -c, --color <color>      Preferred badge color (CSS value)
  --level-pattern <regex>  Custom log level detection pattern
  -V, --version            Show version
  -h, --help               Show help
```

### Examples

```bash
# Start server
chronoscribe --serve

# Pipe logs
npm start | chronoscribe -n frontend
docker logs -f redis | chronoscribe -n redis -c "#FF6B6B"
tail -f /var/log/app.log | chronoscribe -n backend
```

## Dashboard Features

### Filtering

- **By Source**: Click source badges to toggle visibility
- **By Level**: Click DEBUG/INFO/WARN/ERROR to set minimum level
- **By Text**: Use the search box for substring matching
- **Clear All**: Reset all filters with one click

### Alerting

1. Enter a regex pattern in the alert bar (e.g., `ERROR|Exception`)
2. Toggle Sound for audio alerts
3. Toggle Notify for browser notifications
4. Enable alerts with the Active button

### Auto-Scroll

- Log view auto-scrolls to show new logs
- Scroll up to pause auto-scroll
- Click "Resume auto-scroll" to catch up

## Development

### Project Structure

```
chronoscribe/
├── packages/
│   ├── shared/      # Shared types and WebSocket protocol
│   ├── server/      # WebSocket + Static Asset Server
│   ├── cli/         # CLI tool for piping logs & starting server
│   └── dashboard/   # React web dashboard
```

### Building

```bash
# Build all packages
npm run build
```

The build process bundles the CLI with tsup, then builds the React dashboard to the dist folder, providing a standalone experience via `npx chronoscribe --serve`.

## 📄 License

MIT

---

Built with ❤️ for developers who are tired of terminal chaos.
