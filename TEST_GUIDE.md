# Testing Guide

This document describes the test suite for the Feedback Widget API.

## Test Structure

The project includes two types of tests:

### Unit Tests (`test/api.test.ts`)
Unit tests run in isolation using Vitest with mocked GitHub API dependencies. These tests verify:
- API route handlers logic
- Request validation
- Response formatting
- Error handling
- CORS headers

**Run unit tests:**
```bash
npm test              # Run once
npm run test:watch    # Watch mode
```

### E2E Tests (`e2e/api.spec.ts`)
End-to-end tests run against a live wrangler dev server using Playwright. These tests verify:
- Real HTTP requests/responses
- Integration with GitHub API (if configured)
- CORS behavior in real browser environment
- Performance characteristics
- Edge cases with actual network conditions

**Run E2E tests:**
```bash
npm run test:e2e      # Run E2E tests
npm run test:e2e:ui   # Run with Playwright UI
```

## Test Coverage

### Health Endpoint (`GET /api/health`)
- Returns status "ok"
- Returns environment name
- Returns ISO timestamp
- Includes CORS headers
- Responds quickly (performance check)

### Installation Check (`GET /api/check/:owner/:repo`)
- Returns `installed: true` when GitHub App is installed
- Returns `installed: false` when not installed
- Returns correct repo format
- Handles special characters in repo names
- Includes CORS headers
- Handles non-existent repos gracefully

### Feedback Submission (`POST /api/feedback`)

**Validation Tests:**
- Returns 400 when `repo` is missing
- Returns 400 when `title` is missing
- Returns 400 when `description` is missing
- Returns 400 when repo format is invalid (must be "owner/repo")
- Returns 400 when JSON is malformed
- Returns 403 when GitHub App is not installed

**Success Tests:**
- Creates issue with valid payload
- Uploads screenshot when provided
- Uploads annotations when provided
- Prefers annotations over screenshot
- Includes element selector in issue body
- Formats issue body with markdown
- Includes metadata in issue
- Returns issue number and URL

**CORS Tests:**
- Includes CORS headers in all responses
- Handles OPTIONS preflight requests
- Allows POST, GET methods
- Allows Content-Type header

**Edge Cases:**
- Handles large descriptions (10KB+)
- Handles concurrent requests
- Returns 500 on GitHub API errors

## Prerequisites

### For Unit Tests
Unit tests use mocks, so no external dependencies are required.

### For E2E Tests
E2E tests require:

1. **Wrangler dev server running** at `http://localhost:8787`
2. **GitHub App credentials** (optional, but some tests will fail without them)

If GitHub App is not configured, E2E tests will verify that the API returns proper error responses (403 with installation URL).

## Configuration Files

- `vitest.config.ts` - Vitest configuration for unit tests
- `playwright.config.ts` - Playwright configuration for E2E tests
- `test/setup.ts` - Test environment setup
- `tsconfig.json` - TypeScript configuration (excludes test directories)

## Running Tests in CI/CD

For CI environments, the Playwright config automatically:
- Runs with 2 retries
- Uses single worker (parallel safety)
- Starts wrangler dev server automatically
- Waits up to 2 minutes for server to be ready

## Test Scenarios Summary

| Scenario | Unit Tests | E2E Tests |
|----------|-----------|-----------|
| Health check endpoint | ✅ | ✅ |
| Installation check | ✅ | ✅ |
| Field validation | ✅ | ✅ |
| Invalid JSON | ✅ | ✅ |
| Invalid repo format | ✅ | ✅ |
| App not installed | ✅ | ✅ |
| Screenshot upload | ✅ | ✅ |
| Annotations upload | ✅ | ✅ |
| CORS headers | ✅ | ✅ |
| CORS preflight | ✅ | ✅ |
| Error handling | ✅ | ✅ |
| Performance | ❌ | ✅ |
| Concurrent requests | ❌ | ✅ |

## Writing New Tests

### Adding Unit Tests
1. Add test cases to `test/api.test.ts`
2. Mock any external dependencies (GitHub API calls)
3. Use `vi.mock()` for module mocking
4. Test both success and error cases

### Adding E2E Tests
1. Add test cases to `e2e/api.spec.ts`
2. Use Playwright's `request` fixture for API calls
3. Test against real server responses
4. Handle both success cases (app installed) and error cases (app not installed)

## Troubleshooting

### Unit Tests Fail
- Check that mock implementations match actual API behavior
- Verify TypeScript types are correct
- Run `npm test -- --reporter=verbose` for detailed output

### E2E Tests Fail
- Ensure wrangler dev server is running: `npm run dev`
- Check that server is accessible at `http://localhost:8787`
- Verify GitHub App credentials in `.dev.vars` (if testing installed scenarios)
- Check Playwright HTML report: `npx playwright show-report`

### Server Won't Start
- Check if port 8787 is already in use
- Verify wrangler is installed: `npx wrangler --version`
- Check for TypeScript compilation errors: `npm run build`
