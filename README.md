# PRD Agent — Example Plane Agent

An example [Plane Agent](https://developers.plane.so/dev-tools/agents/overview) built as a Cloudflare Worker. When mentioned in a work item comment, it generates a PRD (Product Requirements Document) using OpenAI and links it back to the issue as a Plane page.

Use this project as a reference for building your own Plane agents.

## How It Works

Plane Agents are AI-powered apps that users can `@mention` in work item comments. Each mention triggers an **Agent Run** — a tracked interaction session where the agent can think, act, and respond.

This agent follows a simple tool-chain workflow:

1. **Receive webhook** — Plane sends an `agent_run_activity` event when the agent is mentioned
2. **Get issue details** — Fetches the work item title and description via the Plane SDK
3. **Generate PRD** — Sends the issue context to OpenAI to produce a structured PRD
4. **Create page** — Publishes the PRD as a Plane page in the project
5. **Link to issue** — Attaches the page URL back to the original work item

The agent communicates progress back to Plane using [Agent Run Activities](https://developers.plane.so/dev-tools/agents/overview):

| Activity Type | Purpose |
|---------------|---------|
| `thought` | Shows reasoning (ephemeral, not visible as a comment) |
| `action` | Indicates tool execution with parameters |
| `response` | Final answer to the user (creates a comment) |
| `elicitation` | Asks the user for more information |
| `error` | Reports failures |

## Project Structure

```
src/
├── index.ts                  # Entry point — routes requests (OAuth, webhooks, health)
└── lib/
    ├── helpers.ts            # OAuth configuration and API client setup
    ├── store.ts              # KV storage for workspace credentials
    ├── templates.ts          # HTML template for OAuth success page
    ├── types.ts              # TypeScript types (webhook payloads, tool names)
    ├── webhook-handler.ts    # Webhook processing and token refresh
    └── agent/
        ├── agentClient.ts    # Core agent loop — orchestrates LLM calls and tool execution
        ├── prompt.ts         # System prompt defining agent behavior
        └── tools.ts          # Tool implementations (Plane API + OpenAI)
```

### Key Concepts

- **`AgentClient`** (`agentClient.ts`) — Implements a ReAct-style loop. Each LLM response is prefixed with `THINKING:`, `ACTION:`, `RESPONSE:`, `ELICITATION:`, or `ERROR:` to determine the next step. The loop runs until a terminal activity (response/error/elicitation) or max iterations (10).

- **Tools** (`tools.ts`) — Stateless functions called in sequence. Results are stored on the `AgentClient` instance so each tool can access the output of previous tools without parameter passing.

- **Webhook handler** (`webhook-handler.ts`) — Validates events, refreshes expired OAuth tokens, and hands off to the agent client.

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Cloudflare account](https://dash.cloudflare.com/)
- [Plane workspace](https://plane.so/)
- [OpenAI API key](https://platform.openai.com/)

### 1. Clone and install

```bash
git clone <repo-url>
cd prd-agent
npm install
```

### 2. Create a KV namespace

```bash
wrangler kv namespace create CREDENTIALS_KV
```

Copy the namespace ID into `wrangler.jsonc`.

### 3. Create a Plane App

1. Go to your Plane workspace settings
2. Navigate to **Apps** > **Create App**
3. Configure:
   - **App Name**: PRD Agent
   - **Redirect URL**: `https://<your-worker-url>/oauth/callback`
   - **Webhook URL**: `https://<your-worker-url>/webhook`
   - Enable **App Mentions** (this makes it an agent)
   - Enable the `agent_run_user_prompt` webhook event
4. Note the **Client ID** and **Client Secret**

### 4. Configure environment

Update `wrangler.jsonc` with your values:

```jsonc
{
  "vars": {
    "PLANE_CLIENT_ID": "<your-client-id>",
    "PLANE_BASE_URL": "https://api.plane.so",
    "PLANE_BASE_APP_URL": "https://app.plane.so",
    "SERVER_URL": "https://<your-worker-url>"
  }
}
```

Set secrets:

```bash
wrangler secret put PLANE_CLIENT_SECRET
wrangler secret put OPENAI_API_KEY
```

### 5. Deploy

```bash
npm run deploy
```

### 6. Install the app

1. Visit `https://<your-worker-url>/oauth/setup`
2. Authorize the app for your workspace
3. The agent is now ready to use

## Usage

Mention the agent in any work item comment:

```
@PRDAgent create a PRD for this issue
```

The agent will generate a PRD, create a page, and link it to the issue.

## Development

```bash
npm run dev          # Start local dev server (wrangler dev)
npm run deploy       # Deploy to Cloudflare
npm run cf-typegen   # Generate TypeScript types for Cloudflare bindings
```

## Environment Variables

| Variable | Type | Description |
|----------|------|-------------|
| `PLANE_CLIENT_ID` | var | Plane OAuth Client ID |
| `PLANE_CLIENT_SECRET` | secret | Plane OAuth Client Secret |
| `PLANE_BASE_URL` | var | Plane API base URL |
| `PLANE_BASE_APP_URL` | var | Plane app base URL |
| `SERVER_URL` | var | This worker's public URL |
| `OPENAI_API_KEY` | secret | OpenAI API key |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Root greeting |
| `/health` | GET | Health check |
| `/oauth/setup` | GET | Start OAuth installation flow |
| `/oauth/callback` | GET | OAuth callback handler |
| `/webhook` | POST | Plane webhook receiver |

## Learn More

- [Plane Agents documentation](https://developers.plane.so/dev-tools/agents/overview)
- [Plane Node SDK](https://www.npmjs.com/package/@makeplane/plane-node-sdk)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)

## License

MIT
