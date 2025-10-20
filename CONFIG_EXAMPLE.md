# Configuration Examples

This document provides examples of how to configure MCP servers and LLM providers in MCPbuddy.

⚠️ **IMPORTANT**: All configuration is stored in your browser's localStorage. No sensitive data is stored in the codebase or version control.

## MCP Server Configuration Example

### Snowflake MCP Server

```json
{
  "id": "snowflake-mcp-1",
  "name": "Snowflake MCP Server",
  "url": "https://your-account.snowflakecomputing.com/api/v2/databases/YOUR_DB/schemas/YOUR_SCHEMA/mcp-servers/your_server",
  "auth": {
    "method": "bearer",
    "bearerToken": "your-jwt-token-here"
  },
  "enabled": true
}
```

### Generic MCP Server with API Key

```json
{
  "id": "generic-mcp-1",
  "name": "My MCP Server",
  "url": "https://api.example.com/mcp",
  "auth": {
    "method": "api-key",
    "apiKey": "your-api-key-here",
    "apiKeyHeader": "X-API-Key"
  },
  "enabled": true
}
```

### MCP Server with Basic Auth

```json
{
  "id": "basic-auth-mcp",
  "name": "Basic Auth MCP",
  "url": "https://mcp.example.com",
  "auth": {
    "method": "basic",
    "username": "your-username",
    "password": "your-password"
  },
  "enabled": true
}
```

## LLM Configuration Examples

### Snowflake Cortex

```json
{
  "id": "snowflake-cortex-1",
  "name": "Snowflake Cortex (Claude 3.5)",
  "provider": "snowflake",
  "enabled": true,
  "config": {
    "model": "claude-3-5-sonnet",
    "apiKey": "your-snowflake-jwt-token",
    "endpoint": "https://your-account.snowflakecomputing.com/api/v2/cortex/inference:complete",
    "temperature": 0.7,
    "maxTokens": 2000
  }
}
```

### OpenAI

```json
{
  "id": "openai-gpt4",
  "name": "OpenAI GPT-4",
  "provider": "openai",
  "enabled": true,
  "config": {
    "model": "gpt-4-turbo-preview",
    "apiKey": "sk-your-openai-api-key",
    "endpoint": "https://api.openai.com/v1/chat/completions",
    "temperature": 0.7,
    "maxTokens": 2000
  }
}
```

### Anthropic Claude

```json
{
  "id": "anthropic-claude",
  "name": "Anthropic Claude 3",
  "provider": "anthropic",
  "enabled": true,
  "config": {
    "model": "claude-3-opus-20240229",
    "apiKey": "sk-ant-your-anthropic-api-key",
    "endpoint": "https://api.anthropic.com/v1/messages",
    "temperature": 0.7,
    "maxTokens": 2000
  }
}
```

### Custom/Other Provider

```json
{
  "id": "custom-llm",
  "name": "Custom LLM Provider",
  "provider": "other",
  "enabled": true,
  "config": {
    "model": "your-model-name",
    "apiKey": "your-api-key",
    "endpoint": "https://your-llm-api.com/v1/completions",
    "temperature": 0.7,
    "maxTokens": 2000,
    "headers": {
      "X-Custom-Header": "value"
    }
  }
}
```

## How to Add Configuration

1. Start the application
2. Click on "⚙️ Servers" to add MCP servers
3. Click on "🤖 LLM Config" to add LLM providers
4. All configuration is automatically saved in your browser's localStorage
5. Export your configuration from the UI if you want to back it up

## Security Notes

- **Never commit** your actual API keys, tokens, or endpoints to version control
- All sensitive data is stored locally in your browser
- If you need to share configurations with a team, remove all sensitive values first
- Consider using environment-specific configurations for development/production

