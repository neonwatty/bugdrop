import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, FeedbackPayload } from '../types';
import {
  getInstallationToken,
  createIssue,
  uploadScreenshotAsAsset,
  isRepoPublic,
} from '../lib/github';

const api = new Hono<{ Bindings: Env }>();

// CORS middleware with origin whitelist
api.use('*', async (c, next) => {
  const allowedOrigins = c.env.ALLOWED_ORIGINS || '*';

  // Parse allowed origins
  const originList = allowedOrigins === '*'
    ? ['*']
    : allowedOrigins.split(',').map(o => o.trim()).filter(Boolean);

  const corsMiddleware = cors({
    origin: (origin) => {
      // Allow requests with no origin (e.g., curl, server-to-server)
      if (!origin) return '*';
      // Wildcard allows all
      if (originList.includes('*')) return origin;
      // Check if origin is in whitelist
      return originList.includes(origin) ? origin : null;
    },
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  });

  return corsMiddleware(c, next);
});

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

  // Validate screenshot size
  const maxSizeMB = parseInt(c.env.MAX_SCREENSHOT_SIZE_MB || '5', 10);
  if (payload.screenshot) {
    const sizeBytes = (payload.screenshot.length * 3) / 4; // Base64 to bytes
    const sizeMB = sizeBytes / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      return c.json({
        error: `Screenshot too large: ${sizeMB.toFixed(1)}MB exceeds ${maxSizeMB}MB limit`,
      }, 400);
    }
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
      const appName = c.env.GITHUB_APP_NAME || 'your-app-name';
      return c.json({
        error: 'GitHub App not installed on this repository',
        installUrl: `https://github.com/apps/${appName}/installations/new`,
      }, 403);
    }

    // Upload screenshot as file and get URL
    let screenshotUrl: string | undefined;
    const imageData = payload.screenshot;
    if (imageData && imageData.startsWith('data:image/')) {
      try {
        screenshotUrl = await uploadScreenshotAsAsset(
          token,
          owner,
          repo,
          imageData
        );
      } catch (error) {
        console.error('Failed to upload screenshot:', error);
        // Continue without screenshot rather than failing the whole submission
      }
    }

    // Build issue body
    const body = formatIssueBody(payload, screenshotUrl);

    // Check repo visibility (for UI to decide whether to show issue link)
    const isPublic = await isRepoPublic(token, owner, repo);

    // Create issue
    const issue = await createIssue(
      token,
      owner,
      repo,
      payload.title,
      body,
      ['bug', 'bugdrop']
    );

    return c.json({
      success: true,
      issueNumber: issue.number,
      issueUrl: issue.html_url,
      isPublic,
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
  screenshotDataUrl?: string
): string {
  const sections: string[] = [];

  // Submitter info (if provided)
  if (payload.submitter?.name || payload.submitter?.email) {
    sections.push('## Submitted by');
    const parts: string[] = [];
    if (payload.submitter.name) {
      parts.push(`**${payload.submitter.name}**`);
    }
    if (payload.submitter.email) {
      parts.push(`(${payload.submitter.email})`);
    }
    sections.push(parts.join(' '));
    sections.push('');
  }

  // Description
  sections.push('## Description');
  sections.push(payload.description);
  sections.push('');

  // Screenshot - embedded as base64 data URL
  if (screenshotDataUrl) {
    sections.push('## Screenshot');
    sections.push(`![Screenshot](${screenshotDataUrl})`);
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
  sections.push('*Submitted via [BugDrop](https://github.com/neonwatty/bugdrop)*');

  return sections.join('\n');
}

export default api;
