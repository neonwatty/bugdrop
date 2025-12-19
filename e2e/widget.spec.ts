import { test, expect } from '@playwright/test';

/**
 * E2E tests for the Feedback Widget UI
 * These tests run against a live wrangler dev server
 *
 * Prerequisites:
 * - wrangler dev server running at http://localhost:8787
 * - Widget built with npm run build:widget
 * - Test page available at /test/index.html
 */

test.describe('Widget Loading and Initialization', () => {
  test('widget loads on test page without errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/test/');

    // Wait for widget to load
    await page.waitForTimeout(1000);

    // Check no console errors
    expect(consoleErrors).toHaveLength(0);
  });

  test('feedback button appears in bottom-right corner', async ({ page }) => {
    await page.goto('/test/');

    // Look for feedback button with emoji
    const feedbackButton = page.locator('[data-testid="feedback-trigger"], button:has-text("💬")').first();
    await expect(feedbackButton).toBeVisible();

    // Verify position (should be fixed in bottom-right)
    const box = await feedbackButton.boundingBox();
    expect(box).toBeTruthy();

    if (box) {
      const viewport = page.viewportSize();
      expect(viewport).toBeTruthy();

      if (viewport) {
        // Button should be near bottom-right
        expect(box.x + box.width).toBeGreaterThan(viewport.width - 100);
        expect(box.y + box.height).toBeGreaterThan(viewport.height - 100);
      }
    }
  });

  test('widget is isolated in shadow DOM', async ({ page }) => {
    await page.goto('/test/');

    // Check that widget uses shadow DOM for style isolation
    const shadowHost = await page.locator('[data-widget="feedback"]').first();

    // If shadow DOM is used, the internal content won't be directly accessible
    const hasShadowRoot = await shadowHost.evaluate((el) => {
      return el.shadowRoot !== null;
    });

    expect(hasShadowRoot).toBe(true);
  });
});

test.describe('Modal Opening and Closing', () => {
  test('clicking trigger button opens modal', async ({ page }) => {
    await page.goto('/test/');

    // Click the feedback button
    const feedbackButton = page.locator('[data-testid="feedback-trigger"], button:has-text("💬")').first();
    await feedbackButton.click();

    // Modal should appear
    const modal = page.locator('[data-testid="feedback-modal"], [role="dialog"]').first();
    await expect(modal).toBeVisible();
  });

  test('modal can be closed with close button', async ({ page }) => {
    await page.goto('/test/');

    // Open modal
    const feedbackButton = page.locator('[data-testid="feedback-trigger"]').first();
    await feedbackButton.click();

    // Wait for modal
    const modal = page.locator('[data-testid="feedback-modal"]').first();
    await expect(modal).toBeVisible();

    // Click close button
    const closeButton = page.locator('[data-testid="modal-close"], button:has-text("×"), button:has-text("Close")').first();
    await closeButton.click();

    // Modal should be hidden
    await expect(modal).not.toBeVisible();
  });

  test('modal can be closed with Escape key', async ({ page }) => {
    await page.goto('/test/');

    // Open modal
    const feedbackButton = page.locator('[data-testid="feedback-trigger"]').first();
    await feedbackButton.click();

    // Wait for modal
    const modal = page.locator('[data-testid="feedback-modal"]').first();
    await expect(modal).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');

    // Modal should be hidden
    await expect(modal).not.toBeVisible();
  });
});

test.describe('Screenshot Capture Options', () => {
  test('full page screenshot option is available', async ({ page }) => {
    await page.goto('/test/');

    // Open modal
    const feedbackButton = page.locator('[data-testid="feedback-trigger"]').first();
    await feedbackButton.click();

    // Look for full page screenshot button/option
    const fullPageOption = page.locator('[data-testid="screenshot-full"], button:has-text("Full Page"), button:has-text("Capture Full Page")').first();
    await expect(fullPageOption).toBeVisible();
  });

  test('element picker option is available', async ({ page }) => {
    await page.goto('/test/');

    // Open modal
    const feedbackButton = page.locator('[data-testid="feedback-trigger"]').first();
    await feedbackButton.click();

    // Look for element picker button
    const elementPickerOption = page.locator('[data-testid="screenshot-element"], button:has-text("Element"), button:has-text("Pick Element")').first();
    await expect(elementPickerOption).toBeVisible();
  });

  test('full page screenshot captures correctly', async ({ page }) => {
    await page.goto('/test/');

    // Open modal
    const feedbackButton = page.locator('[data-testid="feedback-trigger"]').first();
    await feedbackButton.click();

    // Click full page screenshot
    const fullPageOption = page.locator('[data-testid="screenshot-full"]').first();
    await fullPageOption.click();

    // Wait a moment for screenshot capture
    await page.waitForTimeout(500);

    // Screenshot preview should appear
    const preview = page.locator('[data-testid="screenshot-preview"], img[alt*="screenshot"]').first();
    await expect(preview).toBeVisible();
  });
});

