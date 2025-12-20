import { test, expect } from '@playwright/test';

/**
 * E2E tests for the Feedback Widget
 * Tests run against wrangler dev server at http://localhost:8787
 */

test.describe('Widget Loading', () => {
  test('page loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('FeedbackWidget')) {
        errors.push(msg.text());
      }
    });

    await page.goto('/test/');
    await page.waitForTimeout(500);

    // Filter out expected widget errors (missing repo in some test scenarios)
    const unexpectedErrors = errors.filter(e => !e.includes('Missing data-repo'));
    expect(unexpectedErrors).toHaveLength(0);
  });

  test('widget host element exists', async ({ page }) => {
    await page.goto('/test/');
    await page.waitForTimeout(500);

    // Widget creates a host element
    const host = page.locator('#feedback-widget-host');
    await expect(host).toBeAttached();
  });

  test('feedback button is visible in shadow DOM', async ({ page }) => {
    await page.goto('/test/');
    await page.waitForTimeout(500);

    // Access button inside shadow DOM
    const button = page.locator('#feedback-widget-host').locator('css=.fw-trigger');
    await expect(button).toBeVisible();
  });
});

test.describe('Widget Interaction', () => {
  test('clicking feedback button triggers modal', async ({ page }) => {
    await page.goto('/test/');
    await page.waitForTimeout(500);

    // Click the trigger button
    const button = page.locator('#feedback-widget-host').locator('css=.fw-trigger');
    await button.click();

    // Wait for modal to appear
    await page.waitForTimeout(500);

    // Modal should be visible (or installation prompt if not installed)
    const modal = page.locator('#feedback-widget-host').locator('css=.fw-modal');
    const hasModal = await modal.count() > 0;

    // Either modal or some UI response should happen
    expect(hasModal).toBe(true);
  });
});

test.describe('API Endpoints', () => {
  test('health endpoint returns ok', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.environment).toBeDefined();
    expect(data.timestamp).toBeDefined();
  });

  test('health endpoint has CORS headers', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.headers()['access-control-allow-origin']).toBe('*');
  });

  test('feedback endpoint validates required fields', async ({ request }) => {
    // Missing repo
    const res1 = await request.post('/api/feedback', {
      data: { title: 'Test', description: 'Test' }
    });
    expect(res1.status()).toBe(400);

    // Missing title
    const res2 = await request.post('/api/feedback', {
      data: { repo: 'owner/repo', description: 'Test' }
    });
    expect(res2.status()).toBe(400);

    // Missing description
    const res3 = await request.post('/api/feedback', {
      data: { repo: 'owner/repo', title: 'Test' }
    });
    expect(res3.status()).toBe(400);
  });

  test('feedback endpoint rejects invalid repo format', async ({ request }) => {
    const response = await request.post('/api/feedback', {
      data: {
        repo: 'invalid-format',
        title: 'Test',
        description: 'Test',
        metadata: {
          url: 'http://test.com',
          userAgent: 'test',
          viewport: { width: 1920, height: 1080 },
          timestamp: new Date().toISOString()
        }
      }
    });
    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Invalid repo format');
  });
});

test.describe('Widget Build', () => {
  test('widget.js is accessible', async ({ request }) => {
    const response = await request.get('/widget.js');
    expect(response.ok()).toBeTruthy();

    const content = await response.text();
    expect(content).toContain('use strict');
  });

  test('widget.js is an IIFE bundle', async ({ request }) => {
    const response = await request.get('/widget.js');
    const content = await response.text();

    // IIFE pattern starts with (()=>{ or similar
    expect(content).toMatch(/^\s*["']use strict["'];?\s*\(\s*\(\s*\)\s*=>\s*\{/);
  });
});
