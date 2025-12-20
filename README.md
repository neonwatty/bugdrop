# Feedback Widget

A lightweight, embeddable feedback widget that creates GitHub Issues with screenshots and annotations.

## Features

- 📸 **Screenshot Capture** - Capture the entire page or specific elements
- 🎯 **Element Picker** - Click on any element to report issues with it
- ✏️ **Annotation Tools** - Draw, arrows, rectangles, and text
- 🔒 **No User Tokens** - Uses GitHub App authentication
- ⚡ **Zero Infrastructure** - Users just add a script tag

## Architecture

```
Website + Widget  →  Cloudflare Worker  →  GitHub Issues
                     (API + Hosting)       (via GitHub App)
```

## For End Users

### 1. Install the GitHub App

Visit `https://github.com/apps/YOUR_APP_NAME` and install on your repository.

### 2. Add to Your Website

```html
<script
  src="https://YOUR_WORKER_URL/widget.js"
  data-repo="owner/repo">
</script>
```

That's it!

## Development

See the `/plans` directory for detailed implementation guides:

- `00-overview.md` - Project overview and architecture
- `01-github-app-setup.md` - GitHub App registration
- `02-cloudflare-worker-setup.md` - Cloudflare Worker setup
- `03-backend-implementation.md` - API implementation
- `04-widget-implementation.md` - Client-side widget
- `05-local-testing.md` - Testing locally
- `06-staging-deployment.md` - Staging deployment
- `07-production-release.md` - Production release

## Quick Start (Development)

```bash
# Install dependencies
npm install
# or
make install

# Set up local secrets (.dev.vars)
# Copy .dev.vars.example to .dev.vars and fill in:
# GITHUB_APP_ID=...
# GITHUB_PRIVATE_KEY=...

# Build widget
npm run build:widget

# Start dev server
npm run dev
# or
make dev
```

## Development Commands

### Using npm scripts

```bash
# Development
npm run dev                # Start wrangler dev server
npm run build              # Build worker (TypeScript compilation)
npm run build:widget       # Build widget bundle
npm run deploy             # Deploy to Cloudflare

# Testing
npm test                   # Run unit tests
npm run test:watch         # Run unit tests in watch mode
npm run test:e2e           # Run E2E tests with Playwright
npm run test:e2e:ui        # Run E2E tests in UI mode
npm run typecheck          # Run TypeScript type checking
```

### Using Makefile

```bash
make help          # Show all available commands
make install       # Install dependencies
make dev           # Start development server
make build         # Build widget and worker
make test          # Run unit tests
make test-e2e      # Run E2E tests
make test-e2e-ui   # Run E2E tests in UI mode
make typecheck     # Run TypeScript type checking
make ci            # Run all CI checks (typecheck, build, test, test-e2e)
make clean         # Clean build artifacts
make deploy        # Build and deploy to Cloudflare
```

## Testing

### Unit Tests

Unit tests are written using Vitest and test the Worker API endpoints, GitHub integration, and business logic.

```bash
# Run unit tests once
npm test

# Run in watch mode during development
npm run test:watch

# Run with coverage
npm test -- --coverage
```

Test files are located in `/test` directory:
- `test/api.test.ts` - API endpoint tests
- `test/setup.ts` - Test configuration

### E2E Tests

E2E tests use Playwright to test the complete widget functionality in a real browser.

```bash
# Run E2E tests headless
npm run test:e2e

# Run E2E tests in UI mode (interactive)
npm run test:e2e:ui

# Run E2E tests with headed browser
npx playwright test --headed

# Run specific test file
npx playwright test e2e/widget.spec.ts
```

Test files are located in `/e2e` directory:
- `e2e/widget.spec.ts` - Widget UI and interaction tests
- `e2e/api.spec.ts` - API integration tests

### Running All Tests

```bash
# Run all checks (type checking, build, unit tests, E2E tests)
make ci

# Or manually
npm run typecheck
npm run build:widget
npm run build
npm test
npm run test:e2e
```

## Deployment

### Prerequisites

1. GitHub App created and configured (see `plans/01-github-app-setup.md`)
2. Cloudflare account with Workers enabled
3. Wrangler CLI authenticated: `npx wrangler login`

### Staging Deployment

```bash
# Build everything
make build

# Deploy to Cloudflare
make deploy
# or
npm run deploy

# Set secrets in Cloudflare dashboard or via CLI
npx wrangler secret put GITHUB_APP_ID
npx wrangler secret put GITHUB_PRIVATE_KEY
npx wrangler secret put GITHUB_WEBHOOK_SECRET
```

### Production Deployment

1. Ensure all tests pass: `make ci`
2. Build production assets: `make build`
3. Deploy: `npm run deploy`
4. Verify deployment by testing the widget URL
5. Update GitHub App webhook URL if changed

### CI/CD

The project includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that:
- Runs on push to `main` and `develop` branches
- Runs on pull requests
- Executes type checking
- Builds widget and worker
- Runs unit tests
- Runs E2E tests with Playwright
- Uploads test reports on failure

## Project Structure

```
.
├── src/
│   ├── index.ts          # Worker entry point
│   ├── types.ts          # TypeScript types
│   ├── lib/              # Shared utilities
│   │   └── github.ts     # GitHub API integration
│   ├── routes/           # API routes
│   │   └── feedback.ts   # Feedback submission endpoint
│   └── widget/           # Client-side widget
│       ├── index.ts      # Widget entry point
│       ├── ui.ts         # UI components
│       ├── screenshot.ts # Screenshot capture
│       └── styles.ts     # Widget styles
├── test/                 # Unit tests
├── e2e/                  # E2E tests
├── public/               # Static files (widget.js)
├── .github/workflows/    # CI/CD pipelines
└── plans/                # Implementation guides
```

## Tech Stack

- **Backend**: Cloudflare Workers + Hono
- **Auth**: GitHub App (JWT + Installation Tokens)
- **Widget**: TypeScript, bundled as IIFE
- **Screenshots**: html-to-image
- **Style Isolation**: Shadow DOM
- **Testing**: Vitest (unit) + Playwright (E2E)
- **CI/CD**: GitHub Actions

## License

MIT