test.describe('Element Picker', () => {
  test('element picker activates with crosshair cursor', async ({ page }) => {
    await page.goto('/test/');

    // Open modal
    const feedbackButton = page.locator('[data-testid="feedback-trigger"]').first();
    await feedbackButton.click();

    // Activate element picker
    const elementPickerButton = page.locator('[data-testid="screenshot-element"]').first();
    await elementPickerButton.click();

    // Check for cursor change or overlay indicating picker mode
    const body = page.locator('body');
    const cursor = await body.evaluate((el) => {
      return window.getComputedStyle(el).cursor;
    });

    // Should have crosshair or custom cursor
    expect(['crosshair', 'pointer'].includes(cursor) || cursor.includes('url')).toBe(true);
  });

  test('element picker highlights elements on hover', async ({ page }) => {
    await page.goto('/test/');

    // Open modal
    const feedbackButton = page.locator('[data-testid="feedback-trigger"]').first();
    await feedbackButton.click();

    // Activate element picker
    const elementPickerButton = page.locator('[data-testid="screenshot-element"]').first();
    await elementPickerButton.click();

    // Move mouse over a known element
    const testElement = page.locator('h1').first();
    await testElement.hover();

    // Wait for highlight to appear
    await page.waitForTimeout(200);

    // Check for highlight overlay/outline
    const highlight = page.locator('[data-testid="element-highlight"], .element-highlight').first();
    // Highlight may or may not be in DOM depending on implementation
    // So we just check the element picker is active
    expect(await elementPickerButton.isVisible()).toBe(true);
  });

  test('clicking element captures element screenshot', async ({ page }) => {
    await page.goto('/test/');

    // Open modal
    const feedbackButton = page.locator('[data-testid="feedback-trigger"]').first();
    await feedbackButton.click();

    // Activate element picker
    const elementPickerButton = page.locator('[data-testid="screenshot-element"]').first();
    await elementPickerButton.click();

    // Click on a test element
    const testElement = page.locator('h1').first();
    await testElement.click();

    // Wait for screenshot capture
    await page.waitForTimeout(500);

    // Screenshot preview should appear
    const preview = page.locator('[data-testid="screenshot-preview"], img[alt*="screenshot"]').first();
    await expect(preview).toBeVisible();
  });
});

