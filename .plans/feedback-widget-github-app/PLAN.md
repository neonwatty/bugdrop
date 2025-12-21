# Implementation Plan: Feedback Widget with GitHub App

## Metadata
- **Status:** COMPLETED
- **Current Step:** 3
- **Created:** 2025-12-19T15:55:00
- **Completed:** 2025-12-19T23:30:00
- **Branch:** feature/feedback-widget-github-app
- **PR:** https://github.com/neonwatty/feedback-widget/pull/1

## Overview
Build a feedback widget system with three main components: (1) Cloudflare Worker backend with GitHub App authentication that creates issues, (2) Client-side widget with screenshot capture, element picker, and annotation tools, and (3) E2E integration tests that verify the full feedback submission flow.

## Steps

### Step 1: Project Setup & Backend API
- **Status:** COMPLETED
- **Attempts:** 1
- **Started:** 2025-12-19T23:00:00
- **Completed:** 2025-12-19T23:06:00

**Description:** Initialize the Cloudflare Worker project with Hono framework and implement the complete backend API including GitHub App JWT authentication, installation token management, and API endpoints for health checks, installation verification, and feedback submission with screenshot uploads.

**Files to Change:**
- `package.json` - Initialize with dependencies: hono, jose, wrangler, esbuild, @cloudflare/workers-types, vitest, @cloudflare/vitest-pool-workers
- `wrangler.toml` - Configure Cloudflare Worker with assets directory, environment variables for development/staging/production
- `tsconfig.json` - TypeScript configuration for Workers runtime with ES2022 target
- `src/types.ts` - Define TypeScript interfaces for Env, FeedbackPayload, GitHubIssue
- `src/lib/jwt.ts` - Implement generateGitHubAppJWT function using WebCrypto API with PKCS#8 key import and RS256 signing
- `src/lib/github.ts` - Implement getInstallationId, getInstallationToken, createIssue, uploadFile, uploadScreenshot functions for GitHub API interactions
- `src/routes/api.ts` - Create Hono router with /health, /check/:owner/:repo, and POST /feedback endpoints with CORS middleware
- `src/index.ts` - Main Worker entry point mounting API routes and serving /widget.js from static assets
- `.gitignore` - Add .dev.vars, node_modules, dist, public/widget.js, .wrangler
- `.dev.vars.example` - Template for local development secrets with GITHUB_APP_ID and GITHUB_PRIVATE_KEY placeholders

**Acceptance Criteria:**
- [ ] npm install completes successfully with all dependencies
- [ ] TypeScript compiles without errors
- [ ] wrangler dev starts local server at http://localhost:8787
- [ ] GET /api/health returns status "ok" with environment and timestamp
- [ ] GET /api/check/:owner/:repo returns installation status (requires GitHub App setup)
- [ ] POST /api/feedback endpoint validates required fields (repo, title, description) and returns 400 for invalid payloads
- [ ] JWT generation produces valid RS256-signed tokens that GitHub API accepts
- [ ] Installation token retrieval works for installed repositories
- [ ] Issue creation works with proper markdown formatting including description, screenshot URL, and metadata table

**Visual Check:** N/A

**Tests:** Run `npm test` after implementing vitest configuration - should pass unit tests for JWT generation, installation checks, and API validation

**Checker Feedback:** -

---

### Step 2: Widget Implementation
- **Status:** COMPLETED
- **Attempts:** 1
- **Started:** 2025-12-19T23:07:00
- **Completed:** 2025-12-19T23:15:00

**Description:** Build the client-side widget as an IIFE bundle with Shadow DOM isolation, screenshot capture using html-to-image, interactive element picker with visual highlighting, canvas-based annotation tools (draw, arrow, rectangle), and a complete UI flow from trigger button through screenshot capture, annotation, feedback form, and submission.

**Files to Change:**
- `src/widget/index.ts` - Widget entry point reading config from script tag data attributes, initializing Shadow DOM, handling installation checks, and orchestrating the complete feedback flow
- `src/widget/screenshot.ts` - Implement captureScreenshot using dynamically loaded html-to-image library with filtering to exclude widget elements
- `src/widget/picker.ts` - Create createElementPicker that adds mouse tracking overlay, highlights elements on hover, captures element on click, and generates CSS selectors
- `src/widget/annotator.ts` - Build canvas-based annotator with drawing tools (draw, arrow, rect), undo functionality, and PNG export
- `src/widget/ui.ts` - Implement UI components: injectStyles for Shadow DOM CSS, createModal for dialogs, showToast for success/error messages
- `package.json` - Add build:widget script using esbuild with --bundle --minify --format=iife --outfile=public/widget.js
- `public/.gitkeep` - Create public directory for built widget
- `test/index.html` - Local test page with sample content, buttons, forms, and widget script tag for manual testing

