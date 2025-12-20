.PHONY: dev build test test-e2e test-e2e-ui typecheck lint ci clean help install

# Default target
help:
	@echo "Available targets:"
	@echo "  make install      - Install dependencies"
	@echo "  make dev          - Start wrangler dev server"
	@echo "  make build        - Build widget and worker"
	@echo "  make test         - Run unit tests"
	@echo "  make test-e2e     - Run E2E tests"
	@echo "  make test-e2e-ui  - Run E2E tests in UI mode"
	@echo "  make typecheck    - Run TypeScript type checking"
	@echo "  make lint         - Run linter (if configured)"
	@echo "  make ci           - Run all CI checks"
	@echo "  make clean        - Clean build artifacts"

# Install dependencies
install:
	npm install

# Start development server
dev:
	npm run dev

# Build widget and worker
build:
	npm run build:widget
	npm run build

# Run unit tests
test:
	npm test

# Run unit tests in watch mode
test-watch:
	npm run test:watch

# Run E2E tests
test-e2e:
	npm run test:e2e

# Run E2E tests in UI mode
test-e2e-ui:
	npm run test:e2e:ui

# Type check
typecheck:
	npx tsc --noEmit

# Lint (placeholder - add eslint if needed)
lint:
	@echo "No linter configured. Add eslint to enable linting."

# Run all CI checks
ci: typecheck build test test-e2e
	@echo "✅ All CI checks passed!"

# Clean build artifacts
clean:
	rm -rf dist
	rm -rf .wrangler
	rm -rf public/widget.js
	rm -rf playwright-report
	rm -rf test-results
	@echo "✅ Clean complete!"

# Deploy to Cloudflare (production)
deploy: build
	npm run deploy
