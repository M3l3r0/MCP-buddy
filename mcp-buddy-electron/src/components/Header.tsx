import { MCPServer, LLMConfig } from '../types';

interface HeaderProps {
  activeServer: MCPServer | null;
  activeLLM: LLMConfig | null;
  hasLLMConfigs: boolean;
  onOpenServerManager: () => void;
  onOpenLLMManager: () => void;
  onToggleLLM: () => void;
  onClearChat: () => void;
}

export default function Header({ activeServer, activeLLM, hasLLMConfigs, onOpenServerManager, onOpenLLMManager, onToggleLLM, onClearChat }: HeaderProps) {
  return (
    <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 px-6 py-4 titlebar-no-drag">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">MCPeer</h1>
              <div className="flex items-center space-x-4">
                <p className="text-sm text-slate-400">
                  {activeServer ? (
                    <span className="flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                      {activeServer.name}
                    </span>
                  ) : (
                    'No server selected'
                  )}
                </p>
                {activeLLM && (
                  <p className="text-sm text-purple-400 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    AI Enhanced
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onClearChat}
            className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-200 rounded-lg transition-all flex items-center space-x-2 border border-slate-600/50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Clear Chat</span>
          </button>

          {hasLLMConfigs && (
            <button
              onClick={onToggleLLM}
              className={`px-4 py-2 rounded-lg transition-all flex items-center space-x-2 ${
                activeLLM
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20'
                  : 'bg-slate-700/50 hover:bg-slate-700 text-slate-200 border border-slate-600/50'
              }`}
              title={activeLLM ? 'AI Enhancement: ON' : 'AI Enhancement: OFF'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>AI: {activeLLM ? 'ON' : 'OFF'}</span>
            </button>
          )}

          <button
            onClick={onOpenLLMManager}
            className={`px-4 py-2 rounded-lg transition-all flex items-center space-x-2 ${
              activeLLM
                ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20'
                : 'bg-slate-700/50 hover:bg-slate-700 text-slate-200 border border-slate-600/50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>LLM Config</span>
          </button>
          
          <button
            onClick={onOpenServerManager}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all flex items-center space-x-2 shadow-lg shadow-blue-500/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
            </svg>
            <span>MCP Servers</span>
          </button>
        </div>
      </div>
    </header>
  );
}
