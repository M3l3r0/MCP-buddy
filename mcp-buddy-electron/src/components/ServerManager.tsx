import { useState } from 'react';
import { MCPServer, AuthMethod } from '../types';

interface ServerManagerProps {
  servers: MCPServer[];
  activeServer: MCPServer | null;
  onClose: () => void;
  onServersChange: (servers: MCPServer[]) => void;
  onActiveServerChange: (server: MCPServer | null) => void;
}

export default function ServerManager({
  servers,
  activeServer,
  onClose,
  onServersChange,
  onActiveServerChange,
}: ServerManagerProps) {
  const [editingServer, setEditingServer] = useState<MCPServer | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    url: '',
    authMethod: 'bearer' as AuthMethod,
    bearerToken: '',
    oauthClientId: '',
    oauthClientSecret: '',
    oauthTokenUrl: '',
    oauthScope: '',
    apiKey: '',
    apiKeyHeader: 'X-API-Key',
    username: '',
    password: '',
    customHeaders: '',
  });

  const handleAddServer = () => {
    if (!formData.name || !formData.url) return;

    const newServer: MCPServer = {
      id: Date.now().toString(),
      name: formData.name,
      url: formData.url,
      auth: buildAuthConfig(),
      enabled: true,
    };

    onServersChange([...servers, newServer]);
    resetForm();
  };

  const buildAuthConfig = () => {
    const auth: any = { method: formData.authMethod };

    switch (formData.authMethod) {
      case 'bearer':
        auth.bearerToken = formData.bearerToken;
        break;
      case 'oauth':
        auth.oauthClientId = formData.oauthClientId;
        auth.oauthClientSecret = formData.oauthClientSecret;
        auth.oauthTokenUrl = formData.oauthTokenUrl;
        auth.oauthScope = formData.oauthScope;
        break;
      case 'api-key':
        auth.apiKey = formData.apiKey;
        auth.apiKeyHeader = formData.apiKeyHeader;
        break;
      case 'basic':
        auth.username = formData.username;
        auth.password = formData.password;
        break;
      case 'custom':
        try {
          auth.customHeaders = JSON.parse(formData.customHeaders);
        } catch {
          auth.customHeaders = {};
        }
        break;
    }

    return auth;
  };

  const handleUpdateServer = () => {
    if (!editingServer || !formData.name || !formData.url) return;

    const updatedServers = servers.map((s) =>
      s.id === editingServer.id
        ? {
            ...s,
            name: formData.name,
            url: formData.url,
            auth: buildAuthConfig(),
          }
        : s
    );

    onServersChange(updatedServers);

    if (activeServer?.id === editingServer.id) {
      const updated = updatedServers.find(s => s.id === editingServer.id);
      if (updated) {
        onActiveServerChange(updated);
      }
    }

    resetForm();
  };

  const handleDeleteServer = (id: string) => {
    const updatedServers = servers.filter((s) => s.id !== id);
    onServersChange(updatedServers);

    if (activeServer?.id === id) {
      onActiveServerChange(updatedServers.length > 0 ? updatedServers[0] : null);
    }
  };

  const handleToggleServer = (id: string) => {
    const updatedServers = servers.map((s) =>
      s.id === id ? { ...s, enabled: !s.enabled } : s
    );
    onServersChange(updatedServers);

    const server = updatedServers.find((s) => s.id === id);
    if (server && !server.enabled && activeServer?.id === id) {
      const nextEnabled = updatedServers.find((s) => s.enabled);
      onActiveServerChange(nextEnabled || null);
    }
  };

  const handleSelectServer = (server: MCPServer) => {
    if (server.enabled) {
      onActiveServerChange(server);
    }
  };

  const startEdit = (server: MCPServer) => {
    setEditingServer(server);
    setFormData({
      name: server.name,
      url: server.url,
      authMethod: server.auth.method,
      bearerToken: server.auth.bearerToken || '',
      oauthClientId: server.auth.oauthClientId || '',
      oauthClientSecret: server.auth.oauthClientSecret || '',
      oauthTokenUrl: server.auth.oauthTokenUrl || '',
      oauthScope: server.auth.oauthScope || '',
      apiKey: server.auth.apiKey || '',
      apiKeyHeader: server.auth.apiKeyHeader || 'X-API-Key',
      username: server.auth.username || '',
      password: server.auth.password || '',
      customHeaders: server.auth.customHeaders ? JSON.stringify(server.auth.customHeaders, null, 2) : '',
    });
    setShowAddForm(false);
  };

  const resetForm = () => {
    setEditingServer(null);
    setShowAddForm(false);
    setFormData({
      name: '',
      url: '',
      authMethod: 'bearer',
      bearerToken: '',
      oauthClientId: '',
      oauthClientSecret: '',
      oauthTokenUrl: '',
      oauthScope: '',
      apiKey: '',
      apiKeyHeader: 'X-API-Key',
      username: '',
      password: '',
      customHeaders: '',
    });
  };

  const getAuthMethodIcon = (method: AuthMethod) => {
    switch (method) {
      case 'bearer': return '🔑';
      case 'oauth': return '🔐';
      case 'api-key': return '🗝️';
      case 'basic': return '👤';
      case 'custom': return '⚙️';
      default: return '🔒';
    }
  };

  const getAuthMethodLabel = (method: AuthMethod) => {
    switch (method) {
      case 'bearer': return 'Bearer Token / PAT';
      case 'oauth': return 'OAuth 2.0';
      case 'api-key': return 'API Key';
      case 'basic': return 'Basic Auth';
      case 'custom': return 'Custom Headers';
      default: return method;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden border border-slate-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">MCP Server Manager</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
          {/* Server List */}
          <div className="space-y-3 mb-6">
            {servers.map((server) => (
              <div
                key={server.id}
                className={`bg-slate-700/50 rounded-xl p-4 border transition-all ${
                  activeServer?.id === server.id
                    ? 'border-blue-500 shadow-lg shadow-blue-500/20'
                    : 'border-slate-600/50 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => handleSelectServer(server)}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          server.enabled ? 'bg-green-500' : 'bg-gray-500'
                        }`}
                      ></div>
                      <div>
                        <h3 className="text-white font-semibold">{server.name}</h3>
                        <p className="text-sm text-slate-400 truncate max-w-md">{server.url}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {getAuthMethodIcon(server.auth.method)} {getAuthMethodLabel(server.auth.method)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleServer(server.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        server.enabled
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                      }`}
                      title={server.enabled ? 'Disable' : 'Enable'}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => startEdit(server)}
                      className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                      title="Edit"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteServer(server.id)}
                      className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                      title="Delete"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add/Edit Form */}
          {(showAddForm || editingServer) && (
            <div className="bg-slate-700/30 rounded-xl p-6 border border-slate-600/50 space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">
                {editingServer ? 'Edit Server' : 'Add New Server'}
              </h3>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Server Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Production MCP Server"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Server URL
                </label>
                <input
                  type="text"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Authentication Method
                </label>
                <select
                  value={formData.authMethod}
                  onChange={(e) => setFormData({ ...formData, authMethod: e.target.value as AuthMethod })}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="bearer">🔑 Bearer Token / PAT</option>
                  <option value="oauth">🔐 OAuth 2.0</option>
                  <option value="api-key">🗝️ API Key</option>
                  <option value="basic">👤 Basic Authentication</option>
                  <option value="custom">⚙️ Custom Headers</option>
                </select>
              </div>

              {formData.authMethod === 'bearer' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Bearer Token / Personal Access Token
                  </label>
                  <input
                    type="password"
                    value={formData.bearerToken}
                    onChange={(e) => setFormData({ ...formData, bearerToken: e.target.value })}
                    placeholder="Bearer eyJhbGc..."
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {formData.authMethod === 'oauth' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Client ID</label>
                      <input
                        type="text"
                        value={formData.oauthClientId}
                        onChange={(e) => setFormData({ ...formData, oauthClientId: e.target.value })}
                        placeholder="client_id"
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Client Secret</label>
                      <input
                        type="password"
                        value={formData.oauthClientSecret}
                        onChange={(e) => setFormData({ ...formData, oauthClientSecret: e.target.value })}
                        placeholder="client_secret"
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Token URL</label>
                    <input
                      type="text"
                      value={formData.oauthTokenUrl}
                      onChange={(e) => setFormData({ ...formData, oauthTokenUrl: e.target.value })}
                      placeholder="https://auth.example.com/oauth/token"
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Scope (Optional)</label>
                    <input
                      type="text"
                      value={formData.oauthScope}
                      onChange={(e) => setFormData({ ...formData, oauthScope: e.target.value })}
                      placeholder="read write"
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              {formData.authMethod === 'api-key' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">API Key</label>
                    <input
                      type="password"
                      value={formData.apiKey}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                      placeholder="your_api_key_here"
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Header Name</label>
                    <input
                      type="text"
                      value={formData.apiKeyHeader}
                      onChange={(e) => setFormData({ ...formData, apiKeyHeader: e.target.value })}
                      placeholder="X-API-Key"
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              {formData.authMethod === 'basic' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="username"
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="password"
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {formData.authMethod === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Custom Headers (JSON format)
                  </label>
                  <textarea
                    value={formData.customHeaders}
                    onChange={(e) => setFormData({ ...formData, customHeaders: e.target.value })}
                    placeholder={'{\n  "X-Custom-Header": "value",\n  "Authorization": "Bearer token"\n}'}
                    rows={5}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                </div>
              )}

              <div className="flex space-x-3 pt-2">
                <button
                  onClick={editingServer ? handleUpdateServer : handleAddServer}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-semibold"
                >
                  {editingServer ? 'Update Server' : 'Add Server'}
                </button>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Add Button */}
          {!showAddForm && !editingServer && (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full bg-slate-700/50 hover:bg-slate-700 border-2 border-dashed border-slate-600 rounded-xl p-4 text-slate-300 hover:text-white transition-all flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add New Server</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
