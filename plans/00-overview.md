# Feedback Widget - Project Overview

## What We're Building

A lightweight, embeddable feedback widget that allows website users to:
- Click on any element to report issues
- Capture and annotate screenshots
- Submit feedback that automatically creates GitHub Issues

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ARCHITECTURE                                  │
│                                                                      │
│  ┌──────────────┐    ┌───────────────────┐    ┌──────────────────┐ │
│  │  Host Site   │───▶│ Cloudflare Worker │───▶│  GitHub Issues   │ │
│  │  + Widget    │    │ (API + Widget JS) │    │  (via GitHub App)│ │
│  └──────────────┘    └───────────────────┘    └──────────────────┘ │
│                                                                      │
│  User adds:          Worker handles:          GitHub App:           │
│  <script>            • Serves widget.js       • Authenticates      │
│                      • Receives feedback      • Creates issues     │
│                      • Uploads screenshots    • Uploads files      │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### Why GitHub App (vs Personal Access Token)?
- **No tokens exposed**: Users don't paste tokens anywhere
- **Scoped permissions**: App can only access repos where installed
- **One-click setup**: Users just install the app and add a script tag
- **Revocable**: Users can uninstall anytime

### Why Cloudflare Workers?
- **Free tier**: 100,000 requests/day
- **Zero infrastructure**: No servers to manage
- **Global edge**: Fast everywhere
- **Serves both**: API endpoints AND static widget.js

### Why IIFE Bundle (vs npm package)?
- **Universal**: Works on any website, any framework
- **Simple integration**: Just a `<script>` tag
- **No build step**: No npm install required for users

## User Experience

### For Developers (Setup)

```bash
# 1. Install GitHub App (30 seconds)
# Visit: https://github.com/apps/feedback-widget
# Click "Install" → Select repo → Done

# 2. Add to website (10 seconds)
```

```html
<script
  src="https://feedback-widget.example.com/widget.js"
  data-repo="myorg/myrepo">
</script>
```

### For End Users (Reporting)

1. Click feedback button (floating, bottom-right)
2. Optionally capture screenshot or select element
3. Annotate with arrows, highlights, text
4. Write description
5. Submit → Issue created in GitHub

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Cloudflare Workers + Hono |
| Auth | GitHub App (JWT + Installation Tokens) |
| Widget | TypeScript, bundled as IIFE |
| Screenshots | html-to-image |
| Annotations | Canvas API |
| Style Isolation | Shadow DOM |

## Cost

| Item | Cost |
|------|------|
| Cloudflare Workers | Free (100k req/day) |
| GitHub App | Free |
| Domain (optional) | ~$10/year |
| **Total** | **$0-10/year** |

Compare to: BugHerd ($39-229/mo), Marker.io ($59-149/mo)

## Project Structure

```
feedback-widget/
├── src/
│   ├── index.ts              # Cloudflare Worker entry
│   ├── types.ts              # TypeScript types
│   ├── routes/
│   │   └── api.ts            # API endpoints
│   ├── lib/
│   │   ├── jwt.ts            # GitHub App JWT
│   │   └── github.ts         # GitHub API
│   └── widget/
│       ├── index.ts          # Widget entry
│       ├── picker.ts         # Element picker
│       ├── screenshot.ts     # Screenshot capture
│       ├── annotator.ts      # Canvas annotations
│       └── ui.ts             # Modal/form UI
├── public/                   # Built widget.js
├── plans/                    # This directory
├── wrangler.toml             # Cloudflare config
└── package.json
```

## Development Phases

1. **Project Setup** - Initialize repo, install deps
2. **GitHub App Registration** - Create dev app, get credentials
3. **Backend Implementation** - JWT auth, API endpoints
4. **Widget Implementation** - UI, screenshot, element picker
5. **Local Testing** - Test full flow locally
6. **Staging Deployment** - Deploy to Cloudflare staging
7. **Production Release** - Public GitHub App

See individual plan files for details on each phase.
