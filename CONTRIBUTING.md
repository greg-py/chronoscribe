# Contributing to Chronoscribe

We love your input! We want to make contributing to Chronoscribe as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features

## Development Workflow

We use a monorepo structure managed by npm workspaces.

### 1. Setup

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/chronoscribe.git
cd chronoscribe

# Install dependencies
npm install
```

### 2. Running Locally

We have a unified dev command that runs the server and dashboard concurrently:

```bash
npm run dev
```

### 3. Making Changes

- **CLI Logic**: `packages/cli/src`
- **Server/WebSocket**: `packages/server/src`
- **Dashboard UI**: `packages/dashboard/src`
- **Shared Types**: `packages/shared/src`

### 4. Testing

Ensure all packages build successfully before submitting a PR:

```bash
npm run build
```

## Pull Requests

1. Fork the repo and create your branch from `master`.
2. If you've added code that should be tested, add tests.
3. Ensure the test suite passes.
4. Make sure your code lints.
5. Issue that pull request!

## License

By contributing, you agree that your contributions will be licensed under its MIT License.
