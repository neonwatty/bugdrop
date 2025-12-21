import { generateGitHubAppJWT } from './jwt';
import type { Env, GitHubIssue } from '../types';

const GITHUB_API = 'https://api.github.com';

const headers = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'Content-Type': 'application/json',
  'User-Agent': 'FeedbackWidget/1.0',
  'X-GitHub-Api-Version': '2022-11-28',
});

/**
 * Get installation ID for a repository
 */
async function getInstallationId(
  env: Env,
  owner: string,
  repo: string
): Promise<number | null> {
  const jwt = await generateGitHubAppJWT(env.GITHUB_APP_ID, env.GITHUB_PRIVATE_KEY);

  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/installation`,
    { headers: headers(jwt) }
  );

  if (!response.ok) {
    console.error(`Installation not found: ${response.status}`);
    return null;
  }

  const data = await response.json() as { id: number };
  return data.id;
}

/**
 * Get installation access token (scoped to installed repos)
 */
export async function getInstallationToken(
  env: Env,
  owner: string,
  repo: string
): Promise<string | null> {
  const installationId = await getInstallationId(env, owner, repo);
  if (!installationId) return null;

  const jwt = await generateGitHubAppJWT(env.GITHUB_APP_ID, env.GITHUB_PRIVATE_KEY);

  const response = await fetch(
    `${GITHUB_API}/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: headers(jwt),
    }
  );

  if (!response.ok) {
    console.error(`Failed to get token: ${response.status}`);
    return null;
  }

  const data = await response.json() as { token: string };
  return data.token;
}

/**
 * Create a GitHub issue
 */
export async function createIssue(
  token: string,
  owner: string,
  repo: string,
  title: string,
  body: string,
  labels: string[] = ['feedback']
): Promise<GitHubIssue> {
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/issues`,
    {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ title, body, labels }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create issue: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Upload screenshot to repo and return the raw URL for embedding in issues
 * Requires Contents:write permission on the GitHub App
 */
export async function uploadScreenshotAsAsset(
  token: string,
  owner: string,
  repo: string,
  base64DataUrl: string
): Promise<string> {
  // Remove data URL prefix and extract the base64 content
  const content = base64DataUrl.replace(/^data:image\/\w+;base64,/, '');

  // Generate unique filename with timestamp
  const timestamp = Date.now();
  const filename = `.feedback/screenshots/${timestamp}.png`;

  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${filename}`,
    {
      method: 'PUT',
      headers: headers(token),
      body: JSON.stringify({
        message: `Add feedback screenshot ${timestamp}`,
        content: content,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload screenshot: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as { content: { download_url: string } };
  return data.content.download_url;
}
