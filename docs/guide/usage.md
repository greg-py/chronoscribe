# Usage Guide

## The Basics

Chronoscribe works by piping `stdout` and `stderr` from your processes into the `chronoscribe` CLI tool.

### Syntax

```bash
<your-command> | npx chronoscribe --name <source-name> [options]
```

## Common Scenarios

### 1. Node.js Applications

```bash
npm start | npx chronoscribe --name backend
```

### 2. Docker Containers

You can pipe `docker logs --follow` to see container logs in real-time.

```bash
docker logs -f my-postgres | npx chronoscribe --name db --color "#0074D9"
```

### 3. Log Files

Watch a file and stream its updates:

```bash
tail -f /var/log/nginx/access.log | npx chronoscribe --name nginx
```

## Dashboard Features

- **Filtering**: Click on a source badge in the header to show/hide logs from that source.
- **Search**: Use the search bar to filter logs by text content.
- **Levels**: Filter by log level (DEBUG, INFO, WARN, ERROR).
- **Auto-scroll**: The view automatically scrolls to the newest log. Scroll up to pause.
