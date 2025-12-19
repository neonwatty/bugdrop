import { test, expect } from '@playwright/test';

/**
 * E2E tests for the Feedback Widget API
 * These tests run against a live wrangler dev server
 *
 * Prerequisites:
 * - wrangler dev server running at http://localhost:8787
 * - GitHub App credentials configured in .dev.vars
 */

test.describe('API Health and Installation Check', () => {
  test('GET /api/health returns correct structure', async ({ request }) => {
    const response = await request.get('/api/health');

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('status', 'ok');
    expect(data).toHaveProperty('environment');
    expect(data).toHaveProperty('timestamp');

    // Validate timestamp is a valid ISO string
    expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);
  });

  test('GET /api/health includes CORS headers', async ({ request }) => {
    const response = await request.get('/api/health');

    expect(response.headers()['access-control-allow-origin']).toBe('*');
    expect(response.headers()['access-control-allow-methods']).toBeTruthy();
  });

  test('GET /api/check/:owner/:repo returns installation status', async ({ request }) => {
    const response = await request.get('/api/check/octocat/Hello-World');

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('installed');
    expect(data).toHaveProperty('repo', 'octocat/Hello-World');
    expect(typeof data.installed).toBe('boolean');
  });

  test('GET /api/check/:owner/:repo includes CORS headers', async ({ request }) => {
    const response = await request.get('/api/check/octocat/Hello-World');

    expect(response.headers()['access-control-allow-origin']).toBe('*');
  });

  test('GET /api/check handles special characters in repo names', async ({ request }) => {
    const response = await request.get('/api/check/test-owner/test.repo-name');

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.repo).toBe('test-owner/test.repo-name');
  });
});

