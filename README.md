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

# Set up local secrets (.dev.vars)
# GITHUB_APP_ID=...
# GITHUB_PRIVATE_KEY=...

# Build widget
npm run build:widget

# Start dev server
npm run dev
```

## Tech Stack

- **Backend**: Cloudflare Workers + Hono
- **Auth**: GitHub App (JWT + Installation Tokens)
- **Widget**: TypeScript, bundled as IIFE
- **Screenshots**: html-to-image
- **Style Isolation**: Shadow DOM

## License

MIT
