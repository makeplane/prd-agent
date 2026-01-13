# Weather Bot for Plane

A Cloudflare Worker-based weather assistant that integrates with Plane. Users can mention the bot in work item comments to get weather information for any city.

## Features

- 🌤️ Get current weather for any city
- 🕐 Get current time for any location
- 🗺️ Automatic geocoding of city names
- 🔄 Multi-step reasoning using OpenAI
- 🔐 OAuth integration with Plane

## Architecture

The bot uses a simple agentic loop:
1. Receives webhook events when users mention the bot
2. Uses OpenAI to understand the request and plan actions
3. Executes tools (get coordinates, weather, time)
4. Creates agent activities in Plane to show progress
5. Responds with the final result

## Available Tools

- `getCoordinates(city_name)` - Get latitude/longitude for a city
- `getWeather(lat, long)` - Get current weather conditions
- `getTime(lat, long)` - Get current local time

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Cloudflare account](https://dash.cloudflare.com/)
- [Plane workspace](https://plane.so/)
- [OpenAI API key](https://platform.openai.com/)

### 1. Clone and Install

```bash
cd weather-agent
npm install
```

### 2. Create KV Namespace

```bash
wrangler kv namespace create CREDENTIALS_KV
```

Update `wrangler.jsonc` with the KV namespace ID.

### 3. Create Plane App

1. Go to your Plane workspace settings
2. Navigate to **Apps** > **Create App**
3. Set the following:
   - **App Name**: Weather Bot
   - **Redirect URL**: `https://your-worker-url/oauth/callback`
   - **Webhook URL**: `https://your-worker-url/webhook`
   - Enable the `agent_run_user_prompt` webhook event
4. Note the **Client ID** and **Client Secret**

### 4. Configure Environment

Update `wrangler.jsonc`:

```json
{
  "vars": {
    "PLANE_CLIENT_ID": "your-client-id",
    "PLANE_BASE_URL": "https://api.plane.so",
    "SERVER_URL": "https://your-worker-url"
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

### 6. Install the App

1. Visit `https://your-worker-url/oauth/setup`
2. Authorize the app for your workspace
3. The bot is now ready to use!

## Usage

Mention the bot in any work item comment:

```
@WeatherBot What's the weather in Tokyo?
```

The bot will:
1. Acknowledge the request with a "thinking" activity
2. Look up coordinates for Tokyo
3. Fetch current weather data
4. Respond with the weather information

### Example Interactions

- "What's the weather in New York?"
- "How about Paris?"
- "What time is it in London?"
- "Get me the weather and time for Sydney"

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PLANE_CLIENT_ID` | Plane OAuth Client ID | Yes |
| `PLANE_CLIENT_SECRET` | Plane OAuth Client Secret | Yes |
| `PLANE_BASE_URL` | Plane API URL (default: https://api.plane.so) | No |
| `SERVER_URL` | This worker's public URL | Yes |
| `OPENAI_API_KEY` | OpenAI API key for GPT-4 | Yes |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check message |
| `/health` | GET | Health status JSON |
| `/oauth/setup` | GET | Start OAuth flow |
| `/oauth/callback` | GET | OAuth callback handler |
| `/webhook` | POST | Plane webhook receiver |
| `/workspaces` | GET | List connected workspaces |

## Development

```bash
# Start local development server
npm run dev

# Generate TypeScript types for Cloudflare bindings
npm run cf-typegen

# Lint the code
npm run lint

# Deploy to Cloudflare
npm run deploy
```

## Project Structure

```
weather-agent/
├── src/
│   ├── index.ts              # Main entry point and routing
│   └── lib/
│       ├── helpers.ts        # OAuth helpers and utilities
│       ├── store.ts          # KV storage for credentials
│       ├── templates.ts      # HTML templates
│       ├── types.ts          # TypeScript type definitions
│       ├── webhook-handler.ts # Webhook processing
│       └── agent/
│           ├── agentClient.ts # Agent logic and Plane API
│           ├── prompt.ts      # LLM system prompt
│           └── tools.ts       # Weather/time/geo tools
├── wrangler.jsonc            # Cloudflare configuration
├── package.json
├── tsconfig.json
└── README.md
```

## Webhook Events

The bot listens for `agent_run_user_prompt` events, which are triggered when a user mentions the bot in a work item comment. The webhook payload includes:

- `agent_run` - The agent run context
- `agent_run_activity` - The user's prompt activity
- `workspace_id` - The workspace identifier
- `project_id` - The project identifier
- `issue_id` - The work item identifier

## Agent Activity Types

The bot creates various activity types in Plane:

- `thought` - Shows the bot's reasoning process
- `action` - Indicates tool execution
- `response` - Final answer to the user
- `elicitation` - Request for more information
- `error` - Error messages

## License

MIT
