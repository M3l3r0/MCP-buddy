export type AuthMethod = 'bearer' | 'oauth' | 'api-key' | 'basic' | 'custom';

export interface MCPServerAuth {
  method: AuthMethod;
  // Bearer/PAT
  bearerToken?: string;
  // OAuth
  oauthClientId?: string;
  oauthClientSecret?: string;
  oauthTokenUrl?: string;
  oauthScope?: string;
  // API Key
  apiKey?: string;
  apiKeyHeader?: string; // e.g., "X-API-Key"
  // Basic Auth
  username?: string;
  password?: string;
  // Custom Headers
  customHeaders?: Record<string, string>;
}

export interface MCPServer {
  id: string;
  name: string;
  url: string;
  auth: MCPServerAuth;
  enabled: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  serverId?: string;
  metadata?: {
    timings?: {
      mcpTime?: number;
      llmTime?: number;
      totalTime?: number;
    };
    mcpRequest?: any;
    mcpResponse?: any;
    llmRequest?: any;
    llmResponse?: any;
  };
}

export interface Conversation {
  id: string;
  title: string;
  serverId: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  llmEnabled: boolean;
  isAutoCreated?: boolean; // Para distinguir conversaciones auto-creadas vs creadas manualmente
}

export interface Tool {
  name: string;
  description?: string;
  inputSchema?: any;
}

export interface Resource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface LLMConfig {
  id: string;
  name: string;
  provider: 'snowflake' | 'openai' | 'anthropic' | 'other' | 'custom';
  enabled: boolean;
  config: {
    endpoint?: string;
    apiKey?: string;
    model?: string;
    headers?: Record<string, string>;
    maxTokens?: number;
    temperature?: number;
  };
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'mcp-request' | 'mcp-response' | 'llm-request' | 'llm-response' | 'error' | 'info';
  message: string;
  data?: any;
  timings?: {
    mcpTime?: number;
    llmTime?: number;
    totalTime?: number;
  };
}
