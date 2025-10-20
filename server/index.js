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

        // Call the tool with the user's message
        const toolCallRequest = {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: searchTool.name,
            arguments: {
              query: message,
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

app.listen(PORT, () => {
  console.log(`\n🚀 MCPbuddy Server running on port ${PORT}`);
  console.log(`📡 Ready to connect to MCP servers\n`);
});

