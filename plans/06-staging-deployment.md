# Staging Deployment

## Overview

Before going to production, deploy to a staging environment to:
- Test with real Cloudflare infrastructure
- Verify secrets work in deployed environment
- Test with external domains
- Catch any issues before public release

## Configure Staging Environment

### Update wrangler.toml

The staging environment should already be configured:

```toml
name = "feedback-widget"
main = "src/index.ts"
compatibility_date = "2024-01-01"

assets = { directory = "public" }

[vars]
ENVIRONMENT = "development"

[env.staging]
name = "feedback-widget-staging"
vars = { ENVIRONMENT = "staging" }
```

## Set Staging Secrets

Secrets must be set separately for each environment:

```bash
# Set GitHub App ID
npx wrangler secret put GITHUB_APP_ID --env staging
# Enter your App ID when prompted

# Set GitHub Private Key
npx wrangler secret put GITHUB_PRIVATE_KEY --env staging
# Paste the entire PKCS#8 key, then press Ctrl+D
```

### Verify Secrets

```bash
npx wrangler secret list --env staging
```

Should show:

```
🔐 Secret Name
GITHUB_APP_ID
GITHUB_PRIVATE_KEY
```

(Values are not displayed for security)

## Deploy to Staging

### Build and Deploy

```bash
# Build widget
npm run build:widget

# Deploy to staging
npx wrangler deploy --env staging
```

Output:

```
🌀 Building...
✨ Compiled Worker successfully
📦 Publishing to Cloudflare Workers...
✨ Successfully published your script to
https://feedback-widget-staging.YOUR_SUBDOMAIN.workers.dev
```

Note the URL - this is your staging endpoint.

## Test Staging Deployment

### Health Check

```bash
curl https://feedback-widget-staging.YOUR_SUBDOMAIN.workers.dev/api/health
```

### Check Installation

```bash
curl https://feedback-widget-staging.YOUR_SUBDOMAIN.workers.dev/api/check/YOUR_USERNAME/YOUR_REPO
```

### Submit Test Feedback

```bash
curl -X POST https://feedback-widget-staging.YOUR_SUBDOMAIN.workers.dev/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "repo": "YOUR_USERNAME/YOUR_REPO",
    "title": "Test from staging",
    "description": "Testing staging deployment",
    "metadata": {
      "url": "https://staging-test.example.com",
      "userAgent": "curl",
      "viewport": {"width": 1920, "height": 1080},
      "timestamp": "2025-01-15T12:00:00Z"
    }
  }'
```

## Test Widget on External Site

### Create Remote Test Page

You can host a test page anywhere (GitHub Pages, Vercel, Netlify, etc.):

```html
<!DOCTYPE html>
<html>
<head>
  <title>Feedback Widget Staging Test</title>
</head>
<body>
  <h1>Staging Test</h1>
  <p>Testing the feedback widget from staging deployment.</p>

  <!-- Use staging URL -->
  <script
    src="https://feedback-widget-staging.YOUR_SUBDOMAIN.workers.dev/widget.js"
    data-repo="YOUR_USERNAME/YOUR_REPO">
  </script>
</body>
</html>
```

### Test with Local Page Against Staging

You can also test locally but point to staging API:

```html
<script
  src="https://feedback-widget-staging.YOUR_SUBDOMAIN.workers.dev/widget.js"
  data-repo="YOUR_USERNAME/YOUR_REPO">
</script>
```

## Monitor Staging

### View Real-Time Logs

```bash
npx wrangler tail --env staging
```

This shows live request logs. Keep this running while testing.

### Check for Errors

In the logs, look for:
- HTTP status codes (should be 200/201)
- Error messages
- Response times

## Troubleshooting

### "Script not found" (404)

- Verify `npm run build:widget` was run before deploy
- Check `public/widget.js` exists
- Redeploy: `npx wrangler deploy --env staging`

### "Unauthorized" from GitHub API

- Verify secrets were set for staging environment
- Check: `npx wrangler secret list --env staging`
- Re-set if needed

### CORS Errors

- Check browser console for specific origin
- Verify CORS middleware allows the origin
- For staging, you might want to allow all origins temporarily

### Widget Loads but Submission Fails

- Check browser Network tab for response
- Look at worker logs with `wrangler tail`
- Verify repo name format in `data-repo`

## Staging Checklist

| Item | Status |
|------|--------|
| Secrets set for staging | ☐ |
| Deployment successful | ☐ |
| Health endpoint works | ☐ |
| Installation check works | ☐ |
| Widget.js loads from staging URL | ☐ |
| Feedback submission works | ☐ |
| Issues created in GitHub | ☐ |
| Screenshots upload correctly | ☐ |
| No errors in worker logs | ☐ |

## Next Steps

Once staging is verified:

1. Create production GitHub App
2. Deploy to production
3. Set up custom domain (optional)
4. Create user documentation

See `07-production-release.md` for production setup.