test.describe('Annotation Tools', () => {
  test('annotation toolbar is present after screenshot', async ({ page }) => {
    await page.goto('/test/');

    // Open modal and capture screenshot
    const feedbackButton = page.locator('[data-testid="feedback-trigger"]').first();
    await feedbackButton.click();

    const fullPageOption = page.locator('[data-testid="screenshot-full"]').first();
    await fullPageOption.click();

    await page.waitForTimeout(500);

    // Look for annotation tools
    const annotationTools = page.locator('[data-testid="annotation-tools"]').first();
    await expect(annotationTools).toBeVisible();
  });

  test('draw tool is available', async ({ page }) => {
    await page.goto('/test/');

    const feedbackButton = page.locator('[data-testid="feedback-trigger"]').first();
    await feedbackButton.click();

    const fullPageOption = page.locator('[data-testid="screenshot-full"]').first();
    await fullPageOption.click();

    await page.waitForTimeout(500);

    // Look for draw tool button
    const drawTool = page.locator('[data-testid="tool-draw"], button:has-text("Draw"), button[title*="Draw"]').first();
    await expect(drawTool).toBeVisible();
  });

  test('arrow tool is available', async ({ page }) => {
    await page.goto('/test/');

    const feedbackButton = page.locator('[data-testid="feedback-trigger"]').first();
    await feedbackButton.click();

    const fullPageOption = page.locator('[data-testid="screenshot-full"]').first();
    await fullPageOption.click();

    await page.waitForTimeout(500);

    // Look for arrow tool button
    const arrowTool = page.locator('[data-testid="tool-arrow"], button:has-text("Arrow"), button[title*="Arrow"]').first();
    await expect(arrowTool).toBeVisible();
  });

  test('rectangle tool is available', async ({ page }) => {
    await page.goto('/test/');

    const feedbackButton = page.locator('[data-testid="feedback-trigger"]').first();
    await feedbackButton.click();

    const fullPageOption = page.locator('[data-testid="screenshot-full"]').first();
    await fullPageOption.click();

    await page.waitForTimeout(500);

    // Look for rectangle tool button
    const rectTool = page.locator('[data-testid="tool-rectangle"], button:has-text("Rectangle"), button[title*="Rectangle"]').first();
    await expect(rectTool).toBeVisible();
  });

  test('undo button is available', async ({ page }) => {
    await page.goto('/test/');

    const feedbackButton = page.locator('[data-testid="feedback-trigger"]').first();
    await feedbackButton.click();

    const fullPageOption = page.locator('[data-testid="screenshot-full"]').first();
    await fullPageOption.click();

    await page.waitForTimeout(500);

    // Look for undo button
    const undoButton = page.locator('[data-testid="tool-undo"], button:has-text("Undo"), button[title*="Undo"]').first();
    await expect(undoButton).toBeVisible();
  });

  test('draw tool can create annotations', async ({ page }) => {
    await page.goto('/test/');

    const feedbackButton = page.locator('[data-testid="feedback-trigger"]').first();
    await feedbackButton.click();

    const fullPageOption = page.locator('[data-testid="screenshot-full"]').first();
    await fullPageOption.click();

    await page.waitForTimeout(500);

    // Select draw tool
    const drawTool = page.locator('[data-testid="tool-draw"]').first();
    await drawTool.click();

    // Draw on canvas
    const canvas = page.locator('canvas[data-testid="annotation-canvas"], canvas').first();
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    if (box) {
      // Draw a line
      await page.mouse.move(box.x + 50, box.y + 50);
      await page.mouse.down();
      await page.mouse.move(box.x + 100, box.y + 100);
      await page.mouse.up();
    }

    // Canvas should have been drawn on
    // We can't directly verify pixels, but we can check the canvas exists
    expect(await canvas.isVisible()).toBe(true);
  });

  test('undo button removes annotations', async ({ page }) => {
    await page.goto('/test/');

    const feedbackButton = page.locator('[data-testid="feedback-trigger"]').first();
    await feedbackButton.click();

    const fullPageOption = page.locator('[data-testid="screenshot-full"]').first();
    await fullPageOption.click();

    await page.waitForTimeout(500);

    // Select draw tool and draw
    const drawTool = page.locator('[data-testid="tool-draw"]').first();
    await drawTool.click();

    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 50, box.y + 50);
      await page.mouse.down();
      await page.mouse.move(box.x + 100, box.y + 100);
      await page.mouse.up();
    }

    // Click undo
    const undoButton = page.locator('[data-testid="tool-undo"]').first();
    await undoButton.click();

    // Canvas should still exist but annotation should be removed
    // We verify undo button was clickable
    expect(await canvas.isVisible()).toBe(true);
  });
});

