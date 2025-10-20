import { Conversation, MCPServer } from '../types';

interface ConversationsSidebarProps {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  servers: MCPServer[];
  onSelectConversation: (conversation: Conversation) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
}

export default function ConversationsSidebar({
  conversations,
  activeConversation,
  servers,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
}: ConversationsSidebarProps) {
  const getServerName = (serverId: string) => {
    const server = servers.find(s => s.id === serverId);
    return server?.name || 'Unknown Server';
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="w-80 bg-slate-800/50 border-r border-slate-700/50 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50">
        <button
          onClick={onNewConversation}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg px-4 py-3 transition-all flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/20"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="font-semibold">New Conversation</span>
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <svg className="w-16 h-16 text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-slate-400 text-sm">No conversations yet</p>
            <p className="text-slate-500 text-xs mt-2">Click "New Conversation" to start</p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => onSelectConversation(conversation)}
              className={`group relative p-3 rounded-lg cursor-pointer transition-all ${
                activeConversation?.id === conversation.id
                  ? 'bg-blue-600/20 border border-blue-500/50'
                  : 'bg-slate-700/30 hover:bg-slate-700/50 border border-transparent'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 mr-2">
                  <h3 className="text-sm font-semibold text-white truncate">
                    {conversation.title}
                  </h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-slate-400">
                      {getServerName(conversation.serverId)}
                    </span>
                    {conversation.llmEnabled && (
                      <span className="text-xs text-purple-400 flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        AI
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {conversation.messages.length} messages • {formatDate(conversation.updatedAt)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newTitle = prompt('Enter new title:', conversation.title);
                      if (newTitle && newTitle.trim()) {
                        onRenameConversation(conversation.id, newTitle.trim());
                      }
                    }}
                    className="p-1 hover:bg-slate-600 rounded transition-colors"
                    title="Rename"
                  >
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this conversation?')) {
                        onDeleteConversation(conversation.id);
                      }
                    }}
                    className="p-1 hover:bg-red-600/20 rounded transition-colors ml-1"
                    title="Delete"
                  >
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}



