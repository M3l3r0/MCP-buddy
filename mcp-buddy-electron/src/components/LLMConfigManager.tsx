import { useState } from 'react';
import { LLMConfig } from '../types';

interface LLMConfigManagerProps {
  llmConfigs: LLMConfig[];
  activeLLM: LLMConfig | null;
  onClose: () => void;
  onConfigsChange: (configs: LLMConfig[]) => void;
  onActiveLLMChange: (config: LLMConfig | null) => void;
}

export default function LLMConfigManager({
  llmConfigs,
  activeLLM,
  onClose,
  onConfigsChange,
  onActiveLLMChange,
}: LLMConfigManagerProps) {
  const [editingConfig, setEditingConfig] = useState<LLMConfig | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    provider: 'snowflake' as LLMConfig['provider'],
    endpoint: '',
    apiKey: '',
    model: '',
    maxTokens: 2000,
    temperature: 0.7,
    customHeaders: '',
  });

  const handleAddConfig = () => {
    if (!formData.name) return;

    let headers = undefined;
    if (formData.customHeaders) {
      try {
        headers = JSON.parse(formData.customHeaders);
      } catch (e) {
        headers = { Authorization: formData.customHeaders };
      }
    } else if (formData.apiKey && !['snowflake', 'anthropic'].includes(formData.provider)) {
      headers = { Authorization: `Bearer ${formData.apiKey}` };
    }

    const newConfig: LLMConfig = {
      id: Date.now().toString(),
      name: formData.name,
      provider: formData.provider,
      enabled: true,
      config: {
        endpoint: formData.endpoint || undefined,
        apiKey: formData.apiKey || undefined,
        model: formData.model || undefined,
        maxTokens: formData.maxTokens,
        temperature: formData.temperature,
        headers,
      },
    };

    onConfigsChange([...llmConfigs, newConfig]);
    resetForm();
  };

  const handleUpdateConfig = () => {
    if (!editingConfig || !formData.name) return;

    let headers = undefined;
    if (formData.customHeaders) {
      try {
        headers = JSON.parse(formData.customHeaders);
      } catch (e) {
        headers = { Authorization: formData.customHeaders };
      }
    } else if (formData.apiKey && !['snowflake', 'anthropic'].includes(formData.provider)) {
      headers = { Authorization: `Bearer ${formData.apiKey}` };
    }

    const updatedConfigs = llmConfigs.map((c) =>
      c.id === editingConfig.id
        ? {
            ...c,
            name: formData.name,
            provider: formData.provider,
            config: {
              endpoint: formData.endpoint || undefined,
              apiKey: formData.apiKey || undefined,
              model: formData.model || undefined,
              maxTokens: formData.maxTokens,
              temperature: formData.temperature,
              headers,
            },
          }
        : c
    );

    onConfigsChange(updatedConfigs);

    if (activeLLM?.id === editingConfig.id) {
      const updated = updatedConfigs.find(c => c.id === editingConfig.id);
      if (updated) {
        onActiveLLMChange(updated);
      }
    }

    resetForm();
  };

  const handleDeleteConfig = (id: string) => {
    const updatedConfigs = llmConfigs.filter((c) => c.id !== id);
    onConfigsChange(updatedConfigs);

    if (activeLLM?.id === id) {
      onActiveLLMChange(null);
    }
  };

  const handleToggleConfig = (id: string) => {
    const updatedConfigs = llmConfigs.map((c) =>
      c.id === id ? { ...c, enabled: !c.enabled } : c
    );
    onConfigsChange(updatedConfigs);

    const config = updatedConfigs.find((c) => c.id === id);
    if (config && !config.enabled && activeLLM?.id === id) {
      onActiveLLMChange(null);
    }
  };

  const handleSelectConfig = (config: LLMConfig) => {
    if (config.enabled) {
      onActiveLLMChange(config);
    }
  };

  const startEdit = (config: LLMConfig) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      provider: config.provider,
      endpoint: config.config.endpoint || '',
      apiKey: config.config.apiKey || '',
      model: config.config.model || '',
      maxTokens: config.config.maxTokens || 2000,
      temperature: config.config.temperature || 0.7,
      customHeaders: config.config.headers ? JSON.stringify(config.config.headers, null, 2) : '',
    });
    setShowAddForm(false);
  };

  const resetForm = () => {
    setEditingConfig(null);
    setShowAddForm(false);
    setFormData({
      name: '',
      provider: 'snowflake',
      endpoint: '',
      apiKey: '',
      model: '',
      maxTokens: 2000,
      temperature: 0.7,
      customHeaders: '',
    });
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'snowflake': return '❄️';
      case 'openai': return '🤖';
      case 'anthropic': return '🧠';
      case 'other': return '🔮';
      case 'custom': return '⚙️';
      default: return '💡';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden border border-slate-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">LLM Configuration</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          {/* Active LLM Notice */}
          {activeLLM ? (
            <div className="mb-4 bg-green-900/20 border border-green-700/50 rounded-lg px-4 py-3">
              <p className="text-sm text-green-300">
                <span className="font-semibold">Active LLM:</span> {activeLLM.name} ({getProviderIcon(activeLLM.provider)} {activeLLM.provider})
              </p>
              <p className="text-xs text-green-400 mt-1">
                MCP responses will be enhanced with AI reasoning
              </p>
            </div>
          ) : (
            <div className="mb-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg px-4 py-3">
              <p className="text-sm text-yellow-300">
                No LLM configured. MCP responses will be shown as-is.
              </p>
            </div>
          )}

          {/* Config List */}
          <div className="space-y-3 mb-6">
            {llmConfigs.map((config) => (
              <div
                key={config.id}
                className={`bg-slate-700/50 rounded-xl p-4 border transition-all ${
                  activeLLM?.id === config.id
                    ? 'border-purple-500 shadow-lg shadow-purple-500/20'
                    : 'border-slate-600/50 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => handleSelectConfig(config)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{getProviderIcon(config.provider)}</div>
                      <div
                        className={`w-3 h-3 rounded-full ${
                          config.enabled ? 'bg-green-500' : 'bg-gray-500'
                        }`}
                      ></div>
                      <div>
                        <h3 className="text-white font-semibold">{config.name}</h3>
                        <p className="text-sm text-slate-400">
                          {config.provider.charAt(0).toUpperCase() + config.provider.slice(1)}
                          {config.config.model && ` • ${config.config.model}`}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleConfig(config.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        config.enabled
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                      }`}
                      title={config.enabled ? 'Disable' : 'Enable'}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => startEdit(config)}
                      className="p-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
                      title="Edit"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteConfig(config.id)}
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
          {(showAddForm || editingConfig) && (
            <div className="bg-slate-700/30 rounded-xl p-6 border border-slate-600/50 space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">
                {editingConfig ? 'Edit LLM Configuration' : 'Add New LLM'}
              </h3>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Snowflake Cortex"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Provider</label>
                <select
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value as LLMConfig['provider'] })}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="snowflake">❄️ Snowflake Cortex</option>
                  <option value="openai">🤖 OpenAI</option>
                  <option value="anthropic">🧠 Anthropic</option>
                  <option value="other">🔮 Other Provider</option>
                  <option value="custom">⚙️ Custom Endpoint</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Model {formData.provider === 'snowflake' && '(e.g., mistral-large2)'}
                </label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder={formData.provider === 'snowflake' ? 'mistral-large2' : 'gpt-4, claude-3-opus, etc.'}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  API Endpoint {formData.provider !== 'snowflake' && '(optional)'}
                </label>
                <input
                  type="text"
                  value={formData.endpoint}
                  onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  API Key / Bearer Token
                </label>
                <input
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder="sk-... or Bearer token"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {(formData.provider === 'other' || formData.provider === 'custom') && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Custom Headers (Optional - JSON format)
                  </label>
                  <textarea
                    value={formData.customHeaders}
                    onChange={(e) => setFormData({ ...formData, customHeaders: e.target.value })}
                    placeholder='{"X-Custom-Header": "value", "Authorization": "Bearer token"}'
                    rows={3}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Temperature (0-1)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={formData.temperature}
                    onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Max Tokens
                  </label>
                  <input
                    type="number"
                    value={formData.maxTokens}
                    onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={editingConfig ? handleUpdateConfig : handleAddConfig}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {editingConfig ? 'Update Configuration' : 'Add Configuration'}
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
          {!showAddForm && !editingConfig && (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full bg-slate-700/50 hover:bg-slate-700 border-2 border-dashed border-slate-600 rounded-xl p-4 text-slate-300 hover:text-white transition-all flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add New LLM Configuration</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
