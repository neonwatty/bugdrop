# Feedback Widget

[![CI](https://github.com/neonwatty/feedback-widget/actions/workflows/ci.yml/badge.svg)](https://github.com/neonwatty/feedback-widget/actions/workflows/ci.yml)
[![Security Policy](https://img.shields.io/badge/Security-Policy-blue)](./SECURITY.md)

Embeddable bug reporting widget that creates GitHub Issues with screenshots and annotations.

## Quick Start

**1. Install the GitHub App** on your repository:

https://github.com/apps/neonwatty-feedback-widget/installations/new

**2. Add the script** to your website:

```html
<script src="https://feedback-widget.neonwatty.workers.dev/widget.js"
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
<script src="https://feedback-widget.neonwatty.workers.dev/widget.js"
        data-repo="owner/repo"
        data-theme="dark"
        data-position="bottom-left"></script>
```

## How It Works

```
User clicks bug button → Widget captures screenshot → Worker authenticates via GitHub App → Issue created in your repo
```

1. **Widget** loads in a Shadow DOM (isolated from your page styles)
2. **Screenshot** captured client-side using html2canvas
3. **Worker** (Cloudflare) exchanges GitHub App credentials for an installation token
4. **GitHub API** creates the issue with the screenshot stored in `.feedback/`

## Security

- **Permissions**: Issues (R/W), Contents (R/W) - only on repos you install it on
- **Data storage**: Screenshots stored in your repo's `.feedback/` folder
- **Privacy**: No user data stored by the widget service

## Self-Hosting

Want to run your own instance? See [SELF_HOSTING.md](./SELF_HOSTING.md).

## License

MIT
