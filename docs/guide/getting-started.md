# Getting Started

## Introduction

Chronoscribe is a developer tool that aggregates logs from multiple local sources (frontend, backend, database, docker containers) into a single, unified timeline in your browser.

It solves the "content shifting" problem of local development where your terminal is flooded with interleaved logs that are hard to read.

## Prerequisites

- Node.js v18 or later
- npm v9 or later

## Quick Start (No Install)

The fastest way to use Chronoscribe is via `npx`:

1.  **Start the server:**
    ```bash
    npx chronoscribe --serve
    ```
    This opens the dashboard at `http://localhost:3211`.

2.  **Pipe logs:**
    In another terminal window where you run your app:
    ```bash
    npm start | npx chronoscribe --name my-app
    ```

## Installation (Optional)

If you use it frequently, you can install it globally:

```bash
npm install -g chronoscribe
```

Then run it directly:

```bash
chronoscribe --serve
```
