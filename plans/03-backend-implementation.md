# Backend Implementation

## Overview

The backend consists of:
1. **JWT Generation**: Sign tokens for GitHub App authentication
2. **GitHub API Client**: Get installation tokens, create issues, upload files
3. **API Routes**: Handle feedback submission

## Type Definitions

### src/types.ts

```typescript
export interface Env {
  // Secrets (from .dev.vars locally, wrangler secret in production)
  GITHUB_APP_ID: string;
  GITHUB_PRIVATE_KEY: string;

  // Variables (from wrangler.toml)
  ENVIRONMENT: string;

  // Bindings
  ASSETS: Fetcher;
}

export interface FeedbackPayload {
  repo: string;           // "owner/repo" format
  title: string;
  description: string;
  screenshot?: string;    // base64 data URL
  annotations?: string;   // base64 annotated image
  metadata: {
    url: string;
    userAgent: string;
    viewport: { width: number; height: number };
    timestamp: string;
    elementSelector?: string;
  };
}

export interface GitHubIssue {
  number: number;
  html_url: string;
}
```

## JWT Generation

GitHub Apps authenticate using JWTs signed with the private key.

### src/lib/jwt.ts

```typescript
/**
 * Generate a JWT for GitHub App authentication
 * Uses WebCrypto API (available in Cloudflare Workers)
 */

export async function generateGitHubAppJWT(
  appId: string,
  privateKey: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  // JWT Header
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  // JWT Payload
  const payload = {
    iat: now - 60,      // Issued 60 seconds ago (handles clock drift)
    exp: now + 600,     // Expires in 10 minutes (GitHub maximum)
    iss: appId,         // GitHub App ID
  };

  // Encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  // Sign with private key
  const key = await importPrivateKey(privateKey);
  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    key,
    new TextEncoder().encode(signingInput)
  );

  // Build JWT
  const encodedSignature = base64UrlEncode(signature);
  return `${signingInput}.${encodedSignature}`;
}

/**
 * Import PKCS#8 private key for WebCrypto
 */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  // Remove PEM headers and whitespace
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');

  // Decode base64 to binary
  const binaryString = atob(pemContents);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Import key
  return crypto.subtle.importKey(
    'pkcs8',
    bytes.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

/**
 * Base64 URL encode (JWT-safe)
 */
function base64UrlEncode(data: string | ArrayBuffer): string {
  let base64: string;

  if (typeof data === 'string') {
    base64 = btoa(data);
  } else {
    const bytes = new Uint8Array(data);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    base64 = btoa(binary);
  }

  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
```

## GitHub API Client

### src/lib/github.ts

```typescript
import { generateGitHubAppJWT } from './jwt';
import type { Env, GitHubIssue } from '../types';

const GITHUB_API = 'https://api.github.com';

const headers = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'Content-Type': 'application/json',
  'User-Agent': 'FeedbackWidget/1.0',
  'X-GitHub-Api-Version': '2022-11-28',
});

/**
 * Get installation ID for a repository
 */
export async function getInstallationId(
  env: Env,
  owner: string,
  repo: string
): Promise<number | null> {
  const jwt = await generateGitHubAppJWT(env.GITHUB_APP_ID, env.GITHUB_PRIVATE_KEY);

  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/installation`,
    { headers: headers(jwt) }
  );

  if (!response.ok) {
    console.error(`Installation not found: ${response.status}`);
    return null;
  }

  const data = await response.json() as { id: number };
  return data.id;
}

/**
 * Get installation access token (scoped to installed repos)
 */
