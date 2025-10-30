import { useState, useEffect, useRef } from 'react';
import Chat from './components/Chat';
import ServerManager from './components/ServerManager';
import LLMConfigManager from './components/LLMConfigManager';
import ConversationsSidebar from './components/ConversationsSidebar';
import Header from './components/Header';
import LogsPanel from './components/LogsPanel';
import { MCPServer, LLMConfig, Conversation, Message, LogEntry } from './types';

function App() {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [activeServer, setActiveServer] = useState<MCPServer | null>(null);
  const [llmConfigs, setLLMConfigs] = useState<LLMConfig[]>([]);
  const [activeLLM, setActiveLLM] = useState<LLMConfig | null>(null);
  
  // Conversations state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  
  // UI state
  const [showServerManager, setShowServerManager] = useState(false);
  const [showLLMManager, setShowLLMManager] = useState(false);
  
  // Logs state
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // Track if initial load is complete
  const initialLoadComplete = useRef(false);

  // Load servers from localStorage on mount
  useEffect(() => {
    const loadServers = async () => {
      // First, check if we have servers in localStorage (user's saved changes have priority)
      const savedServers = localStorage.getItem('mcpServers');
      if (savedServers) {
        // User has saved servers in localStorage - use those (they have priority)
        try {
          const parsed = JSON.parse(savedServers);
          console.log('✅ Loaded servers from localStorage (user preferences)');
          // Migrate old format to new format if needed
          const migratedServers = parsed.map((server: any) => {
            if (server.headers) {
              // Old format - migrate to new auth format
              return {
                id: server.id,
                name: server.name,
                url: server.url,
                auth: {
                  method: 'bearer',
                  bearerToken: server.headers.Authorization?.replace('Bearer ', ''),
                },
                enabled: server.enabled,
              };
            }
            return server;
          });
          setServers(migratedServers);
          
          // Set active server
          const enabledServer = migratedServers.find((s: MCPServer) => s.enabled);
          const serverToActivate = enabledServer || migratedServers[0];
          if (serverToActivate) {
            setActiveServer(serverToActivate);
          }
          return; // Exit early - we have user's saved preferences
        } catch (error) {
          console.error('Error loading servers from localStorage:', error);
        }
      }

      // Only load from config.local.json if localStorage is empty (first time setup)
      try {
        const response = await fetch('/config.local.json');
        if (response.ok) {
          const localConfig = await response.json();
          if (localConfig.servers && localConfig.servers.length > 0) {
            console.log('✅ Loaded initial configuration from config.local.json');
            setServers(localConfig.servers);
            const activeServerFromConfig = localConfig.servers.find((s: MCPServer) => s.enabled) || localConfig.servers[0];
            setActiveServer(activeServerFromConfig);
            // Save to localStorage so future edits persist
            localStorage.setItem('mcpServers', JSON.stringify(localConfig.servers));
            return;
          }
        }
      } catch (error) {
        // config.local.json doesn't exist or failed to load - this is normal for new users
        console.log('ℹ️  No local config found (normal for new users)');
      }

      // No configuration found anywhere
      console.log('ℹ️  No MCP servers configured. Please add a server through the Server Manager.');
    };

    loadServers();
  }, []);

  // Load LLM configs from localStorage
  useEffect(() => {
    const loadLLMConfigs = async () => {
      // First, check localStorage (user's saved changes have priority)
      const savedLLMConfigs = localStorage.getItem('llmConfigs');
      if (savedLLMConfigs) {
        // User has saved LLM configs in localStorage - use those
        try {
          const parsed = JSON.parse(savedLLMConfigs);
          console.log('✅ Loaded LLM configs from localStorage (user preferences)');
          setLLMConfigs(parsed);
          const activeConfig = parsed.find((c: LLMConfig) => c.enabled);
          if (activeConfig) {
            setActiveLLM(activeConfig);
          }
          return; // Exit early - we have user's saved preferences
        } catch (error) {
          console.error('Error loading LLM configs from localStorage:', error);
        }
      }

      // Only load from config.local.json if localStorage is empty (first time setup)
      try {
        const response = await fetch('/config.local.json');
        if (response.ok) {
          const localConfig = await response.json();
          if (localConfig.llmConfigs && localConfig.llmConfigs.length > 0) {
            console.log('✅ Loaded initial LLM configuration from config.local.json');
            setLLMConfigs(localConfig.llmConfigs);
            const activeConfig = localConfig.llmConfigs.find((c: LLMConfig) => c.enabled);
            if (activeConfig) {
              setActiveLLM(activeConfig);
            }
            // Save to localStorage so future edits persist
            localStorage.setItem('llmConfigs', JSON.stringify(localConfig.llmConfigs));
            return;
          }
        }
      } catch (error) {
        // config.local.json doesn't exist or failed to load - this is normal for new users
        console.log('ℹ️  No local LLM config found (normal for new users)');
      }

      // No configuration found anywhere
      console.log('ℹ️  No LLM configurations found. Add one through the LLM Config Manager if needed.');
    };

    loadLLMConfigs();
  }, []);

  // Load conversations from localStorage
  useEffect(() => {
    const savedConversations = localStorage.getItem('conversations');
    if (savedConversations) {
      try {
        const parsed = JSON.parse(savedConversations);
        // Convert date strings back to Date objects
        const conversationsWithDates = parsed.map((conv: any) => ({
          ...conv,
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt),
          messages: conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })),
        }));
        setConversations(conversationsWithDates);
      } catch (error) {
        console.error('Error loading conversations:', error);
      }
    }
  }, []);

  // Auto-create a new conversation when app loads if there's an active server but no active conversation
  useEffect(() => {
    // Only run this once after initial load is complete
    if (initialLoadComplete.current) return;
    
    // Wait for servers to load and check if we need to create a default conversation
    // This creates a new conversation when:
    // 1. There's an active server
    // 2. There's no active conversation selected (either no conversations exist or user hasn't selected one)
    if (activeServer && !activeConversation) {
      console.log('📝 Auto-creating new conversation for ready-to-use chat');
      const newConversation: Conversation = {
        id: Date.now().toString(),
        title: `New Chat - ${new Date().toLocaleDateString()}`,
        serverId: activeServer.id,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        llmEnabled: activeLLM !== null,
        isAutoCreated: true, // Marcar como auto-creada para cambiar el título al primer mensaje
      };
      setConversations(prev => [newConversation, ...prev]);
      setActiveConversation(newConversation);
      initialLoadComplete.current = true;
    }
  }, [activeServer, activeConversation, activeLLM]);

  // Save servers to localStorage whenever they change
  useEffect(() => {
    if (servers.length > 0) {
      localStorage.setItem('mcpServers', JSON.stringify(servers));
    }
  }, [servers]);

  // Save LLM configs to localStorage
  useEffect(() => {
    if (llmConfigs.length > 0) {
      localStorage.setItem('llmConfigs', JSON.stringify(llmConfigs));
    }
  }, [llmConfigs]);

  // Save conversations to localStorage
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('conversations', JSON.stringify(conversations));
    }
  }, [conversations]);

  // Update active conversation's messages when they change
  // We use JSON.stringify to detect deep changes in the messages array
  useEffect(() => {
    if (activeConversation && activeConversation.messages.length > 0) {
      console.log('💾 Syncing conversation to conversations array:', {
        id: activeConversation.id,
        title: activeConversation.title,
        messageCount: activeConversation.messages.length
      });
      setConversations(prev => 
        prev.map(conv => 
          conv.id === activeConversation.id 
            ? { ...activeConversation, updatedAt: new Date() }
            : conv
        )
      );
    }
  }, [activeConversation?.id, activeConversation?.messages?.length, activeConversation?.title]);

  const handleNewConversation = () => {
    if (!activeServer) {
      alert('Please select a server first');
      return;
    }

    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: `New Chat - ${new Date().toLocaleDateString()}`,
      serverId: activeServer.id,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      llmEnabled: activeLLM !== null,
      isAutoCreated: false, // Creada manualmente, mantener título
    };

    setConversations(prev => [newConversation, ...prev]);
    setActiveConversation(newConversation);
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setActiveConversation(conversation);
    // Update active server based on conversation
    const server = servers.find(s => s.id === conversation.serverId);
    if (server) {
      setActiveServer(server);
    }
  };

  const handleDeleteConversation = (id: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== id));
    if (activeConversation?.id === id) {
      setActiveConversation(null);
    }
  };

  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations(prev =>
      prev.map(conv =>
        conv.id === id ? { ...conv, title: newTitle } : conv
      )
    );
    if (activeConversation?.id === id) {
      setActiveConversation(prev => prev ? { ...prev, title: newTitle } : null);
    }
  };

  const handleAddMessage = (message: Message) => {
    console.log('📝 Adding message:', {
      role: message.role,
      content: message.content.substring(0, 50) + '...',
      activeConversationId: activeConversation?.id,
      currentMessageCount: activeConversation?.messages.length || 0
    });

    // Si no hay conversación activa, crear una nueva automáticamente
    if (!activeConversation) {
      if (!activeServer) {
        console.warn('Cannot add message: no active server');
        return;
      }
      
      const newConversation: Conversation = {
        id: Date.now().toString(),
        title: message.role === 'user' 
          ? (message.content.length > 50 ? message.content.substring(0, 50) + '...' : message.content)
          : `New Chat - ${new Date().toLocaleDateString()}`,
        serverId: activeServer.id,
        messages: [message],
        createdAt: new Date(),
        updatedAt: new Date(),
        llmEnabled: activeLLM !== null,
        isAutoCreated: false, // No es auto-creada porque se creó al enviar un mensaje
      };
      
      setConversations(prev => [newConversation, ...prev]);
      setActiveConversation(newConversation);
      console.log('✅ Auto-created new conversation with', newConversation.messages.length, 'messages');
      return;
    }

    // Usar forma funcional para asegurar que tenemos el estado más reciente
    setActiveConversation(prevConversation => {
      if (!prevConversation) return prevConversation;

      const updatedConversation = {
        ...prevConversation,
        messages: [...prevConversation.messages, message],
        updatedAt: new Date(),
      };

      console.log('📥 Updating conversation:', {
        id: updatedConversation.id,
        previousMessageCount: prevConversation.messages.length,
        newMessageCount: updatedConversation.messages.length,
        allMessages: updatedConversation.messages.map(m => `${m.role}: ${m.content.substring(0, 20)}...`)
      });

      // Auto-rename conversation based on first user message ONLY if it was auto-created
      if (prevConversation.isAutoCreated && prevConversation.messages.length === 0 && message.role === 'user') {
        const title = message.content.length > 50 
          ? message.content.substring(0, 50) + '...'
          : message.content;
        updatedConversation.title = title;
        updatedConversation.isAutoCreated = false; // Ya no es auto-creada después de cambiar el título
        console.log('📝 Auto-renamed conversation to:', title);
      }

      return updatedConversation;
    });
  };

  const handleClearChat = () => {
    if (activeConversation) {
      const clearedConversation = {
        ...activeConversation,
        messages: [],
        updatedAt: new Date(),
      };
      setActiveConversation(clearedConversation);
    }
  };

  const handleToggleLLM = () => {
    if (activeLLM) {
      const updatedConfigs = llmConfigs.map(c => 
        c.id === activeLLM.id ? { ...c, enabled: false } : c
      );
      setLLMConfigs(updatedConfigs);
      setActiveLLM(null);
    } else {
      const firstLLM = llmConfigs[0];
      if (firstLLM) {
        const updatedConfigs = llmConfigs.map(c => 
          c.id === firstLLM.id ? { ...c, enabled: true } : c
        );
        setLLMConfigs(updatedConfigs);
        setActiveLLM({ ...firstLLM, enabled: true });
      }
    }
  };

  const handleAddLog = (log: LogEntry) => {
    setLogs(prev => [...prev, log]);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header
        activeServer={activeServer}
        activeLLM={activeLLM}
        hasLLMConfigs={llmConfigs.length > 0}
        onOpenServerManager={() => setShowServerManager(true)}
        onOpenLLMManager={() => setShowLLMManager(true)}
        onToggleLLM={handleToggleLLM}
        onClearChat={handleClearChat}
      />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Conversations Sidebar */}
        <ConversationsSidebar
          conversations={conversations}
          activeConversation={activeConversation}
          servers={servers}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
          onRenameConversation={handleRenameConversation}
        />

        {/* Chat Area */}
        <Chat
          activeServer={activeServer}
          activeLLM={activeLLM}
          allServers={servers}
          messages={activeConversation?.messages || []}
          onAddMessage={handleAddMessage}
          onAddLog={handleAddLog}
        />
      </div>

      {/* Logs Panel */}
      <LogsPanel
        logs={logs}
        onClear={handleClearLogs}
      />

      {showServerManager && (
        <ServerManager
          servers={servers}
          activeServer={activeServer}
          onClose={() => setShowServerManager(false)}
          onServersChange={setServers}
          onActiveServerChange={setActiveServer}
        />
      )}

      {showLLMManager && (
        <LLMConfigManager
          llmConfigs={llmConfigs}
          activeLLM={activeLLM}
          onClose={() => setShowLLMManager(false)}
          onConfigsChange={setLLMConfigs}
          onActiveLLMChange={setActiveLLM}
        />
      )}
    </div>
  );
}

export default App;
