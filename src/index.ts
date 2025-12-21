import { Hono } from 'hono';
import { logger } from 'hono/logger';
import type { Env } from './types';
import api from './routes/api';

const app = new Hono<{ Bindings: Env }>();

// Validate required environment variables on first request
let envValidated = false;
app.use('*', async (c, next) => {
  if (!envValidated) {
    const missing: string[] = [];
    if (!c.env.GITHUB_APP_ID) missing.push('GITHUB_APP_ID');
    if (!c.env.GITHUB_PRIVATE_KEY) missing.push('GITHUB_PRIVATE_KEY');

    if (missing.length > 0) {
      console.error(`Missing required env vars: ${missing.join(', ')}`);
      return c.json({
        error: 'Server misconfigured',
        details: `Missing required environment variables: ${missing.join(', ')}`,
      }, 500);
    }

    // Warn about development-only settings
    if (c.env.ALLOWED_ORIGINS === '*' && c.env.ENVIRONMENT !== 'development') {
      console.warn('WARNING: ALLOWED_ORIGINS is set to "*" in non-development environment');
    }

    envValidated = true;
  }
  return next();
});

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
