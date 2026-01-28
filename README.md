# BugDrop 🐛

[![CI](https://github.com/neonwatty/bugdrop/actions/workflows/ci.yml/badge.svg)](https://github.com/neonwatty/bugdrop/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-1.1.0-14b8a6)](./CHANGELOG.md)
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

## Version Pinning

By default, `/widget.js` always serves the latest version. For production stability, pin to a specific version:

```html
<!-- Recommended for production: pin to major version -->
<script src="https://bugdrop.neonwatty.workers.dev/widget.v1.js"
        data-repo="owner/repo"></script>
```

| URL | Updates | Best For |
|-----|---------|----------|
| `/widget.js` | Always latest | Development |
| `/widget.v1.js` | Bug fixes only | Production (recommended) |
| `/widget.v1.1.js` | Patch fixes only | Strict stability |
| `/widget.v1.1.0.js` | Never | Maximum control |

See [CHANGELOG.md](./CHANGELOG.md) for version history and migration guides.

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
| `data-button-dismissible` | `true`, `false` | `false` |
| `data-button` | `true`, `false` | `true` |

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

### Dismissible Button

Allow users to hide the floating button if they don't want it:

```html
<script src="https://bugdrop.neonwatty.workers.dev/widget.js"
        data-repo="owner/repo"
        data-button-dismissible="true"></script>
```

When enabled, hovering over the button reveals an X icon. Clicking it hides the button and saves the preference to localStorage (`bugdrop_dismissed`). The button stays hidden on subsequent page loads.

### JavaScript API

BugDrop exposes a JavaScript API for programmatic control, useful when you want to trigger feedback from your own UI instead of (or in addition to) the floating button.

```javascript
window.BugDrop = {
  open(),           // Open the feedback modal
  close(),          // Close the modal
  hide(),           // Hide the floating button
  show(),           // Show the floating button
  isOpen(),         // Returns true if modal is open
  isButtonVisible() // Returns true if button is visible
};
```

**API-only mode** — hide the floating button entirely and trigger feedback from your own UI:

```html
<script src="https://bugdrop.neonwatty.workers.dev/widget.js"
        data-repo="owner/repo"
        data-button="false"></script>
```

**Example: Menu item integration**

```html
<nav>
  <a href="#">Home</a>
  <a href="#">Products</a>
  <span id="report-bug">Report Bug</span>
</nav>

<script>
  window.addEventListener('bugdrop:ready', () => {
    document.getElementById('report-bug').addEventListener('click', () => {
      window.BugDrop.open();
    });
  });
</script>
```

The `bugdrop:ready` event fires when the API is available. You can also check `if (window.BugDrop)` for synchronous initialization.

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

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history, new features, and upgrade guides.

## License

MIT
