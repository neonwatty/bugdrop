# Production Release

## Overview

For production release, you need:
1. A **new** public GitHub App (not the dev one)
2. Production deployment on Cloudflare
3. (Optional) Custom domain
4. User documentation

## Create Production GitHub App

### Why a New App?

- Development app is restricted to your account
- Production app allows installation on **any account**
- Separate credentials for security

### Create the App

1. Go to https://github.com/settings/apps → **New GitHub App**

2. Fill in production details:

| Field | Value |
|-------|-------|
| **Name** | `feedback-widget` (or your chosen name) |
| **Description** | Clear, concise description |
| **Homepage URL** | Your landing page or docs URL |
| **Webhook Active** | ☐ Unchecked |

3. **Repository Permissions:**

| Permission | Access |
|------------|--------|
| **Contents** | Read and write |
| **Issues** | Read and write |

4. **Where can this be installed?**
   - Select: **Any account** ← This makes it public!

5. Click **Create GitHub App**

### Generate Production Credentials

1. Note the **App ID**

2. Generate private key:
   - Scroll to "Private keys"
   - Click **Generate a private key**
   - Save the downloaded `.pem` file securely

3. Convert to PKCS#8:
   ```bash
   openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt \
     -in ~/Downloads/feedback-widget*.pem \
     -out production-private-key.pem
   ```

### App Logo and Branding (Optional)

1. In app settings, upload a logo (512x512 recommended)
2. Add a detailed description
3. Add support/contact information

## Deploy to Production

### Set Production Secrets

```bash
# Set the production App ID
npx wrangler secret put GITHUB_APP_ID --env production
# Enter production App ID

# Set the production private key
npx wrangler secret put GITHUB_PRIVATE_KEY --env production
# Paste PKCS#8 key, then Ctrl+D
```

### Verify Secrets

```bash
npx wrangler secret list --env production
```

### Deploy

```bash
npm run build:widget
npx wrangler deploy --env production
```

Output:

```
✨ Successfully published your script to
https://feedback-widget-production.YOUR_SUBDOMAIN.workers.dev
```

## Custom Domain (Recommended)

A custom domain looks more professional and is easier to remember.

### Option 1: Via Cloudflare Dashboard

1. Go to **Cloudflare Dashboard** → **Workers & Pages**
2. Select your worker
3. Go to **Triggers** tab
4. Click **Add Custom Domain**
5. Enter: `feedback-widget.yourdomain.com`
6. Cloudflare handles SSL automatically

### Option 2: Via wrangler.toml

```toml
[env.production]
name = "feedback-widget-production"
routes = [
  { pattern = "feedback-widget.yourdomain.com/*", zone_name = "yourdomain.com" }
]
```

Then deploy:

```bash
npx wrangler deploy --env production
```

## User Documentation

Create documentation for users of your widget.

### Installation Instructions

```markdown
# Feedback Widget

Collect user feedback directly as GitHub Issues.

## Quick Start

### 1. Install the GitHub App

[Install Feedback Widget](https://github.com/apps/YOUR_APP_NAME/installations/new)

Select the repository where you want feedback to create issues.

### 2. Add to Your Website

Add this script before `</body>`:

```html
<script
  src="https://feedback-widget.yourdomain.com/widget.js"
  data-repo="your-org/your-repo">
</script>
```

That's it! A feedback button will appear on your site.

## Configuration Options

| Attribute | Description | Default |
|-----------|-------------|---------|
| `data-repo` | GitHub repo (required) | - |
| `data-position` | `bottom-right` or `bottom-left` | `bottom-right` |
| `data-theme` | `light` or `dark` | `light` |

## Features

- 📸 Screenshot capture
- 🎯 Element selection
- ✏️ Annotation tools
- 🔒 No user tokens needed

## Support

- [GitHub Issues](https://github.com/YOUR_ORG/feedback-widget/issues)
- [Documentation](https://your-docs-site.com)
```

### Landing Page (Optional)

Consider creating a simple landing page that:
- Explains what the widget does
- Shows a demo
- Links to installation
- Provides support information

## Final Verification

### Test Public Installation

1. Log in with a **different GitHub account** (or ask a friend)
2. Visit your app's public page: `https://github.com/apps/YOUR_APP_NAME`
3. Click **Install**
4. Select a repo
5. Test the widget on a page

### Verify All Features

| Feature | Status |
|---------|--------|
| App installable by anyone | ☐ |
| Widget loads from production URL | ☐ |
| Screenshot capture works | ☐ |
| Element picker works | ☐ |
| Annotations work | ☐ |
| Feedback creates issues | ☐ |
| Screenshots appear in issues | ☐ |
| Error handling works | ☐ |
| Custom domain works (if configured) | ☐ |

## Maintenance

### Monitor Usage

```bash
# View real-time logs
npx wrangler tail --env production
```

### Update the Widget

When you make changes:

```bash
npm run build:widget
npx wrangler deploy --env production
```

### Rotate Credentials

If you need to rotate the private key:

1. Generate new key in GitHub App settings
2. Convert to PKCS#8
3. Update secret: `npx wrangler secret put GITHUB_PRIVATE_KEY --env production`
4. Delete old key in GitHub

### Monitor GitHub App

Periodically check:
- Installation count
- Rate limit usage
- Any reported issues

## GitHub Marketplace (Optional)

For wider distribution, list on GitHub Marketplace:

1. Go to app settings → **Marketplace** tab
2. Complete listing requirements:
   - Terms of service
   - Privacy policy
   - Support documentation
3. Submit for review

## Security Checklist

| Item | Status |
|------|--------|
| Production private key stored securely | ☐ |
| Development keys not used in production | ☐ |
| No secrets in source code | ☐ |
| HTTPS only | ☐ |
| CORS properly configured | ☐ |
| Rate limiting considered | ☐ |

## Congratulations! 🎉

Your feedback widget is now live and anyone can install it.

### User Flow Recap

1. **Developer** visits `https://github.com/apps/YOUR_APP_NAME`
2. **Clicks Install** → Selects their repo
3. **Adds script tag** to their website
4. **End users** can now submit feedback
5. **Feedback appears** as GitHub Issues

All with zero backend for the user to maintain!
