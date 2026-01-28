# Changelog

All notable changes to BugDrop will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **JavaScript API**: Programmatic control via `window.BugDrop`:
  - `open()` / `close()` - Control the feedback modal
  - `hide()` / `show()` - Control the floating button visibility
  - `isOpen()` / `isButtonVisible()` - Query current state
- **API-only mode**: Set `data-button="false"` to hide the floating button and trigger feedback only via the JavaScript API
- **Ready event**: `bugdrop:ready` event fires when the API is available
- **Dismiss duration**: Set `data-dismiss-duration="7"` to have the dismissed button reappear after 7 days. Without this, dismissed buttons stay hidden forever.

### Changed
- `show()` API method now clears the dismissed state, allowing you to programmatically bring back a button that was dismissed by the user
- Dismissed state now stores a timestamp instead of a boolean, enabling the new duration feature. Legacy `'true'` values are still honored for backwards compatibility.

## [1.1.0] - 2026-01-28

### Added
- **Dismissible floating button**: Users can now dismiss the feedback button by clicking an X icon that appears on hover. The preference is saved to localStorage and persists across page loads. Enable with `data-button-dismissible="true"`.
- **Versioned widget URLs**: Pin your widget to specific versions for stability:
  - `/widget.js` - Always latest (auto-updates)
  - `/widget.v1.js` - Pinned to major version 1.x
  - `/widget.v1.1.js` - Pinned to minor version 1.1.x
  - `/widget.v1.1.0.js` - Pinned to exact version
- **Release-based deployment**: Publishing a GitHub Release now automatically deploys to Cloudflare Workers. This gives maintainers explicit control over when updates reach users.
- **Versions manifest**: `/versions.json` endpoint shows available versions.

### Changed
- Build process now generates versioned widget bundles automatically.

## [1.0.0] - 2025-01-15

### Added
- Initial release of BugDrop widget.
- **Screenshot capture**: Full page or specific element screenshots.
- **Annotation tools**: Draw, arrow, and rectangle tools for highlighting issues.
- **Element picker**: Click to select specific page elements for feedback.
- **GitHub integration**: Automatic issue creation via GitHub App.
- **Theme support**: Light, dark, and auto (system preference) themes.
- **Position options**: Bottom-right or bottom-left button placement.
- **Submitter info**: Optional name and email collection (`data-show-name`, `data-require-name`, `data-show-email`, `data-require-email`).
- **Shadow DOM isolation**: Widget styles don't conflict with host page.
- **Private repo support**: Works with both public and private repositories.

---

## Version Pinning Guide

### When to use each version type

| Version | Example | Use Case |
|---------|---------|----------|
| Latest | `/widget.js` | Development, always want newest features |
| Major | `/widget.v1.js` | Production - get bug fixes, no breaking changes |
| Minor | `/widget.v1.1.js` | Production - only patch updates |
| Exact | `/widget.v1.1.0.js` | Strict control, manual updates only |

### Recommended for Production

```html
<!-- Recommended: Pin to major version for stability + bug fixes -->
<script src="https://bugdrop.neonwatty.workers.dev/widget.v1.js"
        data-repo="owner/repo"></script>
```

### Breaking Changes Policy

- **Major versions** (v1 → v2): May include breaking changes to configuration or behavior
- **Minor versions** (v1.0 → v1.1): New features, backwards compatible
- **Patch versions** (v1.0.0 → v1.0.1): Bug fixes only

[Unreleased]: https://github.com/neonwatty/bugdrop/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/neonwatty/bugdrop/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/neonwatty/bugdrop/releases/tag/v1.0.0
