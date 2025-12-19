# Cloudflare Worker Setup

## Overview

The Cloudflare Worker serves two purposes:
1. **API Endpoint**: Receives feedback, authenticates with GitHub, creates issues
2. **Static Hosting**: Serves the widget.js file

## Project Initialization

### Create Project with Hono

```bash
cd /Users/jeremywatt/Desktop/helper

# Create Cloudflare Worker with Hono framework
npm create hono@latest . -- --template cloudflare-workers
```

### Install Dependencies

```bash
# Core dependencies
npm install jose                          # JWT signing (works with WebCrypto)

# Development dependencies
npm install -D @cloudflare/workers-types  # TypeScript types
npm install -D vitest                     # Testing
npm install -D @cloudflare/vitest-pool-workers  # Worker testing
npm install -D esbuild                    # Widget bundling
```

## Configuration Files

### wrangler.toml

```toml
name = "feedback-widget"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# Serve built widget from public/ directory
assets = { directory = "public" }

[vars]
ENVIRONMENT = "development"

# Staging environment
[env.staging]
name = "feedback-widget-staging"
vars = { ENVIRONMENT = "staging" }

# Production environment
[env.production]
name = "feedback-widget-production"
vars = { ENVIRONMENT = "production" }
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "jsx": "react-jsx",
    "jsxImportSource": "hono/jsx",
    "outDir": "dist",
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "src/widget/**/*"]
}
```

### package.json scripts

```json
{
  "scripts": {
    "dev": "wrangler dev",
    "build:widget": "esbuild src/widget/index.ts --bundle --minify --format=iife --outfile=public/widget.js",
    "build": "npm run build:widget",
    "deploy:staging": "npm run build && wrangler deploy --env staging",
    "deploy:production": "npm run build && wrangler deploy --env production",
    "test": "vitest",
    "types": "wrangler types"
  }
}
```

## Local Development

### Environment Variables

Create `.dev.vars` for local secrets:

```
GITHUB_APP_ID=123456
GITHUB_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
...your key here...
-----END PRIVATE KEY-----"
```

**Important**:
- `.dev.vars` uses dotenv syntax
- Never commit this file
- Add to `.gitignore`

### Start Development Server

```bash
npm run dev
```

This starts a local server at `http://localhost:8787` with:
- Hot reloading
- Access to secrets from `.dev.vars`
- Full Workers runtime

### Testing Endpoints

```bash
# Health check
curl http://localhost:8787/api/health

# Check installation
curl http://localhost:8787/api/check/owner/repo

# Submit feedback (POST)
curl -X POST http://localhost:8787/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"repo": "owner/repo", "title": "Test", "description": "Test"}'
```

## Serving Static Assets

The widget.js file is served from the `public/` directory.

### How It Works

```toml
# In wrangler.toml
assets = { directory = "public" }
```

- Files in `public/` are served at the root
- `public/widget.js` → `https://your-worker.dev/widget.js`
- Automatic caching and global CDN

### Build Widget Before Serving

```bash
# Build widget to public/
npm run build:widget

# Start dev server (now serves built widget)
npm run dev
```

## Project Structure

```
feedback-widget/
├── src/
│   ├── index.ts           # Worker entry point
│   ├── types.ts           # TypeScript types
│   ├── routes/
│   │   └── api.ts         # API route handlers
│   ├── lib/
│   │   ├── jwt.ts         # JWT generation
│   │   └── github.ts      # GitHub API client
│   └── widget/            # Widget source (separate build)
│       ├── index.ts
│       ├── picker.ts
│       ├── screenshot.ts
│       ├── annotator.ts
│       └── ui.ts
├── public/                # Static assets (gitignored widget.js)
│   └── widget.js          # Built widget
├── test/
│   └── index.html         # Local test page
├── wrangler.toml
├── tsconfig.json
├── package.json
└── .dev.vars              # Local secrets (gitignored)
```

## Testing with Vitest

### vitest.config.ts

```typescript
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
      },
    },
  },
});
```

### Example Test

```typescript
// test/worker.test.ts
import { env, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

describe('API', () => {
  it('health check returns ok', async () => {
    const response = await SELF.fetch('http://localhost/api/health');
    const data = await response.json();
    expect(data.status).toBe('ok');
  });
});
```

### Run Tests

```bash
npm test
```

## Deployment

### Set Production Secrets

```bash
# For staging
npx wrangler secret put GITHUB_APP_ID --env staging
npx wrangler secret put GITHUB_PRIVATE_KEY --env staging

# For production
npx wrangler secret put GITHUB_APP_ID --env production
npx wrangler secret put GITHUB_PRIVATE_KEY --env production
```

### Deploy

```bash
# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production
```

### View Logs

```bash
# Real-time logs
npx wrangler tail --env staging
```

## Custom Domain (Optional)

1. Go to Cloudflare Dashboard → Workers & Pages
2. Select your worker
3. Go to **Triggers** tab
4. Click **Add Custom Domain**
5. Enter your domain (e.g., `feedback-widget.yourdomain.com`)

## Troubleshooting

### "Module not found"

- Run `npm install` to ensure dependencies are installed
- Check import paths are correct

### Secrets not working locally

- Ensure `.dev.vars` file exists in project root
- Check variable names match exactly
- Restart `wrangler dev` after changes

### Widget not serving

- Run `npm run build:widget` first
- Check `public/widget.js` exists
- Verify `assets` config in wrangler.toml

### CORS errors

- Ensure CORS middleware is applied
- Check allowed origins in production

## References

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler Configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Hono Framework](https://hono.dev/docs/getting-started/cloudflare-workers)
- [Vitest with Workers](https://developers.cloudflare.com/workers/testing/vitest-integration/)
