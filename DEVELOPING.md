# Developing Agents for Plane

This guide walks you through building and deploying your own agent for Plane using this repository as a starting point.

## Prerequisites

- Node.js installed
- A Cloudflare account (for Workers deployment)
- Access to a Plane instance

## Setup Steps

### 1. Clone and Rename

After cloning the repo, update the agent name in:
- `package.json` (name field)
- `wrangler.jsonc` (name field)

### 2. Install Dependencies

```bash
npm install
```

This installs all packages and sets up wrangler for Cloudflare Workers.

### 3. Create KV Namespace

The agent uses Cloudflare KV to store OAuth credentials. Create a KV namespace:

```bash
npx wrangler kv namespace create CREDENTIALS_KV
```

This command will output a binding ID. Update the `kv_namespaces` section in `wrangler.jsonc` with the returned ID:

```jsonc
{
  "kv_namespaces": [
    {
      "binding": "CREDENTIALS_KV",
      "id": "<your-kv-namespace-id>"
    }
  ]
}
```

### 4. Initial Deployment

```bash
npm run deploy
```

This deploys the boilerplate code to Cloudflare Workers. Once complete, you'll receive a unique domain where your worker is deployed (e.g., `https://my-agent.my-account.workers.dev`).

### 5. Create a Plane App

Navigate to your Plane instance's integrations page at `/settings/integrations` and create a new App.

### 6. Enable App Mentions

Since this is an agent, ensure **"Enable app mentions"** is toggled on. This allows users to invoke your agent by mentioning it in comments.

### 7. Configure App Details

Fill in the required fields:
- **Name**: Your agent's name
- **Description**: What your agent does
- Other fields as needed for your use case

### 8. Configure URLs

This is the critical step. Using your worker domain, configure:

| Field | URL |
|-------|-----|
| Setup URL | `https://my-agent.my-account.workers.dev/oauth/setup` |
| Webhook URL | `https://my-agent.my-account.workers.dev/webhook` |
| Redirect URI | `https://my-agent.my-account.workers.dev/oauth/callback` |

Save the app after entering these URLs.

### 9. Retrieve Credentials

After saving, you'll receive:
- **Client ID**
- **Client Secret**

Keep these safe—you'll need them in the next steps.

### 10. Update Configuration

Open `wrangler.jsonc` and update the following values:

```jsonc
{
  "vars": {
    "PLANE_CLIENT_ID": "<your-client-id>",
    "PLANE_BASE_URL": "https://api.plane.so",
    "PLANE_BASE_APP_URL": "https://app.plane.so",
    "SERVER_URL": "https://my-agent.my-account.workers.dev"
  }
}
```

**For production use cases:**
- `PLANE_BASE_URL`: `https://api.plane.so`
- `PLANE_BASE_APP_URL`: `https://app.plane.so`
- `SERVER_URL`: Your worker domain (e.g., `https://my-agent.my-account.workers.dev`)

### 11. Add Secrets

Secrets should not be stored in `wrangler.jsonc`. Instead, use wrangler to set them directly on Cloudflare:

```bash
npx wrangler secret put PLANE_CLIENT_SECRET
npx wrangler secret put OPENAI_API_KEY
```

You'll be prompted to enter the values securely.

### 12. Redeploy

After updating configuration and secrets, deploy again:

```bash
npm run deploy
```

### 13. Customize Your Agent

Modify the following files to change your agent's behavior:

- `src/lib/agent/prompt.ts` - System prompt defining agent behavior and available tools
- `src/lib/agent/tools.ts` - Tool implementations

After making changes, redeploy with:

```bash
npm run deploy
```

### 14. Install the App

To install your agent in a Plane workspace, either:

- Navigate to `https://my-agent.my-account.workers.dev/oauth/setup` in your browser, or
- Click the **"Install"** button on your app in the `/settings/integrations` page

## Using Your Agent

Once installed, mention your agent in any issue comment to invoke it. The agent will process the mention and respond based on your configured prompt and tools.
