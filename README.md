# BugDrop 🐛

[![CI](https://github.com/neonwatty/bugdrop/actions/workflows/ci.yml/badge.svg)](https://github.com/neonwatty/bugdrop/actions/workflows/ci.yml)
[![Security Policy](https://img.shields.io/badge/Security-Policy-blue)](./SECURITY.md)
[![Live Demo](https://img.shields.io/badge/Demo-Try_It_Live-ff9e64)](https://neonwatty.github.io/feedback-widget-test/)

In-app feedback → GitHub Issues. Screenshots, annotations, the works.

![bugdrop-demo-small](https://github.com/user-attachments/assets/22d234fa-aa0f-4d01-bc4f-4c3e8f107165)

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
| `data-show-name` | `true`, `false` | `false` |
| `data-require-name` | `true`, `false` | `false` |
| `data-show-email` | `true`, `false` | `false` |
| `data-require-email` | `true`, `false` | `false` |

```html
<script src="https://bugdrop.neonwatty.workers.dev/widget.js"
        data-repo="owner/repo"
        data-theme="dark"
        data-position="bottom-left"></script>
```

### Collecting Submitter Info

By default, BugDrop only asks for a title and description. You can optionally collect user name and email:

```html
<!-- Require name, optional email -->
<script src="https://bugdrop.neonwatty.workers.dev/widget.js"
        data-repo="owner/repo"
        data-show-name="true"
        data-require-name="true"
        data-show-email="true"></script>
```

When provided, submitter info appears at the top of the GitHub issue.

## Live Demo

Try it on [WienerMatch](https://neonwatty.github.io/feedback-widget-test/) — click the bug button in the bottom right corner.

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