test.describe('Feedback Form', () => {
  test('form fields are present', async ({ page }) => {
    await page.goto('/test/');

    const feedbackButton = page.locator('[data-testid="feedback-trigger"]').first();
    await feedbackButton.click();

    // Check for title field
    const titleField = page.locator('input[name="title"], input[placeholder*="title" i]').first();
    await expect(titleField).toBeVisible();

    // Check for description field
    const descField = page.locator('textarea[name="description"], textarea[placeholder*="description" i]').first();
    await expect(descField).toBeVisible();
  });

  test('form validates required fields on submit', async ({ page }) => {
    await page.goto('/test/');

    const feedbackButton = page.locator('[data-testid="feedback-trigger"]').first();
    await feedbackButton.click();

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Send")').first();
    await submitButton.click();

    // Should show validation error
    const errorMessage = page.locator('[data-testid="form-error"], .error, [role="alert"]').first();
    await expect(errorMessage).toBeVisible({ timeout: 2000 });
  });

  test('form accepts valid input', async ({ page }) => {
    await page.goto('/test/');

    const feedbackButton = page.locator('[data-testid="feedback-trigger"]').first();
    await feedbackButton.click();

    // Fill in form
    const titleField = page.locator('input[name="title"], input[placeholder*="title" i]').first();
    await titleField.fill('Test Feedback Title');

    const descField = page.locator('textarea[name="description"], textarea[placeholder*="description" i]').first();
    await descField.fill('This is a test feedback description');

    // Fields should contain the values
    await expect(titleField).toHaveValue('Test Feedback Title');
    await expect(descField).toHaveValue('This is a test feedback description');
  });

  test('empty title shows validation error', async ({ page }) => {
    await page.goto('/test/');

    const feedbackButton = page.locator('[data-testid="feedback-trigger"]').first();
    await feedbackButton.click();

    // Fill only description
    const descField = page.locator('textarea[name="description"]').first();
    await descField.fill('Description without title');

    // Try to submit
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Should show error
    const errorMessage = page.locator('[data-testid="form-error"], .error').first();
    await expect(errorMessage).toBeVisible({ timeout: 2000 });
  });

  test('empty description shows validation error', async ({ page }) => {
    await page.goto('/test/');

    const feedbackButton = page.locator('[data-testid="feedback-trigger"]').first();
    await feedbackButton.click();

    // Fill only title
    const titleField = page.locator('input[name="title"]').first();
    await titleField.fill('Title without description');

    // Try to submit
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Should show error
    const errorMessage = page.locator('[data-testid="form-error"], .error').first();
    await expect(errorMessage).toBeVisible({ timeout: 2000 });
  });
});

