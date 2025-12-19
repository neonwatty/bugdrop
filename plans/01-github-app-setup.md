# GitHub App Registration & Setup

## What is a GitHub App?

A GitHub App is an **authentication mechanism** (not a hosting platform). It provides:
- An App ID and private key for authentication
- A way for users to grant permission to specific repos
- Short-lived, scoped tokens for API access

**Key insight**: Your code still runs somewhere else (Cloudflare Worker). The GitHub App just handles auth.

## Development vs Production Apps

| Aspect | Development | Production |
|--------|-------------|------------|
| **Name** | `feedback-widget-dev-yourname` | `feedback-widget` |
| **Visibility** | Only your account | Any account |
| **Webhook URL** | localhost (or Smee.io) | Production URL |
| **Purpose** | Testing | Public release |

## Step-by-Step: Create Development App

### 1. Navigate to GitHub Apps

1. Go to https://github.com/settings/apps
2. Click **New GitHub App**

### 2. Fill in Basic Information

| Field | Value |
|-------|-------|
| **GitHub App name** | `feedback-widget-dev-YOURNAME` (must be unique globally) |
| **Description** | "Development version of feedback widget" |
| **Homepage URL** | `http://localhost:8787` |

### 3. Webhook Configuration

| Setting | Value |
|---------|-------|
| **Active** | ☐ Unchecked (we don't need webhooks) |
| **Webhook URL** | Leave empty |

### 4. Repository Permissions

| Permission | Access | Why |
|------------|--------|-----|
| **Contents** | Read and write | Upload screenshots to repo |
| **Issues** | Read and write | Create feedback issues |
| **Metadata** | Read-only | Auto-granted, required |

### 5. Installation Scope

- Select: **Only on this account** (for development)

### 6. Create the App

Click **Create GitHub App**

## After Creation: Get Credentials

### App ID

After creation, you'll see the **App ID** at the top of the page (e.g., `123456`).

Save this - you'll need it for `GITHUB_APP_ID` environment variable.

### Generate Private Key

1. Scroll to **Private keys** section
2. Click **Generate a private key**
3. A `.pem` file downloads automatically

**Important**: GitHub only stores the public key. Save this private key securely!

### Convert Key to PKCS#8 Format

The WebCrypto API (used in Cloudflare Workers) requires PKCS#8 format:

```bash
openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt \
  -in ~/Downloads/feedback-widget-dev.*.private-key.pem \
  -out private-key.pem
```

### Install App on Test Repository

1. Create a test repo (e.g., `yourname/feedback-test`)
2. Go to your app's settings → **Install App**
3. Click **Install**
4. Select **Only select repositories** → Choose your test repo
5. Click **Install**

## Store Credentials Locally

Create `.dev.vars` file in your project:

```
GITHUB_APP_ID=123456
GITHUB_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBg...
your-key-content-here
...
-----END PRIVATE KEY-----"
```

**Critical**: Add `.dev.vars` to `.gitignore`!

## How GitHub App Auth Works

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Your Worker   │     │   GitHub API    │     │   Target Repo   │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │  1. Sign JWT with     │                       │
         │     private key       │                       │
         │ ─────────────────────>│                       │
         │                       │                       │
         │  2. Get installation  │                       │
         │     ID for repo       │                       │
         │ ─────────────────────>│                       │
         │                       │                       │
         │  3. Exchange JWT for  │                       │
         │     installation token│                       │
         │ ─────────────────────>│                       │
         │                       │                       │
         │  4. Use token to      │                       │
         │     create issue      │                       │
         │ ─────────────────────>│──────────────────────>│
         │                       │                       │
```

### Token Types

| Token | Lifetime | Purpose |
|-------|----------|---------|
| **JWT** | 10 minutes | Authenticate as the App itself |
| **Installation Token** | 1 hour | Perform actions on installed repos |

## Security Best Practices

### Private Key Storage

**Do**:
- Store in environment variables (`.dev.vars` locally)
- Use secret management (Cloudflare Secrets in production)
- Rotate keys periodically

**Don't**:
- Commit to git (even private repos)
- Hardcode in source code
- Share in chat/email

### Permission Scope

- Request **minimum** permissions needed
- Only `Contents` and `Issues` for this widget
- Users can see exactly what you're requesting

### Token Security

- Installation tokens expire in 1 hour (automatic)
- Never log tokens
- Never send tokens to client-side code

## Troubleshooting

### "Installation not found"

- Verify app is installed on the target repo
- Check the repo name format: `owner/repo`
- Ensure the installation hasn't been revoked

### "Bad credentials"

- Check private key is in PKCS#8 format
- Verify App ID matches the key
- Check JWT isn't expired (10 min max)

### "Resource not accessible"

- Check app has required permissions
- Verify installation includes the target repo
- Some repos may have additional protections

## Production App Setup

When ready to go public:

1. Create a **new** GitHub App (not modify dev)
2. Use production URLs
3. Set visibility to **Any account**
4. Generate new private key
5. Consider GitHub Marketplace listing

See `07-production-release.md` for full details.

## References

- [GitHub Docs: Creating GitHub Apps](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app)
- [GitHub Docs: Authenticating as a GitHub App](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app)
- [GitHub Docs: Generating JWTs](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-json-web-token-jwt-for-a-github-app)
