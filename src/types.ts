export interface Env {
  // Secrets (from .dev.vars locally, wrangler secret in production)
  GITHUB_APP_ID: string;
  GITHUB_PRIVATE_KEY: string;

  // Variables (from wrangler.toml)
  ENVIRONMENT: string;

  // Bindings
  ASSETS: Fetcher;
}

export interface FeedbackPayload {
  repo: string;           // "owner/repo" format
  title: string;
  description: string;
  screenshot?: string;    // base64 data URL
  annotations?: string;   // base64 annotated image
  metadata: {
    url: string;
    userAgent: string;
    viewport: { width: number; height: number };
    timestamp: string;
    elementSelector?: string;
  };
}

export interface GitHubIssue {
  number: number;
  html_url: string;
}
