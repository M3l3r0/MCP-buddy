# MCPeer

A desktop application for interacting with MCP (Model Context Protocol) servers with AI enhancement capabilities.

## Features

- 🖥️ Native desktop application built with Electron
- 🔗 Connect to multiple MCP servers
- 🤖 AI orchestration with LLM providers (OpenAI, Anthropic, Snowflake Cortex)
- 💬 Conversation history with persistence
- 📊 Real-time logs panel
- 🔐 Multiple authentication methods (Bearer, OAuth, API Key, Basic, Custom)

## Development

### Prerequisites

- Node.js 18 or later
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Building

```bash
# Build for current platform
npm run electron:build

# Build for macOS
npm run electron:build:mac

# Build for Windows
npm run electron:build:win

# Build for Linux
npm run electron:build:linux
```

## Configuration

Create a `config.local.json` file in the root directory for initial configuration:

```json
{
  "servers": [
    {
      "id": "server-1",
      "name": "My MCP Server",
      "url": "https://my-mcp-server.example.com/mcp",
      "auth": {
        "method": "bearer",
        "bearerToken": "your-token-here"
      },
      "enabled": true
    }
  ],
  "llmConfigs": [
    {
      "id": "llm-1",
      "name": "OpenAI GPT-4",
      "provider": "openai",
      "enabled": true,
      "config": {
        "apiKey": "sk-...",
        "model": "gpt-4"
      }
    }
  ]
}
```

## Architecture

- **Main Process** (`electron/main.ts`): Electron main process that manages the window and starts the embedded Express server
- **Preload** (`electron/preload.ts`): Secure bridge between main and renderer processes
- **Server** (`electron/server.ts`): Express server handling MCP and LLM API calls
- **Renderer** (`src/`): React application for the UI

## License

MIT
