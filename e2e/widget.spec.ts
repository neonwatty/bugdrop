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

test.describe('Dismissible Button', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/test/dismissible.html');
    await page.evaluate(() => localStorage.removeItem('bugdrop_dismissed'));
  });

  test('close icon appears on hover when dismissible is enabled', async ({ page }) => {
    await page.goto('/test/dismissible.html');

    const trigger = page.locator('#bugdrop-host').locator('css=.bd-trigger');
    await expect(trigger).toBeVisible({ timeout: 5000 });

    // Close button should exist but be hidden initially
    const closeBtn = page.locator('#bugdrop-host').locator('css=.bd-trigger-close');
    await expect(closeBtn).toBeAttached();

    // Check that close button has opacity 0 initially (hidden)
    const initialOpacity = await closeBtn.evaluate(el => getComputedStyle(el).opacity);
    expect(parseFloat(initialOpacity)).toBeLessThan(0.5);

    // Hover over the trigger button
    await trigger.hover();

    // Wait for transition and check opacity is now 1 (visible)
    await page.waitForTimeout(200);
    const hoverOpacity = await closeBtn.evaluate(el => getComputedStyle(el).opacity);
    expect(parseFloat(hoverOpacity)).toBeGreaterThan(0.5);
  });

  test('clicking close icon hides the button', async ({ page }) => {
    await page.goto('/test/dismissible.html');

    const trigger = page.locator('#bugdrop-host').locator('css=.bd-trigger');
    await expect(trigger).toBeVisible({ timeout: 5000 });

    // Hover to reveal close button
    await trigger.hover();
    await page.waitForTimeout(200);

    // Click the close button
    const closeBtn = page.locator('#bugdrop-host').locator('css=.bd-trigger-close');
    await closeBtn.click();

    // Trigger should no longer exist
    await expect(trigger).not.toBeAttached();
  });

  test('clicking close icon does not open feedback modal', async ({ page }) => {
    await page.goto('/test/dismissible.html');

    const trigger = page.locator('#bugdrop-host').locator('css=.bd-trigger');
    await expect(trigger).toBeVisible({ timeout: 5000 });

    // Hover to reveal close button
    await trigger.hover();
    await page.waitForTimeout(200);

    // Click the close button
    const closeBtn = page.locator('#bugdrop-host').locator('css=.bd-trigger-close');
    await closeBtn.click();

    // Modal should not appear
    const modal = page.locator('#bugdrop-host').locator('css=.bd-modal');
    await expect(modal).not.toBeVisible();
  });

  test('button stays hidden after page reload (localStorage persistence)', async ({ page }) => {
    await page.goto('/test/dismissible.html');

    const trigger = page.locator('#bugdrop-host').locator('css=.bd-trigger');
    await expect(trigger).toBeVisible({ timeout: 5000 });

    // Hover and click close button
    await trigger.hover();
    await page.waitForTimeout(200);
    const closeBtn = page.locator('#bugdrop-host').locator('css=.bd-trigger-close');
    await closeBtn.click();

    // Verify button is gone
    await expect(trigger).not.toBeAttached();

    // Reload the page
    await page.reload();
    await page.waitForTimeout(500);

    // Button should still be hidden
    const triggerAfterReload = page.locator('#bugdrop-host').locator('css=.bd-trigger');
    await expect(triggerAfterReload).not.toBeAttached();
  });

  test('button appears normally when dismissible is not enabled', async ({ page }) => {
    // Use the regular test page (no dismissible attribute)
    await page.goto('/test/');

    const trigger = page.locator('#bugdrop-host').locator('css=.bd-trigger');
    await expect(trigger).toBeVisible({ timeout: 5000 });

    // Close button should NOT exist
    const closeBtn = page.locator('#bugdrop-host').locator('css=.bd-trigger-close');
    await expect(closeBtn).not.toBeAttached();
  });

  test('localStorage dismissed state is ignored when dismissible is false', async ({ page }) => {
    // Set localStorage as if button was dismissed
    await page.goto('/test/');
    await page.evaluate(() => localStorage.setItem('bugdrop_dismissed', 'true'));

    // Reload page (regular test page without dismissible)
    await page.reload();
    await page.waitForTimeout(500);

    // Button should still be visible because dismissible is not enabled
    const trigger = page.locator('#bugdrop-host').locator('css=.bd-trigger');
    await expect(trigger).toBeVisible({ timeout: 5000 });
  });

  // === Edge Case Tests ===

  test('dismissible button works in light theme', async ({ page }) => {
    await page.goto('/test/dismissible-light.html');
    await page.evaluate(() => localStorage.removeItem('bugdrop_dismissed'));
    await page.reload();

    const trigger = page.locator('#bugdrop-host').locator('css=.bd-trigger');
    await expect(trigger).toBeVisible({ timeout: 5000 });

    // Close button should exist
    const closeBtn = page.locator('#bugdrop-host').locator('css=.bd-trigger-close');
    await expect(closeBtn).toBeAttached();

    // Hover to reveal close button
    await trigger.hover();
    await page.waitForTimeout(200);

    // Verify close button is visible
    const hoverOpacity = await closeBtn.evaluate(el => getComputedStyle(el).opacity);
    expect(parseFloat(hoverOpacity)).toBeGreaterThan(0.5);

    // Click close and verify dismiss works
    await closeBtn.click();
    await expect(trigger).not.toBeAttached();

    // Verify persistence
    await page.reload();
    await page.waitForTimeout(500);
    await expect(page.locator('#bugdrop-host').locator('css=.bd-trigger')).not.toBeAttached();
  });

  test('dismissible button works with bottom-left position', async ({ page }) => {
    await page.goto('/test/dismissible-left.html');
    await page.evaluate(() => localStorage.removeItem('bugdrop_dismissed'));
    await page.reload();

    const trigger = page.locator('#bugdrop-host').locator('css=.bd-trigger');
    await expect(trigger).toBeVisible({ timeout: 5000 });

    // Verify button is on the left side
    const buttonBox = await trigger.boundingBox();
    expect(buttonBox).not.toBeNull();
    if (buttonBox) {
      // Button should be closer to left edge than right edge
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(buttonBox.x).toBeLessThan(viewportWidth / 2);
    }

    // Close button should exist and work
    const closeBtn = page.locator('#bugdrop-host').locator('css=.bd-trigger-close');
    await expect(closeBtn).toBeAttached();

    // Hover and dismiss
    await trigger.hover();
    await page.waitForTimeout(200);
    await closeBtn.click();
    await expect(trigger).not.toBeAttached();
  });

  test('close icon is always visible on touch devices', async ({ browser }) => {
    // Create a context with touch device emulation
    const context = await browser.newContext({
      hasTouch: true,
      isMobile: true,
      viewport: { width: 390, height: 844 }, // iPhone 14 Pro dimensions
    });
    const page = await context.newPage();

    await page.goto('/test/dismissible.html');
    await page.evaluate(() => localStorage.removeItem('bugdrop_dismissed'));
    await page.reload();

    const trigger = page.locator('#bugdrop-host').locator('css=.bd-trigger');
    await expect(trigger).toBeVisible({ timeout: 5000 });

    const closeBtn = page.locator('#bugdrop-host').locator('css=.bd-trigger-close');
    await expect(closeBtn).toBeAttached();

    // On touch devices, close button should be visible without hover
    // due to @media (hover: none) CSS rule
    const opacity = await closeBtn.evaluate(el => getComputedStyle(el).opacity);
    expect(parseFloat(opacity)).toBe(1);

    // Tap to dismiss should work
    await closeBtn.tap();
    await expect(trigger).not.toBeAttached();

    await context.close();
  });

  test('keyboard accessibility - dismiss with Enter key', async ({ page }) => {
    await page.goto('/test/dismissible.html');
    await page.evaluate(() => localStorage.removeItem('bugdrop_dismissed'));
    await page.reload();

    const trigger = page.locator('#bugdrop-host').locator('css=.bd-trigger');
    await expect(trigger).toBeVisible({ timeout: 5000 });

    // Hover to reveal close button
    await trigger.hover();
    await page.waitForTimeout(200);

    const closeBtn = page.locator('#bugdrop-host').locator('css=.bd-trigger-close');

    // Focus the close button and press Enter
    await closeBtn.focus();
    await page.keyboard.press('Enter');

    // Button should be dismissed
    await expect(trigger).not.toBeAttached();
  });

  test('keyboard accessibility - dismiss with Space key', async ({ page }) => {
    await page.goto('/test/dismissible.html');
    await page.evaluate(() => localStorage.removeItem('bugdrop_dismissed'));
    await page.reload();

    const trigger = page.locator('#bugdrop-host').locator('css=.bd-trigger');
    await expect(trigger).toBeVisible({ timeout: 5000 });

    // Hover to reveal close button
    await trigger.hover();
    await page.waitForTimeout(200);

    const closeBtn = page.locator('#bugdrop-host').locator('css=.bd-trigger-close');

    // Focus the close button and press Space
    await closeBtn.focus();
    await page.keyboard.press('Space');

    // Button should be dismissed
    await expect(trigger).not.toBeAttached();
  });

  test('close icon changes to red/error color on direct hover', async ({ page }) => {
    await page.goto('/test/dismissible.html');
    await page.evaluate(() => localStorage.removeItem('bugdrop_dismissed'));
    await page.reload();

    const trigger = page.locator('#bugdrop-host').locator('css=.bd-trigger');
    await expect(trigger).toBeVisible({ timeout: 5000 });

    const closeBtn = page.locator('#bugdrop-host').locator('css=.bd-trigger-close');

    // Hover over trigger first to reveal close button
    await trigger.hover();
    await page.waitForTimeout(200);

    // Get initial background color
    const initialBg = await closeBtn.evaluate(el => getComputedStyle(el).backgroundColor);

    // Now hover directly on close button
    await closeBtn.hover();
    await page.waitForTimeout(100);

    // Get hovered background color
    const hoveredBg = await closeBtn.evaluate(el => getComputedStyle(el).backgroundColor);

    // Colors should be different (close button turns red on hover)
    expect(hoveredBg).not.toBe(initialBg);

    // Verify it's a reddish color (error color)
    // Parse RGB and check red channel is dominant
    const rgbMatch = hoveredBg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      const [, r, g, b] = rgbMatch.map(Number);
      expect(r).toBeGreaterThan(200); // High red
      expect(r).toBeGreaterThan(g); // Red > Green
      expect(r).toBeGreaterThan(b); // Red > Blue
    }
  });

  test('localStorage key is set correctly on dismiss (timestamp format)', async ({ page }) => {
    await page.goto('/test/dismissible.html');
    await page.evaluate(() => localStorage.removeItem('bugdrop_dismissed'));
    await page.reload();

    const trigger = page.locator('#bugdrop-host').locator('css=.bd-trigger');
    await expect(trigger).toBeVisible({ timeout: 5000 });

    // Verify localStorage is empty before dismiss
    const beforeDismiss = await page.evaluate(() => localStorage.getItem('bugdrop_dismissed'));
    expect(beforeDismiss).toBeNull();

    // Dismiss the button
    await trigger.hover();
    await page.waitForTimeout(200);
    const closeBtn = page.locator('#bugdrop-host').locator('css=.bd-trigger-close');
    await closeBtn.click();

    // Verify localStorage key is set to a timestamp (number)
    const afterDismiss = await page.evaluate(() => localStorage.getItem('bugdrop_dismissed'));
    expect(afterDismiss).not.toBeNull();
    const timestamp = parseInt(afterDismiss!, 10);
    expect(isNaN(timestamp)).toBe(false);
    // Timestamp should be recent (within last minute)
    expect(Date.now() - timestamp).toBeLessThan(60000);

    // Verify only our key was set (no other bugdrop keys)
    const allKeys = await page.evaluate(() => Object.keys(localStorage).filter(k => k.includes('bugdrop')));
    expect(allKeys).toEqual(['bugdrop_dismissed']);
  });

  test('legacy "true" localStorage value still works (permanent dismiss)', async ({ page }) => {
    await page.goto('/test/dismissible.html');
    // Set legacy 'true' value
    await page.evaluate(() => localStorage.setItem('bugdrop_dismissed', 'true'));
    await page.reload();
    await page.waitForTimeout(500);

    // Button should be hidden
    const trigger = page.locator('#bugdrop-host').locator('css=.bd-trigger');
    await expect(trigger).not.toBeAttached();
  });

  test('BugDrop.show() brings back dismissed button', async ({ page }) => {
    await page.goto('/test/dismissible.html');
    await page.evaluate(() => localStorage.removeItem('bugdrop_dismissed'));
    await page.reload();

    const trigger = page.locator('#bugdrop-host').locator('css=.bd-trigger');
    await expect(trigger).toBeVisible({ timeout: 5000 });

    // Dismiss the button
    await trigger.hover();
    await page.waitForTimeout(200);
    const closeBtn = page.locator('#bugdrop-host').locator('css=.bd-trigger-close');
    await closeBtn.click();

    // Verify button is gone
    await expect(trigger).not.toBeAttached();

    // Verify localStorage is set
    const dismissed = await page.evaluate(() => localStorage.getItem('bugdrop_dismissed'));
    expect(dismissed).not.toBeNull();

    // Call BugDrop.show() to bring button back
    await page.evaluate(() => window.BugDrop?.show());
    await page.waitForTimeout(300);

    // Button should be visible again
    const triggerAfterShow = page.locator('#bugdrop-host').locator('css=.bd-trigger');
    await expect(triggerAfterShow).toBeVisible();

    // localStorage should be cleared
    const dismissedAfterShow = await page.evaluate(() => localStorage.getItem('bugdrop_dismissed'));
    expect(dismissedAfterShow).toBeNull();
  });

  test('BugDrop.show() works even after page reload when dismissed', async ({ page }) => {
    await page.goto('/test/dismissible.html');
    await page.evaluate(() => localStorage.removeItem('bugdrop_dismissed'));
    await page.reload();

    const trigger = page.locator('#bugdrop-host').locator('css=.bd-trigger');
    await expect(trigger).toBeVisible({ timeout: 5000 });

    // Dismiss the button
    await trigger.hover();
    await page.waitForTimeout(200);
    const closeBtn = page.locator('#bugdrop-host').locator('css=.bd-trigger-close');
    await closeBtn.click();
    await expect(trigger).not.toBeAttached();

    // Reload the page - button should still be hidden
    await page.reload();
    await page.waitForTimeout(500);
    const triggerAfterReload = page.locator('#bugdrop-host').locator('css=.bd-trigger');
    await expect(triggerAfterReload).not.toBeAttached();

    // Call BugDrop.show() to bring button back
    await page.evaluate(() => window.BugDrop?.show());
    await page.waitForTimeout(300);

    // Button should be visible
    const triggerAfterShow = page.locator('#bugdrop-host').locator('css=.bd-trigger');
    await expect(triggerAfterShow).toBeVisible();
  });

  test('clearing localStorage restores the button', async ({ page }) => {
    await page.goto('/test/dismissible.html');

    // First dismiss the button
    await page.evaluate(() => localStorage.removeItem('bugdrop_dismissed'));
    await page.reload();

    const trigger = page.locator('#bugdrop-host').locator('css=.bd-trigger');
    await expect(trigger).toBeVisible({ timeout: 5000 });

    await trigger.hover();
    await page.waitForTimeout(200);
    const closeBtn = page.locator('#bugdrop-host').locator('css=.bd-trigger-close');
    await closeBtn.click();
    await expect(trigger).not.toBeAttached();

    // Now clear localStorage and reload
    await page.evaluate(() => localStorage.removeItem('bugdrop_dismissed'));
    await page.reload();
    await page.waitForTimeout(500);

    // Button should be visible again
    const triggerRestored = page.locator('#bugdrop-host').locator('css=.bd-trigger');
    await expect(triggerRestored).toBeVisible({ timeout: 5000 });
  });

  test('widget handles localStorage errors gracefully', async ({ page }) => {
    // Track console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    page.on('pageerror', err => {
      errors.push(err.message);
    });

    await page.goto('/test/dismissible.html');
    await page.evaluate(() => localStorage.removeItem('bugdrop_dismissed'));

    // Override localStorage to throw errors
    await page.evaluate(() => {
      const originalSetItem = localStorage.setItem.bind(localStorage);
      const _originalGetItem = localStorage.getItem.bind(localStorage);

      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: () => { throw new Error('localStorage blocked'); },
          setItem: () => { throw new Error('localStorage blocked'); },
          removeItem: originalSetItem,
          clear: () => {},
          key: () => null,
          length: 0,
        },
        writable: true,
      });
    });

    // Reload with broken localStorage
    await page.reload();
    await page.waitForTimeout(500);

    // Widget should still load (graceful degradation)
    const trigger = page.locator('#bugdrop-host').locator('css=.bd-trigger');
    await expect(trigger).toBeVisible({ timeout: 5000 });

    // Dismiss should still work visually (even if not persisted)
    await trigger.hover();
    await page.waitForTimeout(200);
    const closeBtn = page.locator('#bugdrop-host').locator('css=.bd-trigger-close');
    await closeBtn.click();

    // Button should be hidden
    await expect(trigger).not.toBeAttached();

    // No uncaught errors related to localStorage
    const localStorageErrors = errors.filter(e => e.includes('localStorage'));
    expect(localStorageErrors).toHaveLength(0);
  });

  test('rapid double-click on close button does not cause errors', async ({ page }) => {
    // Track console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    page.on('pageerror', err => {
      errors.push(err.message);
    });

    await page.goto('/test/dismissible.html');
    await page.evaluate(() => localStorage.removeItem('bugdrop_dismissed'));
    await page.reload();

    const trigger = page.locator('#bugdrop-host').locator('css=.bd-trigger');
    await expect(trigger).toBeVisible({ timeout: 5000 });

    // Hover to reveal close button
    await trigger.hover();
    await page.waitForTimeout(200);

    const closeBtn = page.locator('#bugdrop-host').locator('css=.bd-trigger-close');

    // Double-click rapidly
    await closeBtn.dblclick();

    // Button should be removed
    await expect(trigger).not.toBeAttached();

    // No errors should occur
    expect(errors).toHaveLength(0);
  });
});