test.describe('API Feedback Submission - Validation', () => {
  test('POST /api/feedback returns 400 when repo is missing', async ({ request }) => {
    const payload = {
      title: 'Test feedback',
      description: 'Test description',
      metadata: {
        url: 'http://localhost:3000',
        userAgent: 'Playwright/1.0',
        viewport: { width: 1920, height: 1080 },
        timestamp: new Date().toISOString(),
      },
    };

    const response = await request.post('/api/feedback', {
      data: payload,
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Missing required fields');
  });

  test('POST /api/feedback returns 400 when title is missing', async ({ request }) => {
    const payload = {
      repo: 'testowner/testrepo',
      description: 'Test description',
      metadata: {
        url: 'http://localhost:3000',
        userAgent: 'Playwright/1.0',
        viewport: { width: 1920, height: 1080 },
        timestamp: new Date().toISOString(),
      },
    };

    const response = await request.post('/api/feedback', {
      data: payload,
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Missing required fields');
  });

  test('POST /api/feedback returns 400 when description is missing', async ({ request }) => {
    const payload = {
      repo: 'testowner/testrepo',
      title: 'Test feedback',
      metadata: {
        url: 'http://localhost:3000',
        userAgent: 'Playwright/1.0',
        viewport: { width: 1920, height: 1080 },
        timestamp: new Date().toISOString(),
      },
    };

    const response = await request.post('/api/feedback', {
      data: payload,
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Missing required fields');
  });

  test('POST /api/feedback returns 400 when repo format is invalid', async ({ request }) => {
    const payload = {
      repo: 'invalidformat',
      title: 'Test feedback',
      description: 'Test description',
      metadata: {
        url: 'http://localhost:3000',
        userAgent: 'Playwright/1.0',
        viewport: { width: 1920, height: 1080 },
        timestamp: new Date().toISOString(),
      },
    };

    const response = await request.post('/api/feedback', {
      data: payload,
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Invalid repo format');
  });

  test('POST /api/feedback returns 400 when JSON is invalid', async ({ request }) => {
    const response = await request.post('/api/feedback', {
      headers: {
        'Content-Type': 'application/json',
      },
      data: 'invalid json{',
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid JSON');
  });

  test('POST /api/feedback includes CORS headers in error responses', async ({ request }) => {
    const response = await request.post('/api/feedback', {
      data: {},
    });

    expect(response.headers()['access-control-allow-origin']).toBe('*');
  });
});

test.describe('API Feedback Submission - Valid Payloads', () => {
  test('POST /api/feedback accepts valid payload without screenshot', async ({ request }) => {
    const payload = {
      repo: 'testowner/testrepo',
      title: 'E2E Test Feedback',
      description: 'This is a test feedback submission from E2E tests',
      metadata: {
        url: 'http://localhost:3000/test-page',
        userAgent: 'Playwright/1.0 E2E Tests',
        viewport: { width: 1920, height: 1080 },
        timestamp: new Date().toISOString(),
      },
    };

    const response = await request.post('/api/feedback', {
      data: payload,
    });

    // This will be 403 if app is not installed, or 200 if it succeeds
    expect([200, 403]).toContain(response.status());

    const data = await response.json();

    if (response.status() === 200) {
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('issueNumber');
      expect(data).toHaveProperty('issueUrl');
      expect(typeof data.issueNumber).toBe('number');
      expect(data.issueUrl).toMatch(/^https:\/\/github\.com\/.+\/issues\/\d+$/);
    } else {
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('not installed');
      expect(data).toHaveProperty('installUrl');
    }
  });

  test('POST /api/feedback accepts payload with screenshot', async ({ request }) => {
    // Small 1x1 pixel PNG (base64 encoded)
    const screenshot = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const payload = {
      repo: 'testowner/testrepo',
      title: 'E2E Test with Screenshot',
      description: 'This feedback includes a screenshot',
      screenshot,
      metadata: {
        url: 'http://localhost:3000/test-page',
        userAgent: 'Playwright/1.0 E2E Tests',
        viewport: { width: 1920, height: 1080 },
        timestamp: new Date().toISOString(),
      },
    };

    const response = await request.post('/api/feedback', {
      data: payload,
    });

    expect([200, 403]).toContain(response.status());
    const data = await response.json();

    if (response.status() === 200) {
      expect(data.success).toBe(true);
    } else {
      expect(data.error).toContain('not installed');
    }
  });

  test('POST /api/feedback accepts payload with annotations', async ({ request }) => {
    const annotations = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HgAGgwJ/lK3Q6wAAAABJRU5ErkJggg==';

    const payload = {
      repo: 'testowner/testrepo',
      title: 'E2E Test with Annotations',
      description: 'This feedback includes annotations',
      annotations,
      metadata: {
        url: 'http://localhost:3000/test-page',
        userAgent: 'Playwright/1.0 E2E Tests',
        viewport: { width: 1920, height: 1080 },
        timestamp: new Date().toISOString(),
      },
    };

    const response = await request.post('/api/feedback', {
      data: payload,
    });

    expect([200, 403]).toContain(response.status());
  });

  test('POST /api/feedback accepts payload with element selector', async ({ request }) => {
    const payload = {
      repo: 'testowner/testrepo',
      title: 'E2E Test with Element Selector',
      description: 'This feedback targets a specific element',
      metadata: {
        url: 'http://localhost:3000/test-page',
        userAgent: 'Playwright/1.0 E2E Tests',
        viewport: { width: 1920, height: 1080 },
        timestamp: new Date().toISOString(),
        elementSelector: '#submit-button',
      },
    };

    const response = await request.post('/api/feedback', {
      data: payload,
    });

    expect([200, 403]).toContain(response.status());
  });

  test('POST /api/feedback includes CORS headers in success responses', async ({ request }) => {
    const payload = {
      repo: 'testowner/testrepo',
      title: 'CORS Test',
      description: 'Testing CORS headers',
      metadata: {
        url: 'http://localhost:3000',
        userAgent: 'Playwright/1.0',
        viewport: { width: 1920, height: 1080 },
        timestamp: new Date().toISOString(),
      },
    };

    const response = await request.post('/api/feedback', {
      data: payload,
    });

    expect(response.headers()['access-control-allow-origin']).toBe('*');
  });
});

test.describe('CORS Preflight Requests', () => {
  test('OPTIONS /api/health returns correct CORS headers', async ({ request }) => {
    const response = await request.fetch('/api/health', {
      method: 'OPTIONS',
    });

    expect(response.status()).toBe(204);
    expect(response.headers()['access-control-allow-origin']).toBe('*');
    expect(response.headers()['access-control-allow-methods']).toContain('GET');
    expect(response.headers()['access-control-allow-headers']).toContain('Content-Type');
  });

  test('OPTIONS /api/feedback returns correct CORS headers', async ({ request }) => {
    const response = await request.fetch('/api/feedback', {
      method: 'OPTIONS',
    });

    expect(response.status()).toBe(204);
    expect(response.headers()['access-control-allow-origin']).toBe('*');
    expect(response.headers()['access-control-allow-methods']).toContain('POST');
    expect(response.headers()['access-control-allow-headers']).toContain('Content-Type');
  });

  test('OPTIONS /api/check/:owner/:repo returns correct CORS headers', async ({ request }) => {
    const response = await request.fetch('/api/check/octocat/Hello-World', {
      method: 'OPTIONS',
    });

    expect(response.status()).toBe(204);
    expect(response.headers()['access-control-allow-origin']).toBe('*');
  });
});

test.describe('API Edge Cases', () => {
  test('GET /api/health responds quickly (performance check)', async ({ request }) => {
    const start = Date.now();
    const response = await request.get('/api/health');
    const duration = Date.now() - start;

    expect(response.status()).toBe(200);
    expect(duration).toBeLessThan(1000); // Should respond within 1 second
  });

  test('GET /api/check handles non-existent repos gracefully', async ({ request }) => {
    const response = await request.get('/api/check/nonexistent-owner-12345/nonexistent-repo-67890');

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.installed).toBe(false);
  });

  test('POST /api/feedback handles large descriptions', async ({ request }) => {
    const largeDescription = 'x'.repeat(10000); // 10KB description

    const payload = {
      repo: 'testowner/testrepo',
      title: 'Large Description Test',
      description: largeDescription,
      metadata: {
        url: 'http://localhost:3000',
        userAgent: 'Playwright/1.0',
        viewport: { width: 1920, height: 1080 },
        timestamp: new Date().toISOString(),
      },
    };

    const response = await request.post('/api/feedback', {
      data: payload,
    });

    // Should either succeed or fail gracefully (not timeout/crash)
    expect([200, 400, 403, 500]).toContain(response.status());
  });

  test('POST /api/feedback handles concurrent requests', async ({ request }) => {
    const payload = {
      repo: 'testowner/testrepo',
      title: 'Concurrent Test',
      description: 'Testing concurrent submissions',
      metadata: {
        url: 'http://localhost:3000',
        userAgent: 'Playwright/1.0',
        viewport: { width: 1920, height: 1080 },
        timestamp: new Date().toISOString(),
      },
    };

    // Send 5 concurrent requests
    const promises = Array.from({ length: 5 }, () =>
      request.post('/api/feedback', { data: payload })
    );

    const responses = await Promise.all(promises);

    // All requests should complete successfully (or fail consistently)
    responses.forEach(response => {
      expect([200, 403, 500]).toContain(response.status());
    });
  });
});
