import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Store conversation context per server
const conversationContexts = new Map();

// Store OAuth tokens
const oauthTokens = new Map();

// Helper function to build authentication headers
async function buildAuthHeaders(server) {
  const headers = {
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
        } catch (error) {
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
async function enhanceWithLLM(mcpResponse, userMessage, llmConfig, server) {
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
      // Extract base URL from server if available
      let baseUrl = 'https://your-account.snowflakecomputing.com';
      
      if (server?.url) {
        const match = server.url.match(/(https?:\/\/[^/]+)/);
        if (match) {
          baseUrl = match[1];
        }
      }
      
      // Use the Cortex REST API endpoint
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

      const headers = {
        'Content-Type': 'application/json',
        ...llmConfig.config.headers,
      };

      // If LLM has its own API key, use it; otherwise try to use server's auth
      if (llmConfig.config.apiKey) {
        headers.Authorization = `Bearer ${llmConfig.config.apiKey}`;
      } else if (server.auth?.bearerToken) {
        headers.Authorization = `Bearer ${server.auth.bearerToken}`;
      }

      console.log('📡 Calling Snowflake Cortex REST API:', endpoint);
      console.log('🔑 Using model:', model);
      console.log('📨 Request body:', JSON.stringify(requestBody, null, 2).substring(0, 500));
      
      const response = await axios.post(endpoint, requestBody, { 
        headers,
        responseType: 'text' // Get raw text to parse SSE format
      });
      
      console.log('✅ Snowflake Cortex response status:', response.status);
      
      // Snowflake Cortex returns Server-Sent Events (SSE) format
      // Parse the SSE stream and combine all content deltas
      const responseText = response.data;
      const lines = responseText.split('\n');
      let fullContent = '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const jsonStr = line.substring(6); // Remove "data: " prefix
            const data = JSON.parse(jsonStr);
            
            // Extract content from delta
            if (data.choices && data.choices[0] && data.choices[0].delta) {
              const delta = data.choices[0].delta;
              if (delta.content) {
                fullContent += delta.content;
              } else if (delta.text) {
                fullContent += delta.text;
              }
            }
            
            // Also check for messages format
            if (data.choices && data.choices[0] && data.choices[0].messages) {
              const messages = data.choices[0].messages;
              if (Array.isArray(messages)) {
                messages.forEach(msg => {
                  if (msg.content) fullContent += msg.content;
                });
              }
            }
          } catch (e) {
            // Skip invalid JSON lines
            continue;
          }
        }
      }
      
      if (fullContent) {
        console.log('✅ Combined SSE response:', fullContent.substring(0, 200) + '...');
        return fullContent;
      }
      
      console.log('⚠️  Could not parse SSE response, returning raw data');
      return responseText;

    } else if (llmConfig.provider === 'openai') {
      // OpenAI API
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

      console.log('📡 Calling OpenAI:', endpoint);
      const response = await axios.post(endpoint, requestBody, { headers });
      
      return response.data.choices[0].message.content;

    } else if (llmConfig.provider === 'anthropic') {
      // Anthropic Claude API
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

      console.log('📡 Calling Anthropic:', endpoint);
      const response = await axios.post(endpoint, requestBody, { headers });
      
      return response.data.content[0].text;

    } else if (llmConfig.provider === 'other') {
      // Other provider - generic OpenAI-compatible API
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

      const headers = {
        'Content-Type': 'application/json',
        ...llmConfig.config.headers,
      };

      // Add authorization if API key is provided
      if (llmConfig.config.apiKey && !headers.Authorization) {
        headers.Authorization = `Bearer ${llmConfig.config.apiKey}`;
      }

      console.log('📡 Calling other provider:', endpoint);
      const response = await axios.post(endpoint, requestBody, { headers });
      
      // Try to extract response from common formats
      return response.data.choices?.[0]?.message?.content || 
             response.data.message?.content ||
             response.data.content ||
             response.data.response ||
             JSON.stringify(response.data);

    } else {
      // Custom LLM endpoint
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

      const headers = {
        'Content-Type': 'application/json',
        ...llmConfig.config.headers,
      };

      console.log('📡 Calling custom LLM:', endpoint);
      const response = await axios.post(endpoint, requestBody, { headers });
      
      return response.data.response || response.data.text || JSON.stringify(response.data);
    }
  } catch (error) {
    console.error('❌ LLM enhancement failed:', error.response?.data || error.message);
    console.log('⚠️  Returning original MCP response');
    return mcpResponse; // Fallback to original response
  }
}

