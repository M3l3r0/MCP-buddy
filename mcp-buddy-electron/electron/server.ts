import express from 'express';
import cors from 'cors';
import axios from 'axios';

// Store conversation context per server
const conversationContexts = new Map<string, any[]>();

// Store OAuth tokens
const oauthTokens = new Map<string, { access_token: string; expiresAt: number }>();

// Helper function to build authentication headers
async function buildAuthHeaders(server: any) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!server.auth) {
    return headers;
  }

  switch (server.auth.method) {
    case 'bearer':
      if (server.auth.bearerToken) {
        headers.Authorization = `Bearer ${server.auth.bearerToken}`;
      }
      break;

    case 'oauth':
      // Check if we have a cached token
      let token = oauthTokens.get(server.id);
      
      if (!token || token.expiresAt < Date.now()) {
        // Get new token
        try {
          const tokenResponse = await axios.post(
            server.auth.oauthTokenUrl,
            {
              grant_type: 'client_credentials',
              client_id: server.auth.oauthClientId,
              client_secret: server.auth.oauthClientSecret,
              scope: server.auth.oauthScope,
            },
            {
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            }
          );

          token = {
            access_token: tokenResponse.data.access_token,
            expiresAt: Date.now() + (tokenResponse.data.expires_in || 3600) * 1000,
          };
          oauthTokens.set(server.id, token);
        } catch (error: any) {
          console.error('❌ OAuth token fetch failed:', error.message);
          throw new Error('Failed to obtain OAuth token');
        }
      }

      headers.Authorization = `Bearer ${token.access_token}`;
      break;

    case 'api-key':
      if (server.auth.apiKey && server.auth.apiKeyHeader) {
        headers[server.auth.apiKeyHeader] = server.auth.apiKey;
      }
      break;

    case 'basic':
      if (server.auth.username && server.auth.password) {
        const credentials = Buffer.from(
          `${server.auth.username}:${server.auth.password}`
        ).toString('base64');
        headers.Authorization = `Basic ${credentials}`;
      }
      break;

    case 'custom':
      if (server.auth.customHeaders) {
        Object.assign(headers, server.auth.customHeaders);
      }
      break;

    default:
      console.warn('⚠️  Unknown auth method:', server.auth.method);
  }

  return headers;
}

