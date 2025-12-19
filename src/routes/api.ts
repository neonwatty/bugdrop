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
