# Feedback Widget

Embeddable bug reporting widget that creates GitHub Issues with screenshots and annotations.

## Usage

**1. Install the GitHub App** on your repository

**2. Add the script tag** to your website:

```html
<script src="https://YOUR_WORKER_URL/widget.js" data-repo="owner/repo"></script>
```

Users click the bug button, capture/annotate screenshots, and submit feedback directly to GitHub Issues.

## Development

```bash
# Setup
make install

# Create .dev.vars with your GitHub App credentials:
# GITHUB_APP_ID=...
# GITHUB_PRIVATE_KEY=...

# Run
make dev
```

## Commands

```bash
make help        # Show all commands
make dev         # Start dev server (localhost:8787)
make check       # Run lint, typecheck, knip
make test        # Run unit tests
make test-e2e    # Run E2E tests
make ci          # Run full CI pipeline
make build-all   # Build widget + worker
make deploy      # Deploy to Cloudflare
```

## Project Structure

```
src/
├── index.ts           # Worker entry
├── routes/api.ts      # API endpoints
├── lib/github.ts      # GitHub API
└── widget/            # Client widget
    ├── index.ts       # Entry point
    ├── ui.ts          # UI + theming
    ├── screenshot.ts  # Capture
    ├── picker.ts      # Element selection
    └── annotator.ts   # Drawing tools
```

## Tech Stack

- **Runtime**: Cloudflare Workers + Hono
- **Auth**: GitHub App
- **Widget**: TypeScript IIFE in Shadow DOM
- **Testing**: Vitest + Playwright

## License

MIT
