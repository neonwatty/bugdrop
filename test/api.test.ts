import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { Env, FeedbackPayload } from '../src/types';

// Mock GitHub API functions
const mockGetInstallationToken = vi.fn();
const mockCreateIssue = vi.fn();
const mockPrepareScreenshotForEmbed = vi.fn();

vi.mock('../src/lib/github', () => ({
  getInstallationToken: (...args: unknown[]) => mockGetInstallationToken(...args),
  createIssue: (...args: unknown[]) => mockCreateIssue(...args),
  prepareScreenshotForEmbed: (...args: unknown[]) => mockPrepareScreenshotForEmbed(...args),
}));

// Import API routes after mocking
const createApiRoutes = async () => {
  const { default: api } = await import('../src/routes/api');
  return api;
};

describe('API Routes', () => {
  let app: Hono;
  const mockEnv: Env = {
    GITHUB_APP_ID: 'test-app-id',
    GITHUB_PRIVATE_KEY: 'test-private-key',
    ENVIRONMENT: 'test',
    ASSETS: {} as Fetcher,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await createApiRoutes();
  });

  describe('GET /health', () => {
    it('should return status ok', async () => {
      const req = new Request('http://localhost/health');
      const res = await app.fetch(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toMatchObject({
        status: 'ok',
        environment: 'test',
      });
      expect(data.timestamp).toBeDefined();
    });

    it('should include CORS headers', async () => {
      const req = new Request('http://localhost/health');
      const res = await app.fetch(req, mockEnv);

      expect(res.headers.get('access-control-allow-origin')).toBe('*');
    });

    it('should return timestamp in ISO format', async () => {
      const req = new Request('http://localhost/health');
      const res = await app.fetch(req, mockEnv);
      const data = await res.json();

      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('GET /check/:owner/:repo', () => {
    it('should return installed: true when app is installed', async () => {
      mockGetInstallationToken.mockResolvedValue('test-token');

      const req = new Request('http://localhost/check/testowner/testrepo');
      const res = await app.fetch(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual({
        installed: true,
        repo: 'testowner/testrepo',
      });
      expect(mockGetInstallationToken).toHaveBeenCalledWith(
        mockEnv,
        'testowner',
        'testrepo'
      );
    });

    it('should return installed: false when app is not installed', async () => {
      mockGetInstallationToken.mockResolvedValue(null);

      const req = new Request('http://localhost/check/testowner/testrepo');
      const res = await app.fetch(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual({
        installed: false,
        repo: 'testowner/testrepo',
      });
    });

    it('should include CORS headers', async () => {
      mockGetInstallationToken.mockResolvedValue('test-token');

      const req = new Request('http://localhost/check/testowner/testrepo');
      const res = await app.fetch(req, mockEnv);

      expect(res.headers.get('access-control-allow-origin')).toBe('*');
    });

    it('should handle special characters in repo names', async () => {
      mockGetInstallationToken.mockResolvedValue('test-token');

      const req = new Request('http://localhost/check/test-owner/test.repo-name');
      const res = await app.fetch(req, mockEnv);
      const data = await res.json();

      expect(data.repo).toBe('test-owner/test.repo-name');
    });
  });

  describe('POST /feedback', () => {
    const validPayload: FeedbackPayload = {
      repo: 'testowner/testrepo',
      title: 'Test feedback',
      description: 'This is a test feedback',
      metadata: {
        url: 'http://localhost:3000',
        userAgent: 'Mozilla/5.0',
        viewport: { width: 1920, height: 1080 },
        timestamp: '2025-01-15T12:00:00Z',
      },
    };

    it('should create issue with valid payload', async () => {
      mockGetInstallationToken.mockResolvedValue('test-token');
      mockCreateIssue.mockResolvedValue({
        number: 42,
        html_url: 'https://github.com/testowner/testrepo/issues/42',
      });

      const req = new Request('http://localhost/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload),
      });
      const res = await app.fetch(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual({
        success: true,
        issueNumber: 42,
        issueUrl: 'https://github.com/testowner/testrepo/issues/42',
      });
      expect(mockCreateIssue).toHaveBeenCalledWith(
        'test-token',
        'testowner',
        'testrepo',
        'Test feedback',
        expect.stringContaining('This is a test feedback'),
        ['feedback', 'widget']
      );
    });

    it('should return 400 when repo is missing', async () => {
      const invalidPayload = { ...validPayload, repo: undefined };

      const req = new Request('http://localhost/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload),
      });
      const res = await app.fetch(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 when title is missing', async () => {
      const invalidPayload = { ...validPayload, title: undefined };

      const req = new Request('http://localhost/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload),
      });
      const res = await app.fetch(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 when description is missing', async () => {
      const invalidPayload = { ...validPayload, description: undefined };

      const req = new Request('http://localhost/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload),
      });
      const res = await app.fetch(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 when repo format is invalid', async () => {
      const invalidPayload = { ...validPayload, repo: 'invalidformat' };

      const req = new Request('http://localhost/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload),
      });
      const res = await app.fetch(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid repo format');
    });

    it('should return 400 when JSON is invalid', async () => {
      const req = new Request('http://localhost/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{',
      });
      const res = await app.fetch(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Invalid JSON');
    });

    it('should return 403 when app is not installed', async () => {
      mockGetInstallationToken.mockResolvedValue(null);

      const req = new Request('http://localhost/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload),
      });
      const res = await app.fetch(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain('not installed');
      expect(data.installUrl).toBeDefined();
    });

    it('should embed screenshot as base64 when provided', async () => {
      mockGetInstallationToken.mockResolvedValue('test-token');
      const screenshotDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      mockPrepareScreenshotForEmbed.mockReturnValue(screenshotDataUrl);
      mockCreateIssue.mockResolvedValue({
        number: 42,
        html_url: 'https://github.com/testowner/testrepo/issues/42',
      });

      const payloadWithScreenshot = {
        ...validPayload,
        screenshot: screenshotDataUrl,
      };

      const req = new Request('http://localhost/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadWithScreenshot),
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      expect(mockPrepareScreenshotForEmbed).toHaveBeenCalledWith(screenshotDataUrl);
      expect(mockCreateIssue).toHaveBeenCalledWith(
        'test-token',
        'testowner',
        'testrepo',
        'Test feedback',
        expect.stringContaining(screenshotDataUrl),
        ['feedback', 'widget']
      );
    });

    it('should prefer annotations over screenshot', async () => {
      mockGetInstallationToken.mockResolvedValue('test-token');
      const annotatedDataUrl = 'data:image/png;base64,annotated';
      mockPrepareScreenshotForEmbed.mockReturnValue(annotatedDataUrl);
      mockCreateIssue.mockResolvedValue({
        number: 42,
        html_url: 'https://github.com/testowner/testrepo/issues/42',
      });

      const payloadWithBoth = {
        ...validPayload,
        screenshot: 'data:image/png;base64,screenshot',
        annotations: annotatedDataUrl,
      };

      const req = new Request('http://localhost/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadWithBoth),
      });
      await app.fetch(req, mockEnv);

      expect(mockPrepareScreenshotForEmbed).toHaveBeenCalledWith(annotatedDataUrl);
    });

    it('should include CORS headers', async () => {
      mockGetInstallationToken.mockResolvedValue('test-token');
      mockCreateIssue.mockResolvedValue({
        number: 42,
        html_url: 'https://github.com/testowner/testrepo/issues/42',
      });

      const req = new Request('http://localhost/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload),
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.headers.get('access-control-allow-origin')).toBe('*');
    });

    it('should return 500 when GitHub API fails', async () => {
      mockGetInstallationToken.mockResolvedValue('test-token');
      mockCreateIssue.mockRejectedValue(new Error('GitHub API error'));

      const req = new Request('http://localhost/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload),
      });
      const res = await app.fetch(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toContain('GitHub API error');
    });

    it('should format issue body with metadata', async () => {
      mockGetInstallationToken.mockResolvedValue('test-token');
      mockCreateIssue.mockResolvedValue({
        number: 42,
        html_url: 'https://github.com/testowner/testrepo/issues/42',
      });

      const payloadWithSelector = {
        ...validPayload,
        metadata: {
          ...validPayload.metadata,
          elementSelector: '#submit-button',
        },
      };

      const req = new Request('http://localhost/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadWithSelector),
      });
      await app.fetch(req, mockEnv);

      const issueBody = mockCreateIssue.mock.calls[0][4];
      expect(issueBody).toContain('## Description');
      expect(issueBody).toContain('This is a test feedback');
      expect(issueBody).toContain('Technical Details');
      expect(issueBody).toContain('http://localhost:3000');
      expect(issueBody).toContain('1920 x 1080');
      expect(issueBody).toContain('#submit-button');
      expect(issueBody).toContain('Submitted via Feedback Widget');
    });
  });

  describe('OPTIONS preflight requests', () => {
    it('should handle CORS preflight for /health', async () => {
      const req = new Request('http://localhost/health', {
        method: 'OPTIONS',
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(204);
      expect(res.headers.get('access-control-allow-origin')).toBe('*');
      expect(res.headers.get('access-control-allow-methods')).toContain('GET');
    });

    it('should handle CORS preflight for /feedback', async () => {
      const req = new Request('http://localhost/feedback', {
        method: 'OPTIONS',
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(204);
      expect(res.headers.get('access-control-allow-origin')).toBe('*');
      expect(res.headers.get('access-control-allow-methods')).toContain('POST');
    });
  });
});
