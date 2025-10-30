import { useState, useRef, useEffect } from 'react';
import { MCPServer, Message, LLMConfig, LogEntry } from '../types';
import MessageBubble from './MessageBubble';
import axios from 'axios';

interface ChatProps {
  activeServer: MCPServer | null;
  activeLLM: LLMConfig | null;
  allServers: MCPServer[];
  messages: Message[];
  onAddMessage: (message: Message) => void;
  onAddLog?: (log: LogEntry) => void;
}

export default function Chat({ activeServer, activeLLM, allServers, messages, onAddMessage, onAddLog }: ChatProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [typingMessage, setTypingMessage] = useState<Message | null>(null);
  const [displayedText, setDisplayedText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, displayedText]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  // Efecto de escritura progresiva
  useEffect(() => {
    if (!typingMessage) {
      setDisplayedText('');
      return;
    }

    const fullText = typingMessage.content;
    let currentIndex = 0;

    // Limpiar intervalo anterior si existe
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
    }

    // Velocidad: 3 caracteres cada 8ms = muy rápido pero visible y fluido
    typingIntervalRef.current = setInterval(() => {
      if (currentIndex < fullText.length) {
        currentIndex += 3; // Avanzar 3 caracteres a la vez para que sea muy rápido
        setDisplayedText(fullText.slice(0, Math.min(currentIndex, fullText.length)));
      } else {
        // Terminó de escribir
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
        }
        onAddMessage(typingMessage);
        setTypingMessage(null);
        setDisplayedText('');
      }
    }, 8);

    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
    };
  }, [typingMessage, onAddMessage]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // Check if we should use orchestration
    const enabledServers = allServers.filter(s => s.enabled);
    const useOrchestration = activeLLM && activeLLM.enabled && enabledServers.length > 0;
    
    // For non-orchestrated mode, we need an active server
    if (!useOrchestration && !activeServer) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      serverId: activeServer?.id || 'orchestrated',
    };

    onAddMessage(userMessage);
    setInput('');
    setIsLoading(true);

    try {
      let response;
      
      if (useOrchestration) {
        // ORCHESTRATED MODE: LLM decides which servers and tools to use
        console.log('🎭 Using orchestrated mode with', enabledServers.length, 'servers');
        
        if (onAddLog) {
          onAddLog({
            id: `log-${Date.now()}-orchestration`,
            timestamp: new Date(),
            type: 'info',
            message: `🎭 Using AI orchestration with ${enabledServers.length} available servers`,
            data: {
              query: userMessage.content,
              servers: enabledServers.map(s => s.name),
              llm: `${activeLLM.name} (${activeLLM.provider})`,
            }
          });
        }

        response = await axios.post('/api/orchestrated-chat', {
          message: userMessage.content,
          servers: enabledServers,
          llmConfig: activeLLM,
        });

        // Log orchestration results
        if (onAddLog && response.data.metadata?.orchestration) {
          const orch = response.data.metadata.orchestration;
          onAddLog({
            id: `log-${Date.now()}-orch-result`,
            timestamp: new Date(),
            type: 'info',
            message: `🎯 Orchestration completed: ${orch.totalToolCalls} tool(s) from ${orch.serversUsed.length} server(s)`,
            data: {
              attempts: orch.attempts,
              serversUsed: orch.serversUsed,
              toolResults: response.data.metadata.toolResults,
            },
            timings: response.data.metadata.timings
          });
        }

        // Log each tool call
        if (onAddLog && response.data.metadata?.toolResults) {
          response.data.metadata.toolResults.forEach((toolResult: any, idx: number) => {
            onAddLog({
              id: `log-${Date.now()}-tool-${idx}`,
              timestamp: new Date(),
              type: toolResult.success ? 'mcp-response' : 'error',
              message: `${toolResult.success ? '✅' : '❌'} ${toolResult.server} / ${toolResult.tool}`,
              data: {
                server: toolResult.server,
                tool: toolResult.tool,
                response: toolResult.response,
              },
              timings: {
                mcpTime: toolResult.executionTime,
              }
            });
          });
        }

      } else {
        // STANDARD MODE: Use single active server
        console.log('📡 Using standard mode with', activeServer!.name);
        
        if (onAddLog) {
          onAddLog({
            id: `log-${Date.now()}-req`,
            timestamp: new Date(),
            type: 'mcp-request',
            message: `Sending query to ${activeServer!.name}`,
            data: {
              query: userMessage.content,
              server: activeServer!.name,
              llmEnabled: activeLLM?.enabled || false,
            }
          });
        }

        response = await axios.post('/api/chat', {
          message: userMessage.content,
          server: activeServer,
          llmConfig: activeLLM,
        });

        // Log MCP response
        if (onAddLog && response.data.mcpRequest) {
          onAddLog({
            id: `log-${Date.now()}-mcp-res`,
            timestamp: new Date(),
            type: 'mcp-response',
            message: `Received response from MCP server`,
            data: response.data.mcpRequest,
            timings: {
              mcpTime: response.data.timings?.mcpTime,
            }
          });
        }

        // Log LLM enhancement if applicable
        if (onAddLog && activeLLM?.enabled && response.data.timings?.llmTime) {
          onAddLog({
            id: `log-${Date.now()}-llm`,
            timestamp: new Date(),
            type: 'llm-response',
            message: `Response enhanced with ${activeLLM.name}`,
            data: {
              provider: activeLLM.provider,
              model: activeLLM.config.model,
            },
            timings: {
              llmTime: response.data.timings.llmTime,
            }
          });
        }

        // Log total timing
        if (onAddLog && response.data.timings) {
          onAddLog({
            id: `log-${Date.now()}-total`,
            timestamp: new Date(),
            type: 'info',
            message: `Request completed`,
            timings: response.data.timings
          });
        }
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date(),
        serverId: activeServer.id,
        metadata: response.data.metadata,
      };

      // Iniciar efecto de escritura progresiva
      setTypingMessage(assistantMessage);
    } catch (error: any) {
      console.error('❌ Chat error:', error);
      console.error('Error response:', error.response?.data);
      
      // Log error
      if (onAddLog) {
        onAddLog({
          id: `log-${Date.now()}-error`,
          timestamp: new Date(),
          type: 'error',
          message: `Error: ${error.response?.data?.error || error.message || 'Failed to get response'}`,
          data: {
            error: error.response?.data || { message: error.message },
            status: error.response?.status,
            url: error.config?.url
          }
        });
      }

      const errorDetails = error.response?.data?.details 
        ? `\n\nDetails: ${JSON.stringify(error.response.data.details, null, 2)}`
        : '';

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: `Error: ${error.response?.data?.error || error.message || 'Failed to get response'}${errorDetails}`,
        timestamp: new Date(),
      };
      onAddMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center">
              <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white mb-2">
                {activeLLM && activeLLM.enabled && allServers.filter(s => s.enabled).length > 0
                  ? '🎭 AI Orchestration Active'
                  : activeServer 
                  ? `Connected to ${activeServer.name}` 
                  : 'Welcome to MCPbuddy'}
              </h2>
              <p className="text-slate-400 max-w-md">
                {activeLLM && activeLLM.enabled && allServers.filter(s => s.enabled).length > 0
                  ? `AI will intelligently choose from ${allServers.filter(s => s.enabled).length} available server(s) and their tools to answer your questions.`
                  : activeServer
                  ? 'Start a conversation by typing a message below.'
                  : 'Please select or add an MCP server to start chatting.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {typingMessage && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex flex-col space-y-2">
                  <div className="bg-slate-800/50 text-slate-100 border border-slate-700/50 rounded-2xl rounded-tl-none px-4 py-3 backdrop-blur-sm">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {displayedText}
                      <span className="inline-block w-1 h-4 bg-blue-500 ml-1 animate-pulse"></span>
                    </p>
                  </div>
                </div>
              </div>
            )}
            {isLoading && !typingMessage && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="bg-slate-800/50 rounded-2xl rounded-tl-none px-4 py-3 backdrop-blur-sm border border-slate-700/50">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-700/50 bg-slate-800/30 backdrop-blur-sm px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative flex items-end space-x-3">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  activeLLM && activeLLM.enabled && allServers.filter(s => s.enabled).length > 0
                    ? "🎭 AI Orchestration active - Ask me anything..."
                    : activeServer 
                    ? "Type your message..." 
                    : "Select a server first..."
                }
                disabled={(!activeServer && !(activeLLM && activeLLM.enabled && allServers.filter(s => s.enabled).length > 0)) || isLoading}
                rows={1}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-2xl px-4 py-3 pr-12 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none max-h-32 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || ((!activeServer && !(activeLLM && activeLLM.enabled && allServers.filter(s => s.enabled).length > 0)) || isLoading)}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl p-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2 text-center">
            {activeLLM && activeLLM.enabled && allServers.filter(s => s.enabled).length > 0
              ? `🎭 AI Orchestration: ${allServers.filter(s => s.enabled).length} server(s) available • Press Enter to send`
              : "Press Enter to send, Shift + Enter for new line"}
          </p>
        </div>
      </div>
    </div>
  );
}

