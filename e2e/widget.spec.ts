import { test, expect } from '@playwright/test';

/**
 * E2E tests for BugDrop
 * Tests run against wrangler dev server at http://localhost:8787
 */

test.describe('Widget Loading', () => {
  test('page loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('BugDrop')) {
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
    const host = page.locator('#bugdrop-host');
    await expect(host).toBeAttached();
  });

  test('feedback button is visible in shadow DOM', async ({ page }) => {
    await page.goto('/test/');
    await page.waitForTimeout(500);

    // Access button inside shadow DOM
    const button = page.locator('#bugdrop-host').locator('css=.bd-trigger');
    await expect(button).toBeVisible();
  });
});

test.describe('Widget Interaction', () => {
  test('clicking feedback button triggers modal', async ({ page }) => {
    await page.goto('/test/');

    // Wait for widget to be ready
    const button = page.locator('#bugdrop-host').locator('css=.bd-trigger');
    await expect(button).toBeVisible({ timeout: 5000 });

    // Click the trigger button
    await button.click();

    // Modal should appear (or installation prompt if not installed)
    const modal = page.locator('#bugdrop-host').locator('css=.bd-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });
  });

  test('element picker handles SVG elements without errors', async ({ page }) => {
    // Track console errors - specifically looking for className.split errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      errors.push(err.message);
    });

    // Mock the installation check to return installed: true
    await page.route('**/api/check/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ installed: true }),
      });
    });

    await page.goto('/test/');

    // Wait for widget to be ready
    const button = page.locator('#bugdrop-host').locator('css=.bd-trigger');
    await expect(button).toBeVisible({ timeout: 5000 });

    // Click the trigger button to open modal
    await button.click();

    const modal = page.locator('#bugdrop-host').locator('css=.bd-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Click "Select Element" option
    const selectElementBtn = page.locator('#bugdrop-host').locator('css=[data-action="element"]');
    await expect(selectElementBtn).toBeVisible({ timeout: 5000 });
    await selectElementBtn.click();

    // Wait for element picker mode to be active
    await page.waitForTimeout(500);

    // Click on the SVG element - this previously caused className.split error
    const svgElement = page.locator('#test-svg');
    await expect(svgElement).toBeVisible();
    await svgElement.click();

    // Wait for screenshot capture and annotation modal
    await page.waitForTimeout(1000);

    // Check for the className.split error that was previously occurring
    const classNameErrors = errors.filter(e =>
      e.includes('className.split') ||
      e.includes('split is not a function')
    );

    expect(classNameErrors).toHaveLength(0);

    // Annotation canvas should appear (indicating flow continued successfully to annotation step)
    const annotationCanvas = page.locator('#bugdrop-host').locator('css=#annotation-canvas');
    await expect(annotationCanvas).toBeVisible({ timeout: 5000 });
  });

  test('element picker handles nested SVG child elements without errors', async ({ page }) => {
    // Track console errors - the fix must handle nested SVG elements too
    // since getElementSelector walks up the DOM tree
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      errors.push(err.message);
    });

    // Mock the installation check to return installed: true
    await page.route('**/api/check/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ installed: true }),
      });
    });

    await page.goto('/test/');

    // Wait for widget to be ready
    const button = page.locator('#bugdrop-host').locator('css=.bd-trigger');
    await expect(button).toBeVisible({ timeout: 5000 });

    // Click the trigger button to open modal
    await button.click();

    const modal = page.locator('#bugdrop-host').locator('css=.bd-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Click "Select Element" option
    const selectElementBtn = page.locator('#bugdrop-host').locator('css=[data-action="element"]');
    await expect(selectElementBtn).toBeVisible({ timeout: 5000 });
    await selectElementBtn.click();

    // Wait for element picker mode to be active
    await page.waitForTimeout(500);

    // Click on nested SVG child element (text inside SVG)
    // This tests that getElementSelector handles SVG elements when walking up the tree
    const svgText = page.locator('#test-svg text');
    await expect(svgText).toBeVisible();
    await svgText.click();

    // Wait for screenshot capture and annotation modal
    await page.waitForTimeout(1000);

    // Check for the className.split error
    const classNameErrors = errors.filter(e =>
      e.includes('className.split') ||
      e.includes('split is not a function')
    );

    expect(classNameErrors).toHaveLength(0);

    // Annotation canvas should appear
    const annotationCanvas = page.locator('#bugdrop-host').locator('css=#annotation-canvas');
    await expect(annotationCanvas).toBeVisible({ timeout: 5000 });
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
