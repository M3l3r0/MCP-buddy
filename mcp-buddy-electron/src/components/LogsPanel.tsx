import { useState } from 'react';
import { LogEntry } from '../types';

interface LogsPanelProps {
  logs: LogEntry[];
  onClear: () => void;
}

export default function LogsPanel({ logs, onClear }: LogsPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'mcp-request':
        return '📤';
      case 'mcp-response':
        return '📥';
      case 'llm-request':
        return '🤖';
      case 'llm-response':
        return '✨';
      case 'error':
        return '❌';
      case 'info':
        return 'ℹ️';
      default:
        return '📝';
    }
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'mcp-request':
      case 'mcp-response':
        return 'text-blue-400';
      case 'llm-request':
      case 'llm-response':
        return 'text-purple-400';
      case 'error':
        return 'text-red-400';
      case 'info':
        return 'text-slate-400';
      default:
        return 'text-slate-300';
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white shadow-xl hover:bg-slate-700 transition-colors flex items-center space-x-2"
        >
          <span className="text-lg">📊</span>
          <span className="text-sm font-medium">Logs</span>
          {logs.length > 0 && (
            <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
              {logs.length}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div 
      className={`fixed ${isExpanded ? 'bottom-4 left-4 right-4 top-24' : 'bottom-4 left-4'} z-40 ${isExpanded ? 'w-auto' : 'w-96'} bg-slate-900/95 backdrop-blur-lg border border-slate-700 rounded-lg shadow-2xl flex flex-col`}
      style={{ maxHeight: isExpanded ? 'calc(100vh - 120px)' : '400px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-center space-x-2">
          <span className="text-lg">📊</span>
          <h3 className="text-white font-semibold">System Logs</h3>
          {logs.length > 0 && (
            <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
              {logs.length}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onClear}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-800"
            title="Clear logs"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-800"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5.25 5.25M20 8V4m0 0h-4m4 0l-5.25 5.25M4 16v4m0 0h4m-4 0l5.25-5.25M20 20l-5.25-5.25M20 20v-4m0 4h-4" />
              </svg>
            )}
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-800"
            title="Minimize"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Logs Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
            <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">No logs yet</p>
            <p className="text-xs mt-1">Logs will appear here when you send messages</p>
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 text-sm hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <span className="text-base">{getLogIcon(log.type)}</span>
                  <span className={`font-medium ${getLogColor(log.type)}`}>
                    {log.type.toUpperCase().replace('-', ' ')}
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  {log.timestamp.toLocaleTimeString()}
                </span>
              </div>
              
              <p className="text-slate-300 mb-2">{log.message}</p>

              {/* Timings */}
              {log.timings && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {log.timings.mcpTime !== undefined && (
                    <div className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs flex items-center space-x-1">
                      <span>⏱️ MCP:</span>
                      <span className="font-mono font-semibold">{formatTime(log.timings.mcpTime)}</span>
                    </div>
                  )}
                  {log.timings.llmTime !== undefined && (
                    <div className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-xs flex items-center space-x-1">
                      <span>🤖 LLM:</span>
                      <span className="font-mono font-semibold">{formatTime(log.timings.llmTime)}</span>
                    </div>
                  )}
                  {log.timings.totalTime !== undefined && (
                    <div className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs flex items-center space-x-1">
                      <span>✅ Total:</span>
                      <span className="font-mono font-semibold">{formatTime(log.timings.totalTime)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Data (collapsible) */}
              {log.data && (
                <details className="mt-2">
                  <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-300">
                    View details
                  </summary>
                  <pre className="mt-2 text-xs text-slate-400 bg-slate-900/50 p-2 rounded overflow-x-auto">
                    {typeof log.data === 'string' 
                      ? log.data 
                      : JSON.stringify(log.data, null, 2)
                    }
                  </pre>
                </details>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