// MCP Chat endpoint
app.post('/api/chat', async (req, res) => {
  const startTime = Date.now();
  let mcpStartTime, mcpEndTime, llmStartTime, llmEndTime;
  
  try {
    const { message, server, llmConfig } = req.body;

    if (!server || !server.url) {
      return res.status(400).json({ error: 'Server configuration is required' });
    }

    console.log(`\n📨 Received message for ${server.name}:`, message);
    console.log(`🔗 Server URL:`, server.url);
    console.log(`🤖 LLM Enhancement:`, llmConfig ? `${llmConfig.name} (${llmConfig.provider})` : 'None');
    console.log(`🔧 LLM Enabled:`, llmConfig?.enabled);

    // Get or initialize conversation context for this server
    if (!conversationContexts.has(server.id)) {
      conversationContexts.set(server.id, []);
    }

    const context = conversationContexts.get(server.id);
    context.push({ role: 'user', content: message });

    // Prepare headers using the auth configuration
    const headers = await buildAuthHeaders(server);

    console.log('📡 Making request to MCP server...');
    console.log('🔐 Auth method:', server.auth?.method || 'none');

    // MCP servers use JSON-RPC 2.0 protocol
    // First, let's try to list available tools
    try {
      mcpStartTime = Date.now();
      
      const listToolsRequest = {
        jsonrpc: '2.0',
        method: 'tools/list',
        params: {},
        id: Date.now(),
      };

      console.log('📋 Listing available tools...');
      const toolsResponse = await axios.post(server.url, listToolsRequest, { headers });
      
      console.log('🔧 Available tools:', JSON.stringify(toolsResponse.data, null, 2));

      // Check if we got tools
      if (toolsResponse.data && toolsResponse.data.result && toolsResponse.data.result.tools) {
        const tools = toolsResponse.data.result.tools;
        console.log(`✅ Found ${tools.length} tools`);

        // Use the first available tool to search/query
        // Most MCP servers have a search or query tool
        const searchTool = tools.find(t => 
          t.name.toLowerCase().includes('search') || 
          t.name.toLowerCase().includes('query') ||
          t.name.toLowerCase().includes('manuales')
        ) || tools[0];

        console.log(`🎯 Using tool: ${searchTool.name}`);
        console.log(`📋 Tool schema:`, JSON.stringify(searchTool.inputSchema, null, 2));

        // Determine the correct argument name from the tool's input schema
        const argName = getPrimaryArgumentName(searchTool.inputSchema);
        console.log(`📤 Using argument name: "${argName}" with value: "${message}"`);

        // Call the tool with the user's message
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

        console.log('🚀 Calling tool with message...');
        const toolResponse = await axios.post(server.url, toolCallRequest, { headers });
        mcpEndTime = Date.now();
        
        console.log('✅ Tool response:', JSON.stringify(toolResponse.data, null, 2));
        console.log(`⏱️  MCP Response time: ${mcpEndTime - mcpStartTime}ms`);

        let responseText = '';

        if (toolResponse.data && toolResponse.data.result) {
          const result = toolResponse.data.result;
          
          // Parse different response formats
          if (typeof result === 'string') {
            responseText = result;
          } else if (result.content) {
            // MCP standard content format
            if (Array.isArray(result.content)) {
              responseText = result.content.map(item => {
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
            // Search results format
            responseText = Array.isArray(result.results) 
              ? result.results.map((r, idx) => {
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

        // Enhance with LLM if configured
        let finalResponse = responseText;
        if (llmConfig && llmConfig.enabled) {
          console.log('🎯 Starting LLM enhancement...');
          console.log('📦 MCP Response length:', responseText.length, 'chars');
          try {
            llmStartTime = Date.now();
            finalResponse = await enhanceWithLLM(responseText, message, llmConfig, server);
            llmEndTime = Date.now();
            console.log('✨ Response enhanced with AI');
            console.log('📤 Enhanced response length:', finalResponse.length, 'chars');
            console.log(`⏱️  LLM Response time: ${llmEndTime - llmStartTime}ms`);
          } catch (llmError) {
            console.error('❌ LLM Enhancement failed:', llmError.message);
            console.log('⚠️  Returning original MCP response');
            // Keep original response if LLM fails
          }
        } else {
          console.log('⏭️  Skipping LLM enhancement (not configured or disabled)');
        }

        // Add to context
        context.push({ role: 'assistant', content: finalResponse });

        // Keep only last 20 messages
        if (context.length > 20) {
          conversationContexts.set(server.id, context.slice(-20));
        }

        const totalTime = Date.now() - startTime;
        console.log(`⏱️  Total request time: ${totalTime}ms`);

        // Build metadata for debugging
        const metadata = {
          timings: {
            mcpTime: mcpEndTime - mcpStartTime,
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

        // Add LLM info if used
        if (llmConfig && llmConfig.enabled) {
          metadata.llmRequest = {
            provider: llmConfig.provider,
            model: llmConfig.config.model,
            endpoint: llmConfig.config.endpoint,
            temperature: llmConfig.config.temperature,
            maxTokens: llmConfig.config.maxTokens
          };
          metadata.llmResponse = {
            enhancedResponse: finalResponse,
            length: finalResponse.length
          };
        }

        res.json({ 
          response: finalResponse,
          metadata: metadata,
          // Legacy fields for backwards compatibility
          timings: metadata.timings,
          mcpRequest: metadata.mcpRequest,
          mcpResponse: metadata.mcpResponse
        });
      } else {
        // If no tools available, try direct query
        console.log('⚠️  No tools found, trying direct query...');
        throw new Error('No tools available');
      }
    } catch (mcpError) {
      console.error('❌ MCP request failed:', mcpError.response?.data || mcpError.message);
      
      // Try resources/list as fallback
      try {
        console.log('🔄 Trying resources/list...');
        if (!mcpStartTime) mcpStartTime = Date.now();
        
        const listResourcesRequest = {
          jsonrpc: '2.0',
          method: 'resources/list',
          params: {},
          id: Date.now(),
        };

        const resourcesResponse = await axios.post(server.url, listResourcesRequest, { headers });
        mcpEndTime = Date.now();
        
        console.log('📚 Resources:', JSON.stringify(resourcesResponse.data, null, 2));
        console.log(`⏱️  MCP Response time: ${mcpEndTime - mcpStartTime}ms`);

        // If we have resources, try to read them
        if (resourcesResponse.data && resourcesResponse.data.result && resourcesResponse.data.result.resources) {
          const resources = resourcesResponse.data.result.resources;
          let responseText = `Found ${resources.length} resources:\n\n`;
          
          resources.slice(0, 5).forEach((resource, idx) => {
            responseText += `${idx + 1}. ${resource.name || resource.uri}\n`;
            if (resource.description) responseText += `   ${resource.description}\n`;
          });

          // Enhance with LLM if configured
          let finalResponse = responseText;
          if (llmConfig && llmConfig.enabled) {
            llmStartTime = Date.now();
            finalResponse = await enhanceWithLLM(responseText, message, llmConfig, server);
            llmEndTime = Date.now();
            console.log(`⏱️  LLM Response time: ${llmEndTime - llmStartTime}ms`);
          }

          const totalTime = Date.now() - startTime;
          console.log(`⏱️  Total request time: ${totalTime}ms`);

          // Build metadata for debugging
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

          // Add LLM info if used
          if (llmConfig && llmConfig.enabled) {
            metadata.llmRequest = {
              provider: llmConfig.provider,
              model: llmConfig.config.model,
              endpoint: llmConfig.config.endpoint,
              temperature: llmConfig.config.temperature,
              maxTokens: llmConfig.config.maxTokens
            };
            metadata.llmResponse = {
              enhancedResponse: finalResponse,
              length: finalResponse.length
            };
          }

          context.push({ role: 'assistant', content: finalResponse });
          res.json({ 
            response: finalResponse,
            metadata: metadata,
            // Legacy fields for backwards compatibility
            timings: metadata.timings,
            mcpRequest: metadata.mcpRequest,
            mcpResponse: metadata.mcpResponse
          });
        } else {
          throw new Error('No resources available');
        }
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError.response?.data || fallbackError.message);
        throw mcpError; // Throw original error
      }
    }

  } catch (error) {
    console.error('❌ Error in chat endpoint:', error.response?.data || error.message);
    
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

// Test endpoint to verify server configuration
app.post('/api/test-server', async (req, res) => {
  try {
    const { server } = req.body;

    if (!server || !server.url) {
      return res.status(400).json({ error: 'Server configuration is required' });
    }

    const headers = await buildAuthHeaders(server);

    console.log('🧪 Testing server:', server.name);
    console.log('🔐 Auth method:', server.auth?.method || 'none');
    
    const response = await axios.get(server.url, { headers, timeout: 5000 });
    
    res.json({ 
      success: true, 
      message: 'Server is accessible',
      data: response.data,
    });
  } catch (error) {
    console.error('❌ Server test failed:', error.message);
    res.status(500).json({ 
      success: false,
      error: error.message,
    });
  }
});

// Clear conversation context for a server
app.post('/api/clear-context', (req, res) => {
  const { serverId } = req.body;
  
  if (serverId) {
    conversationContexts.delete(serverId);
    console.log(`🧹 Cleared context for server: ${serverId}`);
  } else {
    conversationContexts.clear();
    console.log('🧹 Cleared all conversation contexts');
  }
  
  res.json({ success: true });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Helper function to determine the primary argument name from a tool's schema
function getPrimaryArgumentName(inputSchema) {
  const possibleArgNames = ['text', 'query', 'message', 'input', 'prompt', 'question'];
  let argName = 'query'; // default
  
  if (!inputSchema) {
    console.log('⚠️  No inputSchema provided, using default: query');
    return argName;
  }
  
  // Handle both 'properties' and direct schema format
  const properties = inputSchema.properties || inputSchema;
  
  if (properties && typeof properties === 'object') {
    const schemaProps = Object.keys(properties);
    console.log('📋 Available schema properties:', schemaProps);
    
    // Check for required fields first (case-insensitive)
    const required = inputSchema.required || [];
    if (required.length > 0) {
      console.log('📋 Required fields:', required);
      for (const req of required) {
        // Check if this required field matches one of our possible names (case-insensitive)
        const lowerReq = req.toLowerCase();
        if (possibleArgNames.includes(lowerReq)) {
          argName = req; // Use the exact casing from the schema
          console.log(`✅ Found required text argument: ${argName}`);
          return argName;
        }
        // Also check if it's a string type
        if (properties[req]?.type === 'string') {
          argName = req;
          console.log(`✅ Found required string argument: ${argName}`);
          return argName;
        }
      }
    }
    
    // If no required field found, check for common text parameter names (case-insensitive)
    for (const name of possibleArgNames) {
      // Check exact match first
      if (schemaProps.includes(name)) {
        argName = name;
        console.log(`✅ Found exact match argument: ${argName}`);
        return argName;
      }
      // Check case-insensitive match
      const matchingProp = schemaProps.find(prop => prop.toLowerCase() === name);
      if (matchingProp) {
        argName = matchingProp; // Use the exact casing from the schema
        console.log(`✅ Found case-insensitive match argument: ${argName}`);
        return argName;
      }
    }
    
    // Last resort: use the first string property
    for (const prop of schemaProps) {
      if (properties[prop]?.type === 'string') {
        argName = prop;
        console.log(`✅ Using first string property: ${argName}`);
        return argName;
      }
    }
  }
  
  console.log(`⚠️  No suitable argument found, using default: ${argName}`);
  return argName;
}

// Helper function to get all tools from all enabled servers
async function getAllAvailableTools(servers) {
  const toolsByServer = [];
  
  for (const server of servers) {
    if (!server.enabled) continue;
    
    try {
      console.log(`📋 Getting tools from ${server.name}...`);
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
        console.log(`✅ Found ${tools.length} tools in ${server.name}`);
        
        toolsByServer.push({
          serverId: server.id,
          serverName: server.name,
          serverUrl: server.url,
          tools: tools.map(tool => {
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
    } catch (error) {
      console.error(`❌ Failed to get tools from ${server.name}:`, error.message);
    }
  }
  
  return toolsByServer;
}

// Helper function to call LLM for orchestration decision
async function getOrchestrationDecision(userMessage, toolsByServer, llmConfig, previousAttempts = []) {
  console.log('\n🧠 Asking LLM for orchestration decision...');
  console.log('🤖 LLM Provider:', llmConfig.provider);
  console.log('🤖 LLM Model:', llmConfig.config.model);
  console.log('🤖 LLM Endpoint:', llmConfig.config.endpoint || 'default');
  
  const toolsDescription = toolsByServer.map(serverTools => {
    const toolsList = serverTools.tools.map(t => 
      `  - ${t.name}: ${t.description || 'No description'} [primary argument: "${t.primaryArgumentName}"]`
    ).join('\n');
    
    return `Server: ${serverTools.serverName} (ID: ${serverTools.serverId})\nTools:\n${toolsList}`;
  }).join('\n\n');
  
  console.log('📋 Available tools:\n', toolsDescription);

  const previousAttemptsText = previousAttempts.length > 0 
    ? `\n\nPrevious attempts:\n${previousAttempts.map((attempt, idx) => 
        `Attempt ${idx + 1}: Used tools [${attempt.toolCalls.map(tc => tc.toolName).join(', ')}] - Result was insufficient`
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
- Use the PRIMARY ARGUMENT NAME shown in brackets for each tool (e.g., "text", "query", etc.) - this is CRITICAL!
- Set needsMoreInfo to false unless you truly cannot answer without additional tool calls
- Be comprehensive in your first attempt - select ALL relevant tools at once
- Even if the results might be partial, we can still provide a useful answer`;

  try {
    let decision;
    
    if (llmConfig.provider === 'openai') {
      const endpoint = llmConfig.config.endpoint || 'https://api.openai.com/v1/chat/completions';
      
      console.log('📡 Calling OpenAI:', endpoint);
      
      const requestBody = {
        model: llmConfig.config.model || 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt }
        ],
        temperature: 0.3, // Lower temperature for more deterministic decisions
        max_tokens: 1000,
      };

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llmConfig.config.apiKey}`,
      };

      console.log('📤 Request:', { model: requestBody.model, temperature: requestBody.temperature });
      
      const response = await axios.post(endpoint, requestBody, { headers });
      
      console.log('📥 OpenAI Response status:', response.status);
      
      decision = response.data.choices[0].message.content;
      
    } else if (llmConfig.provider === 'anthropic') {
      const endpoint = llmConfig.config.endpoint || 'https://api.anthropic.com/v1/messages';
      
      console.log('📡 Calling Anthropic:', endpoint);
      
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

      console.log('📤 Request:', { model: requestBody.model, temperature: requestBody.temperature });
      
      const response = await axios.post(endpoint, requestBody, { headers });
      
      console.log('📥 Anthropic Response status:', response.status);
      
      decision = response.data.content[0].text;
      
    } else {
      // Snowflake or other providers - use generic format
      let endpoint = llmConfig.config.endpoint;
      
      // For Snowflake, try to construct endpoint from available servers if not provided
      if (!endpoint && llmConfig.provider === 'snowflake') {
        console.log('⚠️  No endpoint configured for Snowflake, trying to construct from server URLs...');
        
        // Try to get base URL from first available server
        if (toolsByServer && toolsByServer.length > 0) {
          const firstServer = toolsByServer[0];
          const match = firstServer.serverUrl.match(/(https?:\/\/[^/]+)/);
          if (match) {
            const baseUrl = match[1];
            endpoint = `${baseUrl}/api/v2/cortex/inference:complete`;
            console.log('✅ Constructed Snowflake endpoint:', endpoint);
          }
        }
        
        if (!endpoint) {
          throw new Error('Snowflake provider requires an endpoint or at least one configured MCP server to derive the endpoint from');
        }
      } else if (!endpoint) {
        throw new Error(`${llmConfig.provider} provider requires an endpoint to be configured`);
      }
      
      console.log('📡 Calling', llmConfig.provider, ':', endpoint);
      
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

      const headers = {
        'Content-Type': 'application/json',
        ...llmConfig.config.headers,
      };

      if (llmConfig.config.apiKey) {
        headers.Authorization = `Bearer ${llmConfig.config.apiKey}`;
      }

      console.log('📤 Request:', { model: requestBody.model, provider: llmConfig.provider });
      
      const response = await axios.post(endpoint, requestBody, { 
        headers,
        responseType: 'text',
        timeout: 60000 // 60 second timeout
      });
      
      console.log('📥 Response status:', response.status);
      
      // Parse SSE format for Snowflake
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

    console.log('🤖 LLM Decision (raw):', decision);

    // Parse JSON from the response (handle markdown code blocks)
    let jsonStr = decision.trim();
    console.log('📝 Decision string length:', jsonStr.length);
    
    if (jsonStr.startsWith('```json')) {
      console.log('🔧 Removing ```json markdown');
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonStr.startsWith('```')) {
      console.log('🔧 Removing ``` markdown');
      jsonStr = jsonStr.replace(/```\n?/g, '');
    }
    
    console.log('📄 JSON string to parse:', jsonStr.substring(0, 500));
    
    try {
      const parsedDecision = JSON.parse(jsonStr);
      console.log('✅ Parsed decision:', JSON.stringify(parsedDecision, null, 2));
      
      // Validate the structure
      if (!parsedDecision.toolCalls || !Array.isArray(parsedDecision.toolCalls)) {
        throw new Error('Invalid decision structure: toolCalls must be an array');
      }
      
      return parsedDecision;
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError.message);
      console.error('Failed to parse JSON string:', jsonStr);
      throw new Error(`Failed to parse LLM decision as JSON: ${parseError.message}`);
    }
    
  } catch (error) {
    console.error('❌ Failed to get orchestration decision:', error.message);
    console.error('Full error:', error);
    console.error('Response data:', error.response?.data);
    console.error('Response status:', error.response?.status);
    
    // Try to provide more detailed error
    const errorMessage = error.response?.data?.error?.message 
      || error.response?.data?.message 
      || error.message 
      || 'Failed to get orchestration decision from LLM';
    
    throw new Error(`Orchestration decision failed: ${errorMessage}`);
  }
}

// Helper function to execute a tool call
async function executeToolCall(serverId, serverName, serverUrl, toolName, toolArguments, serverAuth, toolSchema = null) {
  console.log(`\n🔧 Executing ${toolName} on ${serverName}...`);
  console.log(`📋 Original arguments:`, JSON.stringify(toolArguments));
  
  const startTime = Date.now();
  const headers = await buildAuthHeaders({ id: serverId, auth: serverAuth, url: serverUrl });
  
  // If we have tool schema, ensure we're using the correct argument name
  let adjustedArguments = { ...toolArguments };
  
  if (toolSchema && toolSchema.inputSchema) {
    const primaryArg = getPrimaryArgumentName(toolSchema.inputSchema);
    console.log(`📋 Tool expects primary argument: "${primaryArg}"`);
    
    // Check if we have a text value in a different argument name that needs to be remapped
    const possibleArgNames = ['text', 'query', 'message', 'input', 'prompt', 'question'];
    const hasCorrectArg = adjustedArguments[primaryArg] !== undefined;
    
    if (!hasCorrectArg) {
      // Find the value from another argument name and remap it
      for (const name of possibleArgNames) {
        if (adjustedArguments[name] !== undefined && name !== primaryArg) {
          console.log(`🔄 Remapping argument "${name}" to "${primaryArg}"`);
          adjustedArguments[primaryArg] = adjustedArguments[name];
          delete adjustedArguments[name];
          break;
        }
      }
    }
  }
  
  console.log(`📤 Adjusted arguments:`, JSON.stringify(adjustedArguments));
  
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
    console.log(`✅ ${toolName} completed in ${endTime - startTime}ms`);
    
    let responseText = '';
    
    if (response.data?.result) {
      const result = response.data.result;
      
      if (typeof result === 'string') {
        responseText = result;
      } else if (result.content) {
        if (Array.isArray(result.content)) {
          responseText = result.content.map(item => {
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
    
  } catch (error) {
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
async function aggregateResponses(userMessage, toolResults, llmConfig, toolsByServer = []) {
  console.log('\n🎨 Aggregating responses with LLM...');
  
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
    let aggregatedResponse;
    
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
      // Snowflake or other providers
      let endpoint = llmConfig.config.endpoint;
      
      // For Snowflake, try to construct endpoint from available servers if not provided
      if (!endpoint && llmConfig.provider === 'snowflake') {
        console.log('⚠️  No endpoint configured for Snowflake in aggregation, trying to construct...');
        
        // Try to get base URL from tool results or available servers
        if (toolResults && toolResults.length > 0) {
          // Try to extract from first successful result
          const successResult = toolResults.find(r => r.success);
          if (successResult && toolsByServer) {
            const serverInfo = toolsByServer.find(s => s.serverId === successResult.serverId);
            if (serverInfo) {
              const match = serverInfo.serverUrl.match(/(https?:\/\/[^/]+)/);
              if (match) {
                const baseUrl = match[1];
                endpoint = `${baseUrl}/api/v2/cortex/inference:complete`;
                console.log('✅ Constructed Snowflake endpoint from results:', endpoint);
              }
            }
          }
        }
        
        if (!endpoint) {
          console.warn('⚠️  Could not construct Snowflake endpoint for aggregation, using fallback');
          // Last resort: return raw concatenated results
          return {
            response: resultsText,
            aggregationTime: 0,
            error: 'Could not construct Snowflake endpoint for aggregation'
          };
        }
      } else if (!endpoint) {
        // For non-Snowflake providers, endpoint is required
        console.warn(`⚠️  No endpoint configured for ${llmConfig.provider}, returning raw results`);
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

      const headers = {
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
      
      // Parse SSE format
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
    console.log(`✨ Response aggregated in ${endTime - startTime}ms`);
    
    return {
      response: aggregatedResponse,
      aggregationTime: endTime - startTime
    };
    
  } catch (error) {
    console.error('❌ Failed to aggregate responses:', error.message);
    // Fallback: just concatenate the responses
    return {
      response: resultsText,
      aggregationTime: 0,
      error: 'Failed to aggregate with LLM, returning raw results'
    };
  }
}

// Orchestrated Chat endpoint - uses LLM to decide which tools to call
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

    console.log(`\n🎭 ORCHESTRATED CHAT REQUEST`);
    console.log(`📨 User message:`, message);
    console.log(`🖥️  Available servers:`, servers.map(s => s.name).join(', '));
    console.log(`🤖 LLM: ${llmConfig.name} (${llmConfig.provider})`);

    // Step 1: Get all available tools from all enabled servers
    const toolsByServer = await getAllAvailableTools(servers);
    
    if (toolsByServer.length === 0) {
      return res.status(400).json({ error: 'No tools available from any server' });
    }

    console.log(`\n✅ Found tools from ${toolsByServer.length} servers`);

    const allToolResults = [];
    const attemptHistory = [];
    let finalResponse = null;
    let attempt = 0;

    // Step 2: Orchestration loop with retry limit
    while (attempt < MAX_RETRIES && !finalResponse) {
      attempt++;
      console.log(`\n🔄 Orchestration Attempt ${attempt}/${MAX_RETRIES}`);

      // Get orchestration decision from LLM
      const decision = await getOrchestrationDecision(
        message, 
        toolsByServer, 
        llmConfig, 
        attemptHistory
      );

      if (!decision.toolCalls || decision.toolCalls.length === 0) {
        console.log('⚠️  No tools selected by LLM');
        console.log('Decision:', JSON.stringify(decision, null, 2));
        break;
      }

      console.log(`\n🎯 LLM selected ${decision.toolCalls.length} tool(s) to call`);
      console.log(`💭 Reasoning: ${decision.reasoning}`);
      console.log(`🔄 NeedsMoreInfo: ${decision.needsMoreInfo}`);
      console.log(`📋 Selected tools:`, decision.toolCalls.map(tc => `${tc.serverName}/${tc.toolName}`).join(', '));

      // Step 3: Execute tool calls in parallel
      const toolCallPromises = decision.toolCalls.map(toolCall => {
        const serverInfo = toolsByServer.find(s => s.serverId === toolCall.serverId);
        if (!serverInfo) {
          console.error(`❌ Server ${toolCall.serverId} not found`);
          return Promise.resolve({
            serverId: toolCall.serverId,
            serverName: toolCall.serverName,
            toolName: toolCall.toolName,
            responseText: 'Error: Server not found',
            success: false,
            error: 'Server not found'
          });
        }

        const server = servers.find(s => s.id === toolCall.serverId);
        
        // Find the tool schema to ensure correct argument names
        const toolSchema = serverInfo.tools.find(t => t.name === toolCall.toolName);
        
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

      console.log(`\n📊 Tool execution results:`);
      toolResults.forEach(result => {
        console.log(`  ${result.success ? '✅' : '❌'} ${result.serverName}/${result.toolName}: ${result.executionTime}ms`);
      });

      // Check if we have at least some successful results
      const hasSuccessfulResults = toolResults.some(r => r.success);
      
      // Check if we need more information
      if (decision.needsMoreInfo && attempt < MAX_RETRIES && hasSuccessfulResults) {
        console.log('🔄 LLM indicates more information needed, but we have some results...');
        console.log(`   Successful results: ${toolResults.filter(r => r.success).length}/${toolResults.length}`);
        
        // Only retry if we have very few results (less than 50% success rate)
        const successRate = toolResults.filter(r => r.success).length / toolResults.length;
        if (successRate < 0.5) {
          console.log('📊 Success rate too low, attempting retry...');
          attemptHistory.push({
            toolCalls: decision.toolCalls,
            results: toolResults
          });
          continue;
        } else {
          console.log('✅ Success rate acceptable, proceeding with aggregation...');
        }
      }

      // If all tools failed and we have retries left, try again
      if (!hasSuccessfulResults && attempt < MAX_RETRIES) {
        console.log('❌ All tools failed, retrying...');
        attemptHistory.push({
          toolCalls: decision.toolCalls,
          results: toolResults
        });
        continue;
      }

      // Step 4: Aggregate all responses with LLM
      console.log('\n🎨 Starting aggregation of results...');
      try {
        const aggregation = await aggregateResponses(message, toolResults, llmConfig, toolsByServer);
        
        if (aggregation.error) {
          console.warn('⚠️  Aggregation had issues:', aggregation.error);
        }
        
        finalResponse = aggregation.response;
        console.log('✅ Aggregation completed successfully');
      } catch (aggError) {
        console.error('❌ Aggregation failed:', aggError.message);
        
        // Fallback: return raw results
        console.log('🔄 Falling back to raw results concatenation');
        finalResponse = toolResults
          .filter(r => r.success)
          .map(r => `### ${r.serverName} - ${r.toolName}\n\n${r.responseText}`)
          .join('\n\n---\n\n');
      }
      
      break; // Exit loop after successful aggregation
    }

    if (!finalResponse) {
      // If we have some results but couldn't aggregate, return them raw
      if (allToolResults.length > 0) {
        console.log('⚠️  Max retries reached but we have partial results, returning them...');
        
        const partialResponse = allToolResults
          .filter(r => r.success)
          .map(r => `### ${r.serverName} - ${r.toolName}\n\n${r.responseText}`)
          .join('\n\n---\n\n');
        
        if (partialResponse) {
          console.log('✅ Returning partial results without LLM aggregation');
          
          const metadata = {
            orchestration: {
              attempts: attempt,
              totalToolCalls: allToolResults.length,
              serversUsed: [...new Set(allToolResults.map(r => r.serverName))],
              partial: true,
              warning: 'Response generated from partial results without full LLM aggregation'
            },
            toolResults: allToolResults.map(result => ({
              server: result.serverName,
              tool: result.toolName,
              executionTime: result.executionTime,
              success: result.success,
              response: result.responseText.substring(0, 500),
            })),
            timings: {
              totalTime: Date.now() - startTime,
              averageToolTime: allToolResults.reduce((sum, r) => sum + r.executionTime, 0) / allToolResults.length,
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
    console.log(`\n✅ Orchestration completed in ${totalTime}ms`);
    console.log(`📈 Total attempts: ${attempt}`);
    console.log(`🔧 Total tool calls: ${allToolResults.length}`);

    // Build detailed metadata for frontend
    const metadata = {
      orchestration: {
        attempts: attempt,
        totalToolCalls: allToolResults.length,
        serversUsed: [...new Set(allToolResults.map(r => r.serverName))],
      },
      toolResults: allToolResults.map(result => ({
        server: result.serverName,
        tool: result.toolName,
        executionTime: result.executionTime,
        success: result.success,
        response: result.responseText.substring(0, 500), // Truncate for metadata
      })),
      timings: {
        totalTime,
        averageToolTime: allToolResults.reduce((sum, r) => sum + r.executionTime, 0) / allToolResults.length,
      }
    };

    res.json({
      response: finalResponse,
      metadata,
      orchestrated: true
    });

  } catch (error) {
    console.error('❌ Orchestration failed:', error);
    res.status(500).json({ 
      error: error.message || 'Orchestration failed',
      details: error.response?.data || error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 MCPbuddy Server running on port ${PORT}`);
  console.log(`📡 Ready to connect to MCP servers\n`);
});

