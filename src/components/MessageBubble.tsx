import { useState } from 'react';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const [showDetails, setShowDetails] = useState(false);
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const hasMetadata = message.metadata && message.role === 'assistant';

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg px-4 py-2 max-w-2xl">
          <p className="text-sm text-red-300">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex items-start space-x-3 max-w-3xl ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
        {/* Avatar */}
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isUser
              ? 'bg-gradient-to-br from-purple-500 to-pink-500'
              : 'bg-gradient-to-br from-blue-500 to-cyan-500'
          }`}
        >
          {isUser ? (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          )}
        </div>

        {/* Message Content */}
        <div className="flex flex-col space-y-2">
          <div
            className={`rounded-2xl px-4 py-3 backdrop-blur-sm ${
              isUser
                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-none'
                : 'bg-slate-800/50 text-slate-100 border border-slate-700/50 rounded-tl-none'
            }`}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
            
            <div className="flex items-center justify-between mt-2 gap-3">
              <p className={`text-xs ${isUser ? 'text-blue-200' : 'text-slate-500'}`}>
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
              
              {hasMetadata && (
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-xs flex items-center space-x-1 px-2 py-1 rounded bg-slate-700/50 hover:bg-slate-700 transition-colors text-slate-300 hover:text-white"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{showDetails ? 'Ocultar detalles' : 'Ver detalles'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Technical Details */}
          {hasMetadata && showDetails && message.metadata && (
            <div className="bg-slate-900/90 border border-slate-700 rounded-lg p-4 space-y-4 max-w-3xl">
              {/* Timings */}
              {message.metadata.timings && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 mb-2 flex items-center">
                    <span className="mr-1">⏱️</span> Tiempos de Respuesta
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {message.metadata.timings.mcpTime !== undefined && (
                      <div className="bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded text-xs font-mono">
                        MCP: {formatTime(message.metadata.timings.mcpTime)}
                      </div>
                    )}
                    {message.metadata.timings.llmTime !== undefined && (
                      <div className="bg-purple-500/20 text-purple-300 px-3 py-1.5 rounded text-xs font-mono">
                        LLM: {formatTime(message.metadata.timings.llmTime)}
                      </div>
                    )}
                    {message.metadata.timings.totalTime !== undefined && (
                      <div className="bg-green-500/20 text-green-300 px-3 py-1.5 rounded text-xs font-mono">
                        Total: {formatTime(message.metadata.timings.totalTime)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MCP Request */}
              {message.metadata.mcpRequest && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 mb-2 flex items-center">
                    <span className="mr-1">📤</span> MCP Request
                  </h4>
                  <div className="bg-slate-950/50 rounded p-3 space-y-2">
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-slate-500">Método:</span>
                      <span className="text-blue-400 font-mono">{message.metadata.mcpRequest.method}</span>
                    </div>
                    {message.metadata.mcpRequest.tool && (
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="text-slate-500">Tool:</span>
                        <span className="text-blue-400 font-mono">{message.metadata.mcpRequest.tool}</span>
                      </div>
                    )}
                    <details className="mt-2">
                      <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-300">
                        Ver request completo
                      </summary>
                      <pre className="mt-2 text-xs text-slate-400 overflow-x-auto">
                        {JSON.stringify(message.metadata.mcpRequest.fullRequest || message.metadata.mcpRequest, null, 2)}
                      </pre>
                    </details>
                  </div>
                </div>
              )}

              {/* MCP Response */}
              {message.metadata.mcpResponse && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 mb-2 flex items-center">
                    <span className="mr-1">📥</span> MCP Response
                  </h4>
                  <div className="bg-slate-950/50 rounded p-3 space-y-2">
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-slate-500">Tamaño:</span>
                      <span className="text-green-400 font-mono">{message.metadata.mcpResponse.length} chars</span>
                    </div>
                    <details className="mt-2">
                      <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-300">
                        Ver respuesta raw del MCP
                      </summary>
                      <pre className="mt-2 text-xs text-slate-300 overflow-x-auto max-h-60 overflow-y-auto">
                        {message.metadata.mcpResponse.rawResponse}
                      </pre>
                    </details>
                    <details className="mt-2">
                      <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-300">
                        Ver response completo (JSON)
                      </summary>
                      <pre className="mt-2 text-xs text-slate-400 overflow-x-auto max-h-60 overflow-y-auto">
                        {JSON.stringify(message.metadata.mcpResponse.toolResponse || message.metadata.mcpResponse.resourcesResponse, null, 2)}
                      </pre>
                    </details>
                  </div>
                </div>
              )}

              {/* LLM Request */}
              {message.metadata.llmRequest && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 mb-2 flex items-center">
                    <span className="mr-1">🤖</span> LLM Enhancement Request
                  </h4>
                  <div className="bg-slate-950/50 rounded p-3 space-y-2">
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-slate-500">Provider:</span>
                      <span className="text-purple-400 font-mono">{message.metadata.llmRequest.provider}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-slate-500">Model:</span>
                      <span className="text-purple-400 font-mono">{message.metadata.llmRequest.model}</span>
                    </div>
                    {message.metadata.llmRequest.endpoint && (
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="text-slate-500">Endpoint:</span>
                        <span className="text-purple-400 font-mono text-xs break-all">{message.metadata.llmRequest.endpoint}</span>
                      </div>
                    )}
                    <div className="flex gap-2 text-xs">
                      <div className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                        Temp: {message.metadata.llmRequest.temperature}
                      </div>
                      <div className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                        Max Tokens: {message.metadata.llmRequest.maxTokens}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* LLM Response */}
              {message.metadata.llmResponse && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 mb-2 flex items-center">
                    <span className="mr-1">✨</span> LLM Enhanced Response
                  </h4>
                  <div className="bg-slate-950/50 rounded p-3 space-y-2">
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-slate-500">Tamaño:</span>
                      <span className="text-green-400 font-mono">{message.metadata.llmResponse.length} chars</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Esta es la respuesta final mejorada por el LLM que ves arriba en el mensaje.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


