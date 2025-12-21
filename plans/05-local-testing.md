# Local Testing

## Prerequisites

Before testing locally, ensure you have:

1. ✅ Created a development GitHub App (see `01-github-app-setup.md`)
2. ✅ Installed the app on a test repository
3. ✅ Created `.dev.vars` with `GITHUB_APP_ID` and `GITHUB_PRIVATE_KEY`
4. ✅ Built the project (`npm install`)

## Start Development Server

### Terminal 1: Build Widget and Start Worker

```bash
cd /Users/jeremywatt/Desktop/helper

# Build the widget JavaScript
npm run build:widget

# Start the Cloudflare Worker locally
npm run dev
```

You should see:

```
⎔ Starting local server...
[wrangler] Ready on http://localhost:8787
```

## Test API Endpoints

### Health Check

```bash
curl http://localhost:8787/api/health
```

Expected response:

```json
{
  "status": "ok",
  "environment": "development",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

### Check Installation

```bash
curl http://localhost:8787/api/check/YOUR_USERNAME/YOUR_TEST_REPO
```

Expected response (if app is installed):

```json
{
  "installed": true,
  "repo": "YOUR_USERNAME/YOUR_TEST_REPO"
}
```

If not installed:

```json
{
  "installed": false,
  "repo": "YOUR_USERNAME/YOUR_TEST_REPO"
}
```

### Submit Feedback

```bash
curl -X POST http://localhost:8787/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "repo": "YOUR_USERNAME/YOUR_TEST_REPO",
    "title": "Test from CLI",
    "description": "Testing the feedback API directly from command line",
    "metadata": {
      "url": "http://localhost:3000",
      "userAgent": "curl/7.88.1",
      "viewport": {"width": 1920, "height": 1080},
      "timestamp": "2025-01-15T12:00:00Z"
    }
  }'
```

Expected response:

```json
{
  "success": true,
  "issueNumber": 1,
  "issueUrl": "https://github.com/YOUR_USERNAME/YOUR_TEST_REPO/issues/1"
}
```

**Verify**: Check your GitHub repo - you should see the new issue!

## Test the Widget

### Create Test Page

Create a file `test/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Feedback Widget Test</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
      line-height: 1.6;
    }

    h1 {
      color: #333;
    }

    .card {
      background: #f5f5f5;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }

    .card h2 {
      margin-top: 0;
    }

    button {
      padding: 10px 20px;
      background: #0066ff;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }

    button:hover {
      background: #0052cc;
    }

    .broken-link {
      color: red;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <h1>Feedback Widget Test Page</h1>

  <p>This page is for testing the feedback widget locally.</p>

  <div class="card">
    <h2>Sample Card Component</h2>
    <p>Try selecting this element with the element picker to report an issue with it.</p>
    <button>Click Me (I do nothing)</button>
  </div>

  <div class="card" id="problem-section">
    <h2>Another Section</h2>
    <p>This section has a <a href="#" class="broken-link">broken link</a> that you might want to report.</p>
  </div>

  <div class="card">
    <h2>Form Example</h2>
    <form>
      <input type="text" placeholder="Name" style="margin-right: 10px;">
      <input type="email" placeholder="Email" style="margin-right: 10px;">
      <button type="submit">Submit</button>
    </form>
  </div>

  <!--
    FEEDBACK WIDGET
    Replace YOUR_USERNAME/YOUR_TEST_REPO with your actual test repo
  -->
  <script
    src="http://localhost:8787/widget.js"
    data-repo="YOUR_USERNAME/YOUR_TEST_REPO"
    data-position="bottom-right">
  </script>
</body>
</html>
```

### Serve the Test Page

In a **second terminal**:

```bash
cd /Users/jeremywatt/Desktop/helper/test
npx serve .
```

Or if you prefer Python:

```bash
cd /Users/jeremywatt/Desktop/helper/test
python3 -m http.server 3000
```

### Open in Browser

1. Navigate to `http://localhost:3000` (or whatever port serve uses)
2. You should see:
   - The test page content
   - A bug feedback button in the bottom-right corner (🐛)

## Test Full Flow

### 1. Click the Feedback Button

- Click the 🐛 button
- The feedback modal should appear

### 2. Test Screenshot Capture

- Click "Capture Page"
- The page should be captured as an image
- You should see a preview

### 3. Test Element Picker

- Click "Select Element"
- The cursor should change to crosshair
- Hovering over elements should highlight them
- Clicking should capture that specific element
- Press ESC to cancel

### 4. Test Annotations

- After capturing a screenshot
- Use the annotation tools (Draw, Arrow, Rectangle)
- Draw on the image
- Test Undo

### 5. Submit Feedback

- Fill in the title and description
- Click Submit
- You should see a success toast
- Check your GitHub repo for the new issue

## Debugging

### Check Worker Logs

In the terminal running `wrangler dev`, you'll see request logs:

```
[wrangler] POST /api/feedback - Ok
```

### Browser Console

Open DevTools (F12) and check the Console for errors:

```javascript
// Common issues:
// - CORS errors (check cors middleware)
// - Network errors (check if worker is running)
// - Widget not loading (check script src)
```

### Network Tab

Check the Network tab to see:
- If widget.js is loading
- If API requests are being made
- Response status codes

## Common Issues

### "GitHub App not installed"

- Verify the app is installed on your test repo
- Check the repo name in `data-repo` matches exactly
- Format: `owner/repo` (not `https://github.com/owner/repo`)

### Widget not appearing

- Check browser console for errors
- Verify `npm run build:widget` was run
- Check `public/widget.js` exists
- Verify the script src URL is correct

### CORS errors

- Make sure the worker has CORS middleware enabled
- Check that the Origin header is being sent

### "Bad credentials" from GitHub

- Verify `.dev.vars` has the correct App ID
- Ensure private key is in PKCS#8 format
- Check the key matches the App ID

### Screenshots not uploading

- Check that the app has "Contents: Read and write" permission
- Verify installation includes the target repo

## Testing Checklist

| Test | Status |
|------|--------|
| Health endpoint responds | ☐ |
| Check endpoint returns installed: true | ☐ |
| Feedback submission creates issue | ☐ |
| Widget loads on test page | ☐ |
| Trigger button appears | ☐ |
| Modal opens on click | ☐ |
| Page screenshot works | ☐ |
| Element picker works | ☐ |
| Annotations work | ☐ |
| Form validation works | ☐ |
| Submission succeeds | ☐ |
| Issue appears in GitHub | ☐ |
| Screenshot appears in issue | ☐ |
| Success toast displays | ☐ |
| Error handling works | ☐ |

## Next Steps

Once local testing passes:

1. Deploy to staging (`05-staging-deployment.md`)
2. Test with real domain
3. Prepare for production release