test.describe('Dismiss Duration', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/test/dismissible-duration.html');
    await page.evaluate(() => localStorage.removeItem('bugdrop_dismissed'));
  });

  test('button reappears when dismiss duration has passed', async ({ page }) => {
    await page.goto('/test/dismissible-duration.html');

    // Set an old timestamp (8 days ago, duration is 7 days)
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    await page.evaluate((ts) => localStorage.setItem('bugdrop_dismissed', ts.toString()), eightDaysAgo);

    // Reload the page
    await page.reload();
    await page.waitForTimeout(500);

    // Button should be visible again (8 days > 7 day duration)
    const trigger = page.locator('#bugdrop-host').locator('css=.bd-trigger');
    await expect(trigger).toBeVisible({ timeout: 5000 });
  });

  test('button stays hidden when dismiss duration has not passed', async ({ page }) => {
    await page.goto('/test/dismissible-duration.html');

    // Set a recent timestamp (3 days ago, duration is 7 days)
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
    await page.evaluate((ts) => localStorage.setItem('bugdrop_dismissed', ts.toString()), threeDaysAgo);

    // Reload the page
    await page.reload();
    await page.waitForTimeout(500);

    // Button should still be hidden (3 days < 7 day duration)
    const trigger = page.locator('#bugdrop-host').locator('css=.bd-trigger');
    await expect(trigger).not.toBeAttached();
  });

  test('button hidden immediately after dismissing', async ({ page }) => {
    await page.goto('/test/dismissible-duration.html');
    await page.evaluate(() => localStorage.removeItem('bugdrop_dismissed'));
    await page.reload();

    const trigger = page.locator('#bugdrop-host').locator('css=.bd-trigger');
    await expect(trigger).toBeVisible({ timeout: 5000 });

    // Dismiss the button
    await trigger.hover();
    await page.waitForTimeout(200);
    const closeBtn = page.locator('#bugdrop-host').locator('css=.bd-trigger-close');
    await closeBtn.click();

    // Button should be hidden
    await expect(trigger).not.toBeAttached();

    // Reload and verify still hidden
    await page.reload();
    await page.waitForTimeout(500);
    const triggerAfterReload = page.locator('#bugdrop-host').locator('css=.bd-trigger');
    await expect(triggerAfterReload).not.toBeAttached();
  });

  test('dismiss duration is ignored when button is not dismissible', async ({ page }) => {
    // Use regular test page (no dismissible flag)
    await page.goto('/test/');

    // Set an old timestamp
    const oldTimestamp = Date.now() - 100 * 24 * 60 * 60 * 1000;
    await page.evaluate((ts) => localStorage.setItem('bugdrop_dismissed', ts.toString()), oldTimestamp);
    await page.reload();
    await page.waitForTimeout(500);

    // Button should be visible because dismissible is not enabled
    const trigger = page.locator('#bugdrop-host').locator('css=.bd-trigger');
    await expect(trigger).toBeVisible({ timeout: 5000 });
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

test.describe('JavaScript API', () => {
  test('window.BugDrop exists after widget loads', async ({ page }) => {
    await page.goto('/test/');
    await page.waitForTimeout(500);

    const hasBugDrop = await page.evaluate(() => {
      return typeof window.BugDrop === 'object' && window.BugDrop !== null;
    });
    expect(hasBugDrop).toBeTruthy();
  });

  test('BugDrop API has all expected methods', async ({ page }) => {
    await page.goto('/test/');
    await page.waitForTimeout(500);

    const apiMethods = await page.evaluate(() => {
      if (!window.BugDrop) return [];
      return Object.keys(window.BugDrop);
    });

    expect(apiMethods).toContain('open');
    expect(apiMethods).toContain('close');
    expect(apiMethods).toContain('hide');
    expect(apiMethods).toContain('show');
    expect(apiMethods).toContain('isOpen');
    expect(apiMethods).toContain('isButtonVisible');
  });

  test('bugdrop:ready event fires after initialization', async ({ page }) => {
    // Use the api-only test page which sets up a listener for the event
    await page.goto('/test/api-only.html');

    // Wait for the status to update (indicating bugdrop:ready was received)
    await page.waitForFunction(() => {
      const status = document.getElementById('status');
      return status?.textContent?.includes('BugDrop ready');
    }, { timeout: 5000 });

    // Verify the event was received
    const statusText = await page.locator('#status').textContent();
    expect(statusText).toContain('BugDrop ready');
  });

  test('BugDrop.open() opens the modal', async ({ page }) => {
    await page.goto('/test/');
    await page.waitForTimeout(500);

    // Modal should not be visible initially
    const modalBefore = page.locator('#bugdrop-host').locator('css=.bd-modal');
    await expect(modalBefore).not.toBeVisible();

    // Call open API
    await page.evaluate(() => window.BugDrop?.open());
    await page.waitForTimeout(300);

    // Modal should now be visible
    const modalAfter = page.locator('#bugdrop-host').locator('css=.bd-modal');
    await expect(modalAfter).toBeVisible();
  });

  test('BugDrop.close() closes the modal', async ({ page }) => {
    await page.goto('/test/');
    await page.waitForTimeout(500);

    // Open modal first
    await page.evaluate(() => window.BugDrop?.open());
    await page.waitForTimeout(300);

    const modal = page.locator('#bugdrop-host').locator('css=.bd-modal');
    await expect(modal).toBeVisible();

    // Close via API
    await page.evaluate(() => window.BugDrop?.close());
    await page.waitForTimeout(300);

    // Modal should be gone
    await expect(modal).not.toBeVisible();
  });

  test('BugDrop.isOpen() returns correct state', async ({ page }) => {
    await page.goto('/test/');
    await page.waitForTimeout(500);

    // Should be false initially
    const isOpenBefore = await page.evaluate(() => window.BugDrop?.isOpen());
    expect(isOpenBefore).toBeFalsy();

    // Open modal
    await page.evaluate(() => window.BugDrop?.open());
    await page.waitForTimeout(300);

    // Should be true now
    const isOpenAfter = await page.evaluate(() => window.BugDrop?.isOpen());
    expect(isOpenAfter).toBeTruthy();

    // Close modal
    await page.evaluate(() => window.BugDrop?.close());
    await page.waitForTimeout(300);

    // Should be false again
    const isOpenFinal = await page.evaluate(() => window.BugDrop?.isOpen());
    expect(isOpenFinal).toBeFalsy();
  });

  test('BugDrop.hide() hides the floating button', async ({ page }) => {
    await page.goto('/test/');
    await page.waitForTimeout(500);

    const trigger = page.locator('#bugdrop-host').locator('css=.bd-trigger');
    await expect(trigger).toBeVisible();

    // Hide button
    await page.evaluate(() => window.BugDrop?.hide());

    // Button should be hidden
    await expect(trigger).not.toBeVisible();
  });

  test('BugDrop.show() shows the hidden button', async ({ page }) => {
    await page.goto('/test/');
    await page.waitForTimeout(500);

    const trigger = page.locator('#bugdrop-host').locator('css=.bd-trigger');

    // Hide then show
    await page.evaluate(() => window.BugDrop?.hide());
    await expect(trigger).not.toBeVisible();

    await page.evaluate(() => window.BugDrop?.show());
    await expect(trigger).toBeVisible();
  });

  test('BugDrop.isButtonVisible() returns correct state', async ({ page }) => {
    await page.goto('/test/');
    await page.waitForTimeout(500);

    // Should be true initially
    const isVisibleBefore = await page.evaluate(() => window.BugDrop?.isButtonVisible());
    expect(isVisibleBefore).toBeTruthy();

    // Hide button
    await page.evaluate(() => window.BugDrop?.hide());

    // Should be false now
    const isVisibleAfter = await page.evaluate(() => window.BugDrop?.isButtonVisible());
    expect(isVisibleAfter).toBeFalsy();

    // Show button
    await page.evaluate(() => window.BugDrop?.show());

    // Should be true again
    const isVisibleFinal = await page.evaluate(() => window.BugDrop?.isButtonVisible());
    expect(isVisibleFinal).toBeTruthy();
  });
});

test.describe('API-Only Mode (data-button="false")', () => {
  test('floating button is not rendered when data-button="false"', async ({ page }) => {
    await page.goto('/test/api-only.html');
    await page.waitForTimeout(500);

    // Button should not exist
    const trigger = page.locator('#bugdrop-host').locator('css=.bd-trigger');
    await expect(trigger).not.toBeAttached();
  });

  test('BugDrop API is still available in API-only mode', async ({ page }) => {
    await page.goto('/test/api-only.html');
    await page.waitForTimeout(500);

    const hasBugDrop = await page.evaluate(() => {
      return typeof window.BugDrop === 'object' && window.BugDrop !== null;
    });
    expect(hasBugDrop).toBeTruthy();
  });

  test('BugDrop.open() works in API-only mode', async ({ page }) => {
    await page.goto('/test/api-only.html');
    await page.waitForTimeout(500);

    // Open modal via API
    await page.evaluate(() => window.BugDrop?.open());
    await page.waitForTimeout(300);

    // Modal should be visible
    const modal = page.locator('#bugdrop-host').locator('css=.bd-modal');
    await expect(modal).toBeVisible();
  });

  test('BugDrop.isButtonVisible() returns false in API-only mode', async ({ page }) => {
    await page.goto('/test/api-only.html');
    await page.waitForTimeout(500);

    const isVisible = await page.evaluate(() => window.BugDrop?.isButtonVisible());
    expect(isVisible).toBeFalsy();
  });

  test('custom button can trigger BugDrop.open()', async ({ page }) => {
    await page.goto('/test/api-only.html');

    // Wait for BugDrop to be ready
    await page.waitForFunction(() => {
      const status = document.getElementById('status');
      return status?.textContent?.includes('BugDrop ready');
    }, { timeout: 5000 });

    // Click the "Report Bug" link in the nav
    await page.click('#nav-report-bug');
    await page.waitForTimeout(500);

    // Modal should open
    const modal = page.locator('#bugdrop-host').locator('css=.bd-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });
  });

  test('BugDrop.show() does nothing in API-only mode (no button to show)', async ({ page }) => {
    await page.goto('/test/api-only.html');
    await page.waitForTimeout(500);

    // Try to show button (should do nothing, no errors)
    await page.evaluate(() => window.BugDrop?.show());

    // Button should still not exist
    const trigger = page.locator('#bugdrop-host').locator('css=.bd-trigger');
    await expect(trigger).not.toBeAttached();
  });
});