// Helper function to call LLM with MCP response
async function enhanceWithLLM(mcpResponse: string, userMessage: string, llmConfig: any, server: any) {
  console.log(`\n🤖 Enhancing response with ${llmConfig.name}...`);

  const systemPrompt = `You are an intelligent assistant that helps users understand information from MCP (Model Context Protocol) servers.

Your task is to:
1. Analyze the raw data provided from the MCP server
2. Extract the most relevant information
3. Present it in a clear, human-friendly, and conversational way
4. Provide reasoning and context when appropriate
5. If the data contains technical information, explain it in accessible terms

User's question: ${userMessage}

Raw MCP Server Response:
${mcpResponse}

Provide a helpful, well-structured response that addresses the user's question using the information from the MCP server.`;

  try {
    if (llmConfig.provider === 'snowflake') {
      // Snowflake Cortex REST API
      let baseUrl = 'https://your-account.snowflakecomputing.com';
      
      if (server?.url) {
        const match = server.url.match(/(https?:\/\/[^/]+)/);
        if (match) {
          baseUrl = match[1];
        }
      }
      
      const endpoint = llmConfig.config.endpoint || `${baseUrl}/api/v2/cortex/inference:complete`;
      const model = llmConfig.config.model || 'llama3-70b';
      
      const requestBody = {
        model: model,
        messages: [
          { role: 'user', content: systemPrompt }
        ],
        options: {
          temperature: llmConfig.config.temperature || 0.7,
          max_tokens: llmConfig.config.maxTokens || 2000,
        }
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...llmConfig.config.headers,
      };

      if (llmConfig.config.apiKey) {
        headers.Authorization = `Bearer ${llmConfig.config.apiKey}`;
      } else if (server.auth?.bearerToken) {
        headers.Authorization = `Bearer ${server.auth.bearerToken}`;
      }

      console.log('📡 Calling Snowflake Cortex REST API:', endpoint);
      
      const response = await axios.post(endpoint, requestBody, { 
        headers,
        responseType: 'text'
      });
      
      // Parse SSE format
      const responseText = response.data;
      const lines = responseText.split('\n');
      let fullContent = '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const jsonStr = line.substring(6);
            const data = JSON.parse(jsonStr);
            
            if (data.choices && data.choices[0] && data.choices[0].delta) {
              const delta = data.choices[0].delta;
              if (delta.content) {
                fullContent += delta.content;
              }
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      if (fullContent) {
        return fullContent;
      }
      
      return responseText;

    } else if (llmConfig.provider === 'openai') {
      const endpoint = llmConfig.config.endpoint || 'https://api.openai.com/v1/chat/completions';
      
      const requestBody = {
        model: llmConfig.config.model || 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
        ],
        temperature: llmConfig.config.temperature || 0.7,
        max_tokens: llmConfig.config.maxTokens || 2000,
      };

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llmConfig.config.apiKey}`,
      };

      const response = await axios.post(endpoint, requestBody, { headers });
      return response.data.choices[0].message.content;

    } else if (llmConfig.provider === 'anthropic') {
      const endpoint = llmConfig.config.endpoint || 'https://api.anthropic.com/v1/messages';
      
      const requestBody = {
        model: llmConfig.config.model || 'claude-3-opus-20240229',
        messages: [
          { role: 'user', content: systemPrompt },
        ],
        temperature: llmConfig.config.temperature || 0.7,
        max_tokens: llmConfig.config.maxTokens || 2000,
      };

      const headers = {
        'Content-Type': 'application/json',
        'x-api-key': llmConfig.config.apiKey,
        'anthropic-version': '2023-06-01',
      };

      const response = await axios.post(endpoint, requestBody, { headers });
      return response.data.content[0].text;

    } else if (llmConfig.provider === 'other') {
      const endpoint = llmConfig.config.endpoint;
      if (!endpoint) {
        throw new Error('Other provider requires an endpoint');
      }

      const requestBody = {
        model: llmConfig.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
        ],
        temperature: llmConfig.config.temperature || 0.7,
        max_tokens: llmConfig.config.maxTokens || 2000,
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...llmConfig.config.headers,
      };

      if (llmConfig.config.apiKey && !headers.Authorization) {
        headers.Authorization = `Bearer ${llmConfig.config.apiKey}`;
      }

      const response = await axios.post(endpoint, requestBody, { headers });
      
      return response.data.choices?.[0]?.message?.content || 
             response.data.message?.content ||
             response.data.content ||
             response.data.response ||
             JSON.stringify(response.data);

    } else {
      const endpoint = llmConfig.config.endpoint;
      if (!endpoint) {
        throw new Error('Custom LLM requires an endpoint');
      }

      const requestBody = {
        prompt: systemPrompt,
        model: llmConfig.config.model,
        temperature: llmConfig.config.temperature || 0.7,
        max_tokens: llmConfig.config.maxTokens || 2000,
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...llmConfig.config.headers,
      };

      const response = await axios.post(endpoint, requestBody, { headers });
      return response.data.response || response.data.text || JSON.stringify(response.data);
    }
  } catch (error: any) {
    console.error('❌ LLM enhancement failed:', error.response?.data || error.message);
    return mcpResponse;
  }
}

// Helper function to determine the primary argument name from a tool's schema
function getPrimaryArgumentName(inputSchema: any) {
  const possibleArgNames = ['text', 'query', 'message', 'input', 'prompt', 'question'];
  let argName = 'query';
  
  if (!inputSchema) {
    return argName;
  }
  
  const properties = inputSchema.properties || inputSchema;
  
  if (properties && typeof properties === 'object') {
    const schemaProps = Object.keys(properties);
    
    const required = inputSchema.required || [];
    if (required.length > 0) {
      for (const req of required) {
        const lowerReq = req.toLowerCase();
        if (possibleArgNames.includes(lowerReq)) {
          argName = req;
          return argName;
        }
        if (properties[req]?.type === 'string') {
          argName = req;
          return argName;
        }
      }
    }
    
    for (const name of possibleArgNames) {
      if (schemaProps.includes(name)) {
        argName = name;
        return argName;
      }
      const matchingProp = schemaProps.find((prop: string) => prop.toLowerCase() === name);
      if (matchingProp) {
        argName = matchingProp;
        return argName;
      }
    }
    
    for (const prop of schemaProps) {
      if (properties[prop]?.type === 'string') {
        argName = prop;
        return argName;
      }
    }
  }
  
  return argName;
}

// Helper function to get all tools from all enabled servers
async function getAllAvailableTools(servers: any[]) {
  const toolsByServer = [];
  
  for (const server of servers) {
    if (!server.enabled) continue;
    
    try {
      const headers = await buildAuthHeaders(server);
      
      const listToolsRequest = {
        jsonrpc: '2.0',
        method: 'tools/list',
        params: {},
        id: Date.now(),
      };

      const toolsResponse = await axios.post(server.url, listToolsRequest, { 
        headers,
        timeout: 10000 
      });
      
      if (toolsResponse.data?.result?.tools) {
        const tools = toolsResponse.data.result.tools;
        
        toolsByServer.push({
          serverId: server.id,
          serverName: server.name,
          serverUrl: server.url,
          tools: tools.map((tool: any) => {
            const primaryArg = getPrimaryArgumentName(tool.inputSchema);
            return {
              name: tool.name,
              description: tool.description || '',
              inputSchema: tool.inputSchema || {},
              primaryArgumentName: primaryArg
            };
          })
        });
      }
    } catch (error: any) {
      console.error(`❌ Failed to get tools from ${server.name}:`, error.message);
    }
  }
  
  return toolsByServer;
}

// Helper function to call LLM for orchestration decision
async function getOrchestrationDecision(userMessage: string, toolsByServer: any[], llmConfig: any, previousAttempts: any[] = []) {
  const toolsDescription = toolsByServer.map(serverTools => {
    const toolsList = serverTools.tools.map((t: any) => 
      `  - ${t.name}: ${t.description || 'No description'} [primary argument: "${t.primaryArgumentName}"]`
    ).join('\n');
    
    return `Server: ${serverTools.serverName} (ID: ${serverTools.serverId})\nTools:\n${toolsList}`;
  }).join('\n\n');

  const previousAttemptsText = previousAttempts.length > 0 
    ? `\n\nPrevious attempts:\n${previousAttempts.map((attempt, idx) => 
        `Attempt ${idx + 1}: Used tools [${attempt.toolCalls.map((tc: any) => tc.toolName).join(', ')}] - Result was insufficient`
      ).join('\n')}`
    : '';

  const systemPrompt = `You are an intelligent orchestrator for MCP (Model Context Protocol) servers. Your task is to analyze the user's question and decide which tools to call to answer it effectively.

Available MCP Servers and Tools:
${toolsDescription}${previousAttemptsText}

User's Question: ${userMessage}

Analyze the question and decide which tool(s) to call. You can call multiple tools from different servers if needed.

Respond ONLY with a valid JSON object in this exact format:
{
  "reasoning": "Brief explanation of why you chose these tools",
  "toolCalls": [
    {
      "serverId": "server_id_here",
      "serverName": "server_name_here",
      "toolName": "tool_name_here",
      "arguments": {
        "<primary_argument_name>": "the search query or parameters"
      }
    }
  ],
  "needsMoreInfo": false
}

IMPORTANT:
- If you need to call multiple tools, include them all in the toolCalls array
- Always use the exact serverId and toolName from the available tools
- Use the PRIMARY ARGUMENT NAME shown in brackets for each tool
- Set needsMoreInfo to false unless you truly cannot answer without additional tool calls`;

  try {
    let decision: string;
    
    if (llmConfig.provider === 'openai') {
      const endpoint = llmConfig.config.endpoint || 'https://api.openai.com/v1/chat/completions';
      
      const requestBody = {
        model: llmConfig.config.model || 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      };

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llmConfig.config.apiKey}`,
      };
      
      const response = await axios.post(endpoint, requestBody, { headers });
      decision = response.data.choices[0].message.content;
      
    } else if (llmConfig.provider === 'anthropic') {
      const endpoint = llmConfig.config.endpoint || 'https://api.anthropic.com/v1/messages';
      
      const requestBody = {
        model: llmConfig.config.model || 'claude-3-opus-20240229',
        messages: [
          { role: 'user', content: systemPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      };

      const headers = {
        'Content-Type': 'application/json',
        'x-api-key': llmConfig.config.apiKey,
        'anthropic-version': '2023-06-01',
      };
      
      const response = await axios.post(endpoint, requestBody, { headers });
      decision = response.data.content[0].text;
      
    } else {
      let endpoint = llmConfig.config.endpoint;
      
      if (!endpoint && llmConfig.provider === 'snowflake') {
        if (toolsByServer && toolsByServer.length > 0) {
          const firstServer = toolsByServer[0];
          const match = firstServer.serverUrl.match(/(https?:\/\/[^/]+)/);
          if (match) {
            const baseUrl = match[1];
            endpoint = `${baseUrl}/api/v2/cortex/inference:complete`;
          }
        }
        
        if (!endpoint) {
          throw new Error('Snowflake provider requires an endpoint');
        }
      } else if (!endpoint) {
        throw new Error(`${llmConfig.provider} provider requires an endpoint`);
      }
      
      const requestBody = {
        model: llmConfig.config.model || 'llama3-70b',
        messages: [
          { role: 'user', content: systemPrompt }
        ],
        options: {
          temperature: 0.3,
          max_tokens: 1000,
        }
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...llmConfig.config.headers,
      };

      if (llmConfig.config.apiKey) {
        headers.Authorization = `Bearer ${llmConfig.config.apiKey}`;
      }
      
      const response = await axios.post(endpoint, requestBody, { 
        headers,
        responseType: 'text',
        timeout: 60000
      });
      
      const responseText = response.data;
      const lines = responseText.split('\n');
      let fullContent = '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const jsonStr = line.substring(6);
            const data = JSON.parse(jsonStr);
            if (data.choices?.[0]?.delta?.content) {
              fullContent += data.choices[0].delta.content;
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      decision = fullContent || responseText;
    }

    let jsonStr = decision.trim();
    
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```\n?/g, '');
    }
    
    return JSON.parse(jsonStr);
    
  } catch (error: any) {
    console.error('❌ Failed to get orchestration decision:', error.message);
    throw new Error(`Orchestration decision failed: ${error.message}`);
  }
}

// Helper function to execute a tool call
async function executeToolCall(serverId: string, serverName: string, serverUrl: string, toolName: string, toolArguments: any, serverAuth: any, toolSchema: any = null) {
  const startTime = Date.now();
  const headers = await buildAuthHeaders({ id: serverId, auth: serverAuth, url: serverUrl });
  
  let adjustedArguments = { ...toolArguments };
  
  if (toolSchema && toolSchema.inputSchema) {
    const primaryArg = getPrimaryArgumentName(toolSchema.inputSchema);
    const possibleArgNames = ['text', 'query', 'message', 'input', 'prompt', 'question'];
    const hasCorrectArg = adjustedArguments[primaryArg] !== undefined;
    
    if (!hasCorrectArg) {
      for (const name of possibleArgNames) {
        if (adjustedArguments[name] !== undefined && name !== primaryArg) {
          adjustedArguments[primaryArg] = adjustedArguments[name];
          delete adjustedArguments[name];
          break;
        }
      }
    }
  }
  
  const toolCallRequest = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: adjustedArguments,
    },
    id: Date.now(),
  };

  try {
    const response = await axios.post(serverUrl, toolCallRequest, { 
      headers,
      timeout: 30000 
    });
    
    const endTime = Date.now();
    
    let responseText = '';
    
    if (response.data?.result) {
      const result = response.data.result;
      
      if (typeof result === 'string') {
        responseText = result;
      } else if (result.content) {
        if (Array.isArray(result.content)) {
          responseText = result.content.map((item: any) => {
            if (typeof item === 'string') return item;
            if (item.type === 'text') return item.text;
            return JSON.stringify(item, null, 2);
          }).join('\n\n');
        } else if (typeof result.content === 'string') {
          responseText = result.content;
        } else {
          responseText = JSON.stringify(result.content, null, 2);
        }
      } else {
        responseText = JSON.stringify(result, null, 2);
      }
    } else if (response.data?.error) {
      responseText = `Error: ${response.data.error.message || JSON.stringify(response.data.error)}`;
    } else {
      responseText = 'No response from tool';
    }
    
    return {
      serverId,
      serverName,
      toolName,
      responseText,
      executionTime: endTime - startTime,
      success: true,
      rawResponse: response.data
    };
    
  } catch (error: any) {
    console.error(`❌ Tool ${toolName} failed:`, error.message);
    return {
      serverId,
      serverName,
      toolName,
      responseText: `Error: ${error.message}`,
      executionTime: Date.now() - startTime,
      success: false,
      error: error.message
    };
  }
}

// Helper function to aggregate responses with LLM
async function aggregateResponses(userMessage: string, toolResults: any[], llmConfig: any, toolsByServer: any[] = []) {
  const resultsText = toolResults.map(result => 
    `### Response from ${result.serverName} - ${result.toolName}\n${result.success ? result.responseText : `Error: ${result.error}`}`
  ).join('\n\n---\n\n');

  const systemPrompt = `You are an intelligent assistant that synthesizes information from multiple sources to provide comprehensive answers.

User's Question: ${userMessage}

I've gathered information from multiple MCP servers and tools:

${resultsText}

Your task:
1. Analyze all the information provided
2. Synthesize it into a clear, comprehensive, and well-structured response
3. Address the user's question directly
4. If there are errors or missing information, acknowledge them appropriately
5. Present the information in a natural, conversational way

Provide a helpful response that best answers the user's question using all available information.`;

  try {
    const startTime = Date.now();
    let aggregatedResponse: string;
    
    if (llmConfig.provider === 'openai') {
      const endpoint = llmConfig.config.endpoint || 'https://api.openai.com/v1/chat/completions';
      
      const requestBody = {
        model: llmConfig.config.model || 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt }
        ],
        temperature: llmConfig.config.temperature || 0.7,
        max_tokens: llmConfig.config.maxTokens || 2000,
      };

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llmConfig.config.apiKey}`,
      };

      const response = await axios.post(endpoint, requestBody, { headers });
      aggregatedResponse = response.data.choices[0].message.content;
      
    } else if (llmConfig.provider === 'anthropic') {
      const endpoint = llmConfig.config.endpoint || 'https://api.anthropic.com/v1/messages';
      
      const requestBody = {
        model: llmConfig.config.model || 'claude-3-opus-20240229',
        messages: [
          { role: 'user', content: systemPrompt }
        ],
        temperature: llmConfig.config.temperature || 0.7,
        max_tokens: llmConfig.config.maxTokens || 2000,
      };

      const headers = {
        'Content-Type': 'application/json',
        'x-api-key': llmConfig.config.apiKey,
        'anthropic-version': '2023-06-01',
      };

      const response = await axios.post(endpoint, requestBody, { headers });
      aggregatedResponse = response.data.content[0].text;
      
    } else {
      let endpoint = llmConfig.config.endpoint;
      
      if (!endpoint && llmConfig.provider === 'snowflake') {
        if (toolResults && toolResults.length > 0) {
          const successResult = toolResults.find((r: any) => r.success);
          if (successResult && toolsByServer) {
            const serverInfo = toolsByServer.find((s: any) => s.serverId === successResult.serverId);
            if (serverInfo) {
              const match = serverInfo.serverUrl.match(/(https?:\/\/[^/]+)/);
              if (match) {
                const baseUrl = match[1];
                endpoint = `${baseUrl}/api/v2/cortex/inference:complete`;
              }
            }
          }
        }
        
        if (!endpoint) {
          return {
            response: resultsText,
            aggregationTime: 0,
            error: 'Could not construct Snowflake endpoint for aggregation'
          };
        }
      } else if (!endpoint) {
        return {
          response: resultsText,
          aggregationTime: 0,
          error: `No endpoint configured for ${llmConfig.provider}`
        };
      }
      
      const requestBody = {
        model: llmConfig.config.model || 'llama3-70b',
        messages: [
          { role: 'user', content: systemPrompt }
        ],
        options: {
          temperature: llmConfig.config.temperature || 0.7,
          max_tokens: llmConfig.config.maxTokens || 2000,
        }
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...llmConfig.config.headers,
      };

      if (llmConfig.config.apiKey) {
        headers.Authorization = `Bearer ${llmConfig.config.apiKey}`;
      }

      const response = await axios.post(endpoint, requestBody, { 
        headers,
        responseType: 'text',
        timeout: 60000
      });
      
      const responseText = response.data;
      const lines = responseText.split('\n');
      let fullContent = '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const jsonStr = line.substring(6);
            const data = JSON.parse(jsonStr);
            if (data.choices?.[0]?.delta?.content) {
              fullContent += data.choices[0].delta.content;
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      aggregatedResponse = fullContent || responseText;
    }
    
    const endTime = Date.now();
    
    return {
      response: aggregatedResponse,
      aggregationTime: endTime - startTime
    };
    
  } catch (error: any) {
    console.error('❌ Failed to aggregate responses:', error.message);
    return {
      response: resultsText,
      aggregationTime: 0,
      error: 'Failed to aggregate with LLM, returning raw results'
    };
  }
}

export function createServer(port: number) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // MCP Chat endpoint
  app.post('/api/chat', async (req, res) => {
    const startTime = Date.now();
    let mcpStartTime: number | undefined, mcpEndTime: number | undefined, llmStartTime: number | undefined, llmEndTime: number | undefined;
    
    try {
      const { message, server, llmConfig } = req.body;

      if (!server || !server.url) {
        return res.status(400).json({ error: 'Server configuration is required' });
      }

      console.log(`\n📨 Received message for ${server.name}:`, message);

      if (!conversationContexts.has(server.id)) {
        conversationContexts.set(server.id, []);
      }

      const context = conversationContexts.get(server.id)!;
      context.push({ role: 'user', content: message });

      const headers = await buildAuthHeaders(server);

      try {
        mcpStartTime = Date.now();
        
        const listToolsRequest = {
          jsonrpc: '2.0',
          method: 'tools/list',
          params: {},
          id: Date.now(),
        };

        const toolsResponse = await axios.post(server.url, listToolsRequest, { headers });

        if (toolsResponse.data && toolsResponse.data.result && toolsResponse.data.result.tools) {
          const tools = toolsResponse.data.result.tools;

          const searchTool = tools.find((t: any) => 
            t.name.toLowerCase().includes('search') || 
            t.name.toLowerCase().includes('query') ||
            t.name.toLowerCase().includes('manuales')
          ) || tools[0];

          const argName = getPrimaryArgumentName(searchTool.inputSchema);

          const toolCallRequest = {
            jsonrpc: '2.0',
            method: 'tools/call',
            params: {
              name: searchTool.name,
              arguments: {
                [argName]: message,
              },
            },
            id: Date.now() + 1,
          };

          const toolResponse = await axios.post(server.url, toolCallRequest, { headers });
          mcpEndTime = Date.now();

          let responseText = '';

          if (toolResponse.data && toolResponse.data.result) {
            const result = toolResponse.data.result;
            
            if (typeof result === 'string') {
              responseText = result;
            } else if (result.content) {
              if (Array.isArray(result.content)) {
                responseText = result.content.map((item: any) => {
                  if (typeof item === 'string') return item;
                  if (item.type === 'text') return item.text;
                  return JSON.stringify(item, null, 2);
                }).join('\n\n');
              } else if (typeof result.content === 'string') {
                responseText = result.content;
              } else {
                responseText = JSON.stringify(result.content, null, 2);
              }
            } else if (result.results) {
              responseText = Array.isArray(result.results) 
                ? result.results.map((r: any, idx: number) => {
                    if (typeof r === 'string') return r;
                    return `📄 Resultado ${idx + 1}:\n${JSON.stringify(r, null, 2)}`;
                  }).join('\n\n')
                : JSON.stringify(result.results, null, 2);
            } else {
              responseText = JSON.stringify(result, null, 2);
            }
          } else if (toolResponse.data && toolResponse.data.error) {
            responseText = `Error: ${toolResponse.data.error.message || JSON.stringify(toolResponse.data.error)}`;
          } else {
            responseText = 'No response from server';
          }

          let finalResponse = responseText;
          if (llmConfig && llmConfig.enabled) {
            try {
              llmStartTime = Date.now();
              finalResponse = await enhanceWithLLM(responseText, message, llmConfig, server);
              llmEndTime = Date.now();
            } catch (llmError) {
              console.error('❌ LLM Enhancement failed');
            }
          }

          context.push({ role: 'assistant', content: finalResponse });

          if (context.length > 20) {
            conversationContexts.set(server.id, context.slice(-20));
          }

          const totalTime = Date.now() - startTime;

          const metadata = {
            timings: {
              mcpTime: mcpEndTime! - mcpStartTime,
              llmTime: llmEndTime && llmStartTime ? llmEndTime - llmStartTime : undefined,
              totalTime: totalTime
            },
            mcpRequest: {
              method: toolCallRequest.method,
              params: toolCallRequest.params,
              tool: searchTool.name,
              query: message,
              fullRequest: toolCallRequest
            },
            mcpResponse: {
              rawResponse: responseText,
              length: responseText.length,
              enhanced: llmConfig && llmConfig.enabled,
              toolResponse: toolResponse.data
            }
          };

          if (llmConfig && llmConfig.enabled) {
            (metadata as any).llmRequest = {
              provider: llmConfig.provider,
              model: llmConfig.config.model,
              endpoint: llmConfig.config.endpoint,
              temperature: llmConfig.config.temperature,
              maxTokens: llmConfig.config.maxTokens
            };
            (metadata as any).llmResponse = {
              enhancedResponse: finalResponse,
              length: finalResponse.length
            };
          }

          res.json({ 
            response: finalResponse,
            metadata: metadata,
            timings: metadata.timings,
            mcpRequest: metadata.mcpRequest,
            mcpResponse: metadata.mcpResponse
          });
        } else {
          throw new Error('No tools available');
        }
      } catch (mcpError: any) {
        console.error('❌ MCP request failed:', mcpError.message);
        
        try {
          if (!mcpStartTime) mcpStartTime = Date.now();
          
          const listResourcesRequest = {
            jsonrpc: '2.0',
            method: 'resources/list',
            params: {},
            id: Date.now(),
          };

          const resourcesResponse = await axios.post(server.url, listResourcesRequest, { headers });
          mcpEndTime = Date.now();

          if (resourcesResponse.data && resourcesResponse.data.result && resourcesResponse.data.result.resources) {
            const resources = resourcesResponse.data.result.resources;
            let responseText = `Found ${resources.length} resources:\n\n`;
            
            resources.slice(0, 5).forEach((resource: any, idx: number) => {
              responseText += `${idx + 1}. ${resource.name || resource.uri}\n`;
              if (resource.description) responseText += `   ${resource.description}\n`;
            });

            let finalResponse = responseText;
            if (llmConfig && llmConfig.enabled) {
              llmStartTime = Date.now();
              finalResponse = await enhanceWithLLM(responseText, message, llmConfig, server);
              llmEndTime = Date.now();
            }

            const totalTime = Date.now() - startTime;

            const metadata = {
              timings: {
                mcpTime: mcpEndTime - mcpStartTime,
                llmTime: llmEndTime && llmStartTime ? llmEndTime - llmStartTime : undefined,
                totalTime: totalTime
              },
              mcpRequest: {
                method: 'resources/list',
                query: message,
                fullRequest: listResourcesRequest
              },
              mcpResponse: {
                rawResponse: responseText,
                length: responseText.length,
                enhanced: llmConfig && llmConfig.enabled,
                resourcesResponse: resourcesResponse.data
              }
            };

            if (llmConfig && llmConfig.enabled) {
              (metadata as any).llmRequest = {
                provider: llmConfig.provider,
                model: llmConfig.config.model,
                endpoint: llmConfig.config.endpoint,
                temperature: llmConfig.config.temperature,
                maxTokens: llmConfig.config.maxTokens
              };
              (metadata as any).llmResponse = {
                enhancedResponse: finalResponse,
                length: finalResponse.length
              };
            }

            context.push({ role: 'assistant', content: finalResponse });
            res.json({ 
              response: finalResponse,
              metadata: metadata,
              timings: metadata.timings,
              mcpRequest: metadata.mcpRequest,
              mcpResponse: metadata.mcpResponse
            });
          } else {
            throw new Error('No resources available');
          }
        } catch (fallbackError) {
          throw mcpError;
        }
      }

    } catch (error: any) {
      console.error('❌ Error in chat endpoint:', error.message);
      
      const errorMessage = error.response?.data?.error 
        || error.response?.data?.message 
        || error.message 
        || 'Failed to communicate with MCP server';
      
      res.status(500).json({ 
        error: errorMessage,
        details: error.response?.data || error.message,
      });
    }
  });

  // Test endpoint
  app.post('/api/test-server', async (req, res) => {
    try {
      const { server } = req.body;

      if (!server || !server.url) {
        return res.status(400).json({ error: 'Server configuration is required' });
      }

      const headers = await buildAuthHeaders(server);
      
      const response = await axios.get(server.url, { headers, timeout: 5000 });
      
      res.json({ 
        success: true, 
        message: 'Server is accessible',
        data: response.data,
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false,
        error: error.message,
      });
    }
  });

  // Clear conversation context
  app.post('/api/clear-context', (req, res) => {
    const { serverId } = req.body;
    
    if (serverId) {
      conversationContexts.delete(serverId);
    } else {
      conversationContexts.clear();
    }
    
    res.json({ success: true });
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Orchestrated Chat endpoint
  app.post('/api/orchestrated-chat', async (req, res) => {
    const startTime = Date.now();
    const MAX_RETRIES = 3;
    
    try {
      const { message, servers, llmConfig } = req.body;

      if (!servers || servers.length === 0) {
        return res.status(400).json({ error: 'At least one server is required' });
      }

      if (!llmConfig || !llmConfig.enabled) {
        return res.status(400).json({ error: 'LLM configuration is required for orchestration' });
      }

      const toolsByServer = await getAllAvailableTools(servers);
      
      if (toolsByServer.length === 0) {
        return res.status(400).json({ error: 'No tools available from any server' });
      }

      const allToolResults: any[] = [];
      const attemptHistory: any[] = [];
      let finalResponse: string | null = null;
      let attempt = 0;

      while (attempt < MAX_RETRIES && !finalResponse) {
        attempt++;

        const decision = await getOrchestrationDecision(
          message, 
          toolsByServer, 
          llmConfig, 
          attemptHistory
        );

        if (!decision.toolCalls || decision.toolCalls.length === 0) {
          break;
        }

        const toolCallPromises = decision.toolCalls.map((toolCall: any) => {
          const serverInfo = toolsByServer.find(s => s.serverId === toolCall.serverId);
          if (!serverInfo) {
            return Promise.resolve({
              serverId: toolCall.serverId,
              serverName: toolCall.serverName,
              toolName: toolCall.toolName,
              responseText: 'Error: Server not found',
              success: false,
              error: 'Server not found'
            });
          }

          const server = servers.find((s: any) => s.id === toolCall.serverId);
          const toolSchema = serverInfo.tools.find((t: any) => t.name === toolCall.toolName);
          
          return executeToolCall(
            toolCall.serverId,
            toolCall.serverName,
            serverInfo.serverUrl,
            toolCall.toolName,
            toolCall.arguments,
            server.auth,
            toolSchema
          );
        });

        const toolResults = await Promise.all(toolCallPromises);
        allToolResults.push(...toolResults);

        const hasSuccessfulResults = toolResults.some((r: any) => r.success);
        
        if (decision.needsMoreInfo && attempt < MAX_RETRIES && hasSuccessfulResults) {
          const successRate = toolResults.filter((r: any) => r.success).length / toolResults.length;
          if (successRate < 0.5) {
            attemptHistory.push({
              toolCalls: decision.toolCalls,
              results: toolResults
            });
            continue;
          }
        }

        if (!hasSuccessfulResults && attempt < MAX_RETRIES) {
          attemptHistory.push({
            toolCalls: decision.toolCalls,
            results: toolResults
          });
          continue;
        }

        try {
          const aggregation = await aggregateResponses(message, toolResults, llmConfig, toolsByServer);
          finalResponse = aggregation.response;
        } catch (aggError) {
          finalResponse = toolResults
            .filter((r: any) => r.success)
            .map((r: any) => `### ${r.serverName} - ${r.toolName}\n\n${r.responseText}`)
            .join('\n\n---\n\n');
        }
        
        break;
      }

      if (!finalResponse) {
        if (allToolResults.length > 0) {
          const partialResponse = allToolResults
            .filter((r: any) => r.success)
            .map((r: any) => `### ${r.serverName} - ${r.toolName}\n\n${r.responseText}`)
            .join('\n\n---\n\n');
          
          if (partialResponse) {
            const metadata = {
              orchestration: {
                attempts: attempt,
                totalToolCalls: allToolResults.length,
                serversUsed: [...new Set(allToolResults.map((r: any) => r.serverName))],
                partial: true,
                warning: 'Response generated from partial results'
              },
              toolResults: allToolResults.map((result: any) => ({
                server: result.serverName,
                tool: result.toolName,
                executionTime: result.executionTime,
                success: result.success,
                response: result.responseText.substring(0, 500),
              })),
              timings: {
                totalTime: Date.now() - startTime,
                averageToolTime: allToolResults.reduce((sum: number, r: any) => sum + r.executionTime, 0) / allToolResults.length,
              }
            };
            
            return res.json({
              response: partialResponse,
              metadata,
              orchestrated: true
            });
          }
        }
        
        return res.status(500).json({ 
          error: 'Failed to generate response after maximum retries',
          attempts: attempt,
          toolResults: allToolResults.length,
          details: 'No successful tool results to return'
        });
      }

      const totalTime = Date.now() - startTime;

      const metadata = {
        orchestration: {
          attempts: attempt,
          totalToolCalls: allToolResults.length,
          serversUsed: [...new Set(allToolResults.map((r: any) => r.serverName))],
        },
        toolResults: allToolResults.map((result: any) => ({
          server: result.serverName,
          tool: result.toolName,
          executionTime: result.executionTime,
          success: result.success,
          response: result.responseText.substring(0, 500),
        })),
        timings: {
          totalTime,
          averageToolTime: allToolResults.reduce((sum: number, r: any) => sum + r.executionTime, 0) / allToolResults.length,
        }
      };

      res.json({
        response: finalResponse,
        metadata,
        orchestrated: true
      });

    } catch (error: any) {
      console.error('❌ Orchestration failed:', error);
      res.status(500).json({ 
        error: error.message || 'Orchestration failed',
        details: error.response?.data || error.message
      });
    }
  });

  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`\n🚀 MCPeer Server running on port ${port}`);
      resolve(server);
    }).on('error', reject);
  });
}