**Acceptance Criteria:**
- [ ] npm run build:widget creates public/widget.js without errors
- [ ] Built widget.js is a valid IIFE bundle (self-contained, no external dependencies except html-to-image CDN)
- [ ] Widget loads on test page at http://localhost:3000 when served from wrangler dev
- [ ] Floating bug button (🐛) appears in bottom-right corner with proper z-index and hover effects
- [ ] Clicking trigger button opens modal with screenshot options (skip, capture page, select element)
- [ ] Full page screenshot captures correctly excluding the widget itself
- [ ] Element picker activates with crosshair cursor, highlights elements on hover with blue border, and captures on click
- [ ] Annotation tools load with canvas overlay showing draw, arrow, and rectangle options
- [ ] Drawing on canvas works smoothly with red color and 3px line width
- [ ] Arrows draw correctly with proper arrowhead at 15px length
- [ ] Rectangles draw with proper stroke and preview during drag
- [ ] Undo button removes last annotation and restores previous canvas state
- [ ] Feedback form validates title and description as required fields
- [ ] Submission sends proper JSON payload to /api/feedback with all metadata (url, userAgent, viewport, timestamp, elementSelector)
- [ ] Success toast appears on successful submission showing issue number
- [ ] Error toast appears on failure with appropriate error message
- [ ] Shadow DOM properly isolates styles from host page (no style leakage in either direction)
- [ ] Widget config reads data-repo, data-position, and data-theme attributes correctly

**Visual Check:**
- Open http://localhost:3000/test/ in browser
- Verify feedback button appears in bottom-right corner
- Click button and verify modal opens with clean UI
- Test screenshot capture - verify page is captured without widget
- Test element picker - verify blue highlight follows mouse cursor
- Select an element and verify it captures correctly
- Test annotation tools - draw lines, arrows, rectangles
- Verify canvas preview works during drawing
- Test undo - verify annotations are removed in reverse order
- Fill in form and submit
- Verify success toast appears with issue link

**Tests:** Run `npm test` for widget unit tests verifying selector generation, annotation canvas drawing, and form validation

**Checker Feedback:** -

---

### Step 3: Integration & E2E Testing
- **Status:** COMPLETED
- **Attempts:** 1
- **Started:** 2025-12-19T23:16:00
- **Completed:** 2025-12-19T23:30:00

**Description:** Set up complete integration testing with vitest for Worker tests and Playwright for E2E browser automation testing the full feedback flow including GitHub App authentication, issue creation, screenshot upload, and widget UI interactions on real test pages.

**Files to Change:**
- `vitest.config.ts` - Configure @cloudflare/vitest-pool-workers with wrangler.toml path
- `test/worker.test.ts` - Unit tests for Worker endpoints: health check, installation check, feedback submission with mocked GitHub API
- `test/github.test.ts` - Unit tests for JWT generation, installation token retrieval, issue creation, file upload functions
- `package.json` - Add @playwright/test dev dependency and test:e2e script
- `playwright.config.ts` - Configure Playwright for Chromium with baseURL http://localhost:8787
- `test/e2e/widget.spec.ts` - E2E tests for widget UI flow: trigger click, screenshot capture, element selection, annotation, form submission
- `test/e2e/integration.spec.ts` - Full integration test: start wrangler dev, load test page, submit feedback, verify GitHub issue created (requires real GitHub App)
- `.github/workflows/test.yml` - CI workflow running npm test and optionally E2E tests
- `README.md` - Update with testing instructions and npm scripts documentation

**Acceptance Criteria:**
- [ ] npm test runs vitest successfully with all Worker unit tests passing
- [ ] Worker health endpoint test verifies status "ok" response
- [ ] Installation check test mocks GitHub API and verifies proper token flow
- [ ] Feedback submission test validates payload structure and error handling
- [ ] JWT generation test verifies token structure with correct header/payload/signature
- [ ] GitHub API tests mock fetch calls and verify proper request formatting
- [ ] npm run test:e2e runs Playwright E2E tests successfully
- [ ] E2E test starts wrangler dev server programmatically
- [ ] E2E test loads test page and verifies widget button appears
- [ ] E2E test clicks trigger button and verifies modal opens
- [ ] E2E test captures screenshot and verifies canvas appears
- [ ] E2E test uses annotation tools and verifies drawing works
- [ ] E2E test fills form and submits feedback
- [ ] E2E test verifies success toast appears
- [ ] Integration test creates real GitHub issue (when configured with valid .dev.vars)
- [ ] Integration test verifies issue contains screenshot and metadata
- [ ] All tests run in CI pipeline on push to feature branch

**Visual Check:**
- Run npm test and verify all unit tests pass with green checkmarks
- Run npm run test:e2e and observe Playwright browser automation
- Verify browser opens, navigates to test page, and widget appears
- Watch automated clicks and form fills
- Verify test completes successfully with issue created

**Tests:**
```bash
# Run all tests
npm test

# Run E2E tests
npm run test:e2e

# Run specific test file
npm test -- test/worker.test.ts
```

**Checker Feedback:** -

---

## Notes
- This is a Cloudflare Worker project using wrangler for development and deployment, not a Vite/React project
- The widget is built as an IIFE (Immediately Invoked Function Expression) for universal compatibility
- GitHub App must be registered and installed before backend authentication will work (see /plans/01-github-app-setup.md)
- Local development requires .dev.vars file with GITHUB_APP_ID and GITHUB_PRIVATE_KEY (see .dev.vars.example)
- Widget is served as a static asset from public/ directory via Cloudflare Workers assets
- All dependencies use native Web APIs or Worker-compatible libraries (no Node.js-specific code)
- Shadow DOM provides complete style isolation between widget and host page
- html-to-image is loaded dynamically from CDN to reduce initial bundle size
- Testing requires both local wrangler dev server (http://localhost:8787) and test page server (http://localhost:3000)
