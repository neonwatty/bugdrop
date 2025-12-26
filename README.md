# BugDrop 🐛

[![CI](https://github.com/neonwatty/bugdrop/actions/workflows/ci.yml/badge.svg)](https://github.com/neonwatty/bugdrop/actions/workflows/ci.yml)
[![Security Policy](https://img.shields.io/badge/Security-Policy-blue)](./SECURITY.md)
[![Live Demo](https://img.shields.io/badge/Demo-Try_It_Live-ff9e64)](https://neonwatty.github.io/feedback-widget-test/)

Ship bugs to GitHub in 2 clicks. Screenshots, element picker, the works.

## Quick Start

> Works with both public and private repositories!

**1. Install the GitHub App** on your repository:

https://github.com/apps/neonwatty-bugdrop/installations/new

**2. Add the script** to your website:

```html
<script src="https://bugdrop.neonwatty.workers.dev/widget.js"
        data-repo="owner/repo"></script>
```

That's it! Users can now click the bug button to submit feedback as GitHub Issues.

## Widget Options

| Attribute | Values | Default |
|-----------|--------|---------|
| `data-repo` | `owner/repo` | required |
| `data-theme` | `light`, `dark`, `auto` | `auto` |
| `data-position` | `bottom-right`, `bottom-left` | `bottom-right` |

```html
<script src="https://bugdrop.neonwatty.workers.dev/widget.js"
        data-repo="owner/repo"
        data-theme="dark"
        data-position="bottom-left"></script>
```

## Live Demo

See BugDrop integrated into [WienerMatch](https://neonwatty.github.io/feedback-widget-test/), a sample web app. Click the 🐛 button in the bottom-right corner to submit a test bug report!

## How It Works

```
User clicks bug button → Widget captures screenshot → Worker authenticates via GitHub App → Issue created in your repo
```

1. **Widget** loads in a Shadow DOM (isolated from your page styles)
2. **Screenshot** captured client-side using html2canvas
3. **Worker** (Cloudflare) exchanges GitHub App credentials for an installation token
4. **GitHub API** creates the issue with the screenshot stored in `.bugdrop/`

## Security

- **Permissions**: Issues (R/W), Contents (R/W) - only on repos you install it on
- **Data storage**: Screenshots stored in your repo's `.bugdrop/` folder
- **Privacy**: No user data stored by the widget service

## Self-Hosting

Want to run your own instance? See [SELF_HOSTING.md](./SELF_HOSTING.md).

## License

MIT
