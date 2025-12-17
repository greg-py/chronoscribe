# Configuration

## CLI Options

| Option | Flag | Default | Description |
| :--- | :--- | :--- | :--- |
| **Serve** | `-S, --serve` | `false` | Start the WebSocket server and Dashboard |
| **No Open** | `--no-open` | `false` | Don't automatically open browser when serving |
| **Name** | `-n, --name` | `cli` | Unique name for the log source (Required for piping) |
| **Color** | `-c, --color` | Random | CSS color for the source badge (e.g. `#FF0000`, `blue`) |
| **Server** | `-s, --server` | `ws://localhost:3210` | WebSocket server URL to connect to |
| **WS Port** | `--ws-port` | `3210` | Port for the WebSocket server |
| **HTTP Port** | `--http-port` | `3211` | Port for the Dashboard web server |

## Environment Variables

You can also control ports via environment variables:

- `CHRONOSCRIBE_PORT`: Overrides the default WebSocket port (3210).
