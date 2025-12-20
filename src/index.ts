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