export async function getInstallationToken(
  env: Env,
  owner: string,
  repo: string
): Promise<string | null> {
  const installationId = await getInstallationId(env, owner, repo);
  if (!installationId) return null;

  const jwt = await generateGitHubAppJWT(env.GITHUB_APP_ID, env.GITHUB_PRIVATE_KEY);

  const response = await fetch(
    `${GITHUB_API}/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: headers(jwt),
    }
  );

  if (!response.ok) {
    console.error(`Failed to get token: ${response.status}`);
    return null;
  }

  const data = await response.json() as { token: string };
  return data.token;
}

/**
 * Create a GitHub issue
 */
export async function createIssue(
  token: string,
  owner: string,
  repo: string,
  title: string,
  body: string,
  labels: string[] = ['feedback']
): Promise<GitHubIssue> {
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/issues`,
    {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ title, body, labels }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create issue: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Upload a file to the repository
 */
export async function uploadFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string,  // base64 encoded
  message: string
): Promise<string> {
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
    {
      method: 'PUT',
      headers: headers(token),
      body: JSON.stringify({ message, content }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload file: ${response.status} - ${error}`);
  }

  const data = await response.json() as { content: { download_url: string } };
  return data.content.download_url;
}

/**
 * Upload screenshot and return URL
 */
export async function uploadScreenshot(
  token: string,
  owner: string,
  repo: string,
  base64DataUrl: string
): Promise<string> {
  // Remove data URL prefix
  const content = base64DataUrl.replace(/^data:image\/\w+;base64,/, '');

  // Generate unique filename
  const filename = `.feedback/screenshots/${Date.now()}.png`;

  return uploadFile(
    token,
    owner,
    repo,
    filename,
    content,
    'Add feedback screenshot'
  );
}
```

## API Routes

### src/routes/api.ts

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, FeedbackPayload } from '../types';
import {
  getInstallationToken,
  createIssue,
  uploadScreenshot,
} from '../lib/github';

const api = new Hono<{ Bindings: Env }>();

// CORS middleware
api.use('*', cors({
  origin: '*',  // Configure for production
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}));

// Health check
api.get('/health', (c) => {
  return c.json({
    status: 'ok',
    environment: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
  });
});

// Check if app is installed on repo
api.get('/check/:owner/:repo', async (c) => {
  const { owner, repo } = c.req.param();

  const token = await getInstallationToken(c.env, owner, repo);

  return c.json({
    installed: !!token,
    repo: `${owner}/${repo}`,
  });
});

// Submit feedback
api.post('/feedback', async (c) => {
  // Parse payload
  let payload: FeedbackPayload;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  // Validate required fields
  if (!payload.repo || !payload.title || !payload.description) {
    return c.json({
      error: 'Missing required fields: repo, title, description',
    }, 400);
  }

  // Parse owner/repo
  const [owner, repo] = payload.repo.split('/');
  if (!owner || !repo) {
    return c.json({
      error: 'Invalid repo format. Expected: owner/repo',
    }, 400);
  }

  try {
    // Get installation token
    const token = await getInstallationToken(c.env, owner, repo);
    if (!token) {
      return c.json({
        error: 'GitHub App not installed on this repository',
        installUrl: 'https://github.com/apps/YOUR_APP_NAME/installations/new',
      }, 403);
    }

    // Upload screenshot if provided
    let screenshotUrl: string | undefined;
    const imageData = payload.annotations || payload.screenshot;
    if (imageData) {
      screenshotUrl = await uploadScreenshot(token, owner, repo, imageData);
    }

    // Build issue body
    const body = formatIssueBody(payload, screenshotUrl);

    // Create issue
    const issue = await createIssue(
      token,
      owner,
      repo,
      payload.title,
      body,
      ['feedback', 'widget']
    );

    return c.json({
      success: true,
      issueNumber: issue.number,
      issueUrl: issue.html_url,
    });

  } catch (error) {
    console.error('Error creating feedback:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to create issue',
    }, 500);
  }
});

/**
 * Format the issue body with markdown
 */
function formatIssueBody(
  payload: FeedbackPayload,
  screenshotUrl?: string
): string {
  const sections: string[] = [];

  // Description
  sections.push('## Description');
  sections.push(payload.description);
  sections.push('');

  // Screenshot
  if (screenshotUrl) {
    sections.push('## Screenshot');
    sections.push(`![Screenshot](${screenshotUrl})`);
    sections.push('');
  }

  // Metadata
  sections.push('<details>');
  sections.push('<summary>Technical Details</summary>');
  sections.push('');
  sections.push('| Property | Value |');
  sections.push('|----------|-------|');
  sections.push(`| **URL** | ${payload.metadata.url} |`);
  sections.push(`| **Viewport** | ${payload.metadata.viewport.width} x ${payload.metadata.viewport.height} |`);
  sections.push(`| **Timestamp** | ${payload.metadata.timestamp} |`);

  if (payload.metadata.elementSelector) {
    sections.push(`| **Element** | \`${payload.metadata.elementSelector}\` |`);
  }

  sections.push('');
  sections.push('</details>');
  sections.push('');
  sections.push('---');
  sections.push('*Submitted via Feedback Widget*');

  return sections.join('\n');
}

export default api;
```

## Main Worker Entry

### src/index.ts

```typescript
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import type { Env } from './types';
import api from './routes/api';

const app = new Hono<{ Bindings: Env }>();

// Request logging
app.use('*', logger());

// Mount API routes
app.route('/api', api);

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'Feedback Widget API',
    version: '1.0.0',
    docs: {
      health: 'GET /api/health',
      check: 'GET /api/check/:owner/:repo',
      feedback: 'POST /api/feedback',
      widget: 'GET /widget.js',
    },
  });
});

// Serve widget.js from static assets
app.get('/widget.js', async (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
```

## Error Handling

The API returns consistent error responses:

```typescript
// Success
{
  "success": true,
  "issueNumber": 42,
  "issueUrl": "https://github.com/owner/repo/issues/42"
}

// Error
{
  "error": "Description of what went wrong"
}
```

## Testing the API

```bash
# Start dev server
npm run dev

# Health check
curl http://localhost:8787/api/health

# Check installation
curl http://localhost:8787/api/check/yourname/yourrepo

# Submit feedback
curl -X POST http://localhost:8787/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "repo": "yourname/yourrepo",
    "title": "Test feedback",
    "description": "This is a test",
    "metadata": {
      "url": "http://localhost:3000",
      "userAgent": "curl",
      "viewport": {"width": 1920, "height": 1080},
      "timestamp": "2025-01-15T12:00:00Z"
    }
  }'
```
