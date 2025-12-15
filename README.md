# LogLoom 🪵

> A Unified Local-Dev Log Aggregator

**The Gap**: When running a modern stack locally (e.g., docker-compose with frontend, backend, database, and Redis), your terminal becomes a chaotic "wall of text." Debugging race conditions across services is a nightmare of scrolling.

**The Solution**: A lightweight web-based dashboard that aggregates logs from multiple local sources into a single, filterable timeline.

![LogLoom Architecture](https://via.placeholder.com/800x300/161b22/58a6ff?text=Frontend+%7C+Backend+%7C+Database+→+LogLoom+Dashboard)

## ✨ Features

- **📊 Unified Timeline**: See logs from all services interleaved chronologically
- **🔍 Powerful Filtering**: Filter by source, log level, or text search
- **🎨 Source Color Coding**: Each source gets a distinct color for easy identification
- **🔔 Regex Alerting**: Get sound or browser notifications when patterns match
- **⚡ Virtualized List**: Handle thousands of logs without performance issues
- **🌙 Dark Theme**: Easy on the eyes for long debugging sessions

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd LogLoom
npm install
```

### 2. Start the Server and Dashboard

```bash
npm run dev
```

This starts:
- WebSocket server on `ws://localhost:3210`
- Dashboard on `http://localhost:3211`

### 3. Pipe Your Logs

**Option A: Run from anywhere (Recommended)**

Run `npm link` once in the cli package to make the `logloom` command available globally:
```bash
cd packages/cli
npm link
```

Now you can use `logloom` in **any** terminal window:
```bash
# In your app's project folder
npm start | logloom --name my-app
```

**Option B: Use without linking**

From the LogLoom directory:
```bash
npm run start:frontend | npx ./packages/cli --name frontend
```

### 4. Open the Dashboard

Navigate to [http://localhost:3211](http://localhost:3211) and watch your logs flow in!

## 📦 Project Structure

```
LogLoom/
├── packages/
│   ├── shared/      # Shared types and WebSocket protocol
│   ├── server/      # WebSocket server for log aggregation
│   ├── cli/         # CLI tool for piping logs
│   └── dashboard/   # React web dashboard
```

## 🛠️ CLI Usage

```bash
npx logloom [options]

Options:
  -n, --name <name>        Source identifier (required)
  -s, --server <url>       Server URL (default: ws://localhost:3210)
  -c, --color <color>      Preferred badge color (CSS value)
  --level-pattern <regex>  Custom log level detection pattern
  -V, --version            Show version
  -h, --help               Show help
```

### Examples

```bash
# Basic usage
npm start | npx logloom --name myapp

# Custom server and color
docker logs -f redis | npx logloom -n redis -c "#FF6B6B" -s ws://192.168.1.100:3210

# Watch a log file
tail -f /var/log/app.log | npx logloom --name logfile
```

## 🎮 Dashboard Features

### Filtering

- **By Source**: Click source badges to toggle visibility
- **By Level**: Click DEBUG/INFO/WARN/ERROR to set minimum level
- **By Text**: Use the search box for substring matching
- **Clear All**: Reset all filters with one click

### Alerting

1. Enter a regex pattern in the alert bar (e.g., `ERROR|Exception`)
2. Toggle 🔊 Sound for audio alerts
3. Toggle 📢 Notify for browser notifications
4. Enable alerts with the Active button

### Auto-Scroll

- Log view auto-scrolls to show new logs
- Scroll up to pause auto-scroll
- Click "Resume auto-scroll" to catch up

## 🔧 Development

### Building

```bash
# Build all packages
npm run build

# Build specific package
npm run build -w @logloom/server
```

### Package Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start server + dashboard in dev mode |
| `npm run build` | Build all packages |
| `npm run clean` | Clean all build outputs |

## 📄 License

MIT

---

Built with ❤️ for developers who are tired of terminal chaos.