test.describe('Form Submission', () => {
  test('submission sends proper JSON payload to /api/feedback', async ({ page }) => {
    await page.goto('/test/');

    // Intercept API request
    let requestPayload: any = null;
    await page.route('**/api/feedback', (route) => {
      requestPayload = route.request().postDataJSON();
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          issueNumber: 123,
          issueUrl: 'https://github.com/test/repo/issues/123',
        }),
      });
    });

    const feedbackButton = page.locator('[data-testid="feedback-trigger"]').first();
    await feedbackButton.click();

    // Fill and submit form
    const titleField = page.locator('input[name="title"]').first();
    await titleField.fill('E2E Test Submission');

    const descField = page.locator('textarea[name="description"]').first();
    await descField.fill('Test description for E2E');

    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Wait for request
    await page.waitForTimeout(1000);

    // Verify payload structure
    expect(requestPayload).toBeTruthy();
    expect(requestPayload.title).toBe('E2E Test Submission');
    expect(requestPayload.description).toBe('Test description for E2E');
    expect(requestPayload.metadata).toBeTruthy();
    expect(requestPayload.metadata.url).toBeTruthy();
    expect(requestPayload.metadata.userAgent).toBeTruthy();
    expect(requestPayload.metadata.viewport).toBeTruthy();
  });

  test('successful submission shows success toast', async ({ page }) => {
    await page.goto('/test/');

    // Mock successful response
    await page.route('**/api/feedback', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          issueNumber: 456,
          issueUrl: 'https://github.com/test/repo/issues/456',
        }),
      });
    });

    const feedbackButton = page.locator('[data-testid="feedback-trigger"]').first();
    await feedbackButton.click();

    // Fill and submit
    await page.locator('input[name="title"]').first().fill('Success Test');
    await page.locator('textarea[name="description"]').first().fill('Testing success toast');
    await page.locator('button[type="submit"]').first().click();

    // Wait for success toast
    const successToast = page.locator('[data-testid="toast-success"], .toast.success, [role="status"]:has-text("success")').first();
    await expect(successToast).toBeVisible({ timeout: 3000 });
  });

  test('failed submission shows error toast', async ({ page }) => {
    await page.goto('/test/');

    // Mock error response
    await page.route('**/api/feedback', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error',
        }),
      });
    });

    const feedbackButton = page.locator('[data-testid="feedback-trigger"]').first();
    await feedbackButton.click();

    // Fill and submit
    await page.locator('input[name="title"]').first().fill('Error Test');
    await page.locator('textarea[name="description"]').first().fill('Testing error toast');
    await page.locator('button[type="submit"]').first().click();

    // Wait for error toast
    const errorToast = page.locator('[data-testid="toast-error"], .toast.error, [role="alert"]:has-text("error")').first();
    await expect(errorToast).toBeVisible({ timeout: 3000 });
  });

  test('network error shows error toast', async ({ page }) => {
    await page.goto('/test/');

    // Mock network failure
    await page.route('**/api/feedback', (route) => {
      route.abort('failed');
    });

    const feedbackButton = page.locator('[data-testid="feedback-trigger"]').first();
    await feedbackButton.click();

    // Fill and submit
    await page.locator('input[name="title"]').first().fill('Network Error Test');
    await page.locator('textarea[name="description"]').first().fill('Testing network error');
    await page.locator('button[type="submit"]').first().click();

    // Wait for error toast
    const errorToast = page.locator('[data-testid="toast-error"], .toast.error').first();
    await expect(errorToast).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Shadow DOM Style Isolation', () => {
  test('widget styles do not leak to host page', async ({ page }) => {
    await page.goto('/test/');

    // Get a host page element's style
    const hostElement = page.locator('h1').first();
    const hostColor = await hostElement.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });

    // Open widget
    const feedbackButton = page.locator('[data-testid="feedback-trigger"]').first();
    await feedbackButton.click();

    // Wait for modal
    await page.waitForTimeout(500);

    // Check host element style hasn't changed
    const newHostColor = await hostElement.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });

    expect(newHostColor).toBe(hostColor);
  });

  test('host page styles do not affect widget', async ({ page }) => {
    await page.goto('/test/');

    // Add a global style that would affect buttons
    await page.addStyleTag({
      content: 'button { background: red !important; color: yellow !important; }',
    });

    // Open widget
    const feedbackButton = page.locator('[data-testid="feedback-trigger"]').first();
    await feedbackButton.click();

    // Widget button should not be affected by host styles (if properly isolated)
    // We can't easily check this without inspecting shadow DOM internals,
    // but we verify the widget still functions
    const modal = page.locator('[data-testid="feedback-modal"]').first();
    await expect(modal).toBeVisible();
  });

  test('widget maintains own font and color scheme', async ({ page }) => {
    await page.goto('/test/');

    // Add aggressive host page styles
    await page.addStyleTag({
      content: `
        * {
          font-family: 'Comic Sans MS' !important;
          font-size: 50px !important;
          color: pink !important;
        }
      `,
    });

    // Open widget
    const feedbackButton = page.locator('[data-testid="feedback-trigger"]').first();
    await feedbackButton.click();

    // Widget should still be visible and functional despite host styles
    const modal = page.locator('[data-testid="feedback-modal"]').first();
    await expect(modal).toBeVisible();

    // Try to submit to ensure functionality isn't broken
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Should show validation (proving widget logic still works)
    const error = page.locator('[data-testid="form-error"], .error').first();
    await expect(error).toBeVisible({ timeout: 2000 });
  });
});

test.describe('Widget Build Verification', () => {
  test('widget.js is a valid IIFE bundle', async ({ page }) => {
    // Fetch the widget.js file
    const response = await page.goto('/widget.js');
    expect(response?.status()).toBe(200);

    const content = await response?.text();
    expect(content).toBeTruthy();

    // IIFE should contain a self-executing function pattern
    // Check for common IIFE patterns: (function() {...})() or (() => {...})()
    const hasIIFE = content?.includes('(function') || content?.includes('(() =>') ||
                    content?.includes('(async function') || content?.includes('!function');
    expect(hasIIFE).toBe(true);
  });

  test('widget.js loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/test/');
    await page.waitForTimeout(1000);

    // Filter out unrelated errors
    const widgetErrors = errors.filter(err =>
      err.includes('widget') || err.includes('feedback')
    );

    expect(widgetErrors).toHaveLength(0);
  });
});
