# Self-Hosting Guide

Run your own instance of BugDrop with your own GitHub App.

## Prerequisites

- Node.js 20+
- Cloudflare account (free tier works)
- GitHub account

## 1. Create a GitHub App

1. Go to [github.com/settings/apps/new](https://github.com/settings/apps/new)
2. Configure:
   - **Name**: Choose a unique name (becomes your app's URL slug)
   - **Homepage URL**: Your worker URL (e.g., `https://bugdrop.you.workers.dev`)
   - **Webhook**: Uncheck "Active" (not needed)
3. Set permissions:
   - **Repository > Issues**: Read & Write
   - **Repository > Contents**: Read & Write
4. Click "Create GitHub App"
5. Note the **App ID** (shown at top)
6. Scroll down and click **"Generate a private key"** (downloads a .pem file)

## 2. Setup Development Environment

```bash
# Clone and install
git clone https://github.com/YOUR_USERNAME/bugdrop
cd bugdrop
make install

# Configure environment
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` with your GitHub App credentials:

```bash
GITHUB_APP_ID=123456
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
...your key content...
-----END RSA PRIVATE KEY-----"
```

## 3. Run Locally

```bash
make dev
# Opens http://localhost:8787
```

Visit http://localhost:8787/test/ to try the widget.

## 4. Deploy to Cloudflare

```bash
# Set production secrets
wrangler secret put GITHUB_APP_ID
wrangler secret put GITHUB_PRIVATE_KEY

# Deploy
make deploy
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_APP_ID` | Yes | Your GitHub App's numeric ID |
| `GITHUB_PRIVATE_KEY` | Yes | Private key from GitHub App settings |
| `ALLOWED_ORIGINS` | No | Comma-separated allowed domains (default: `*`) |
| `GITHUB_APP_NAME` | No | Your app's URL slug for install links |
| `MAX_SCREENSHOT_SIZE_MB` | No | Max screenshot size in MB (default: `5`) |

### wrangler.toml

```toml
[vars]
ENVIRONMENT = "production"
ALLOWED_ORIGINS = "https://mysite.com,https://app.mysite.com"
GITHUB_APP_NAME = "my-bugdrop-app"
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
- **Auth**: GitHub App (installation tokens)
- **Widget**: TypeScript IIFE in Shadow DOM
- **Testing**: Vitest + Playwright
