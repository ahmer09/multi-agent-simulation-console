import React, { useEffect } from 'react';

const MODEL_OPTIONS = {
  claude: [
    { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
  ],
  gemini: [
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-2.5-pro-preview-05-06', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'o3-mini', label: 'o3-mini' },
  ],
};

export default function Settings({ config, setConfig }) {
  const update = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  // Auto-select first model when provider changes
  useEffect(() => {
    const models = MODEL_OPTIONS[config.provider] || [];
    const currentModelValid = models.some(m => m.value === config.model);
    if (!currentModelValid && models.length > 0) {
      update('model', models[0].value);
    }
  }, [config.provider]);

  const models = MODEL_OPTIONS[config.provider] || [];

  return (
    <div className="settings-section">
      <div className="setting-group">
        <label className="setting-label">LLM Provider</label>
        <select
          className="setting-select"
          value={config.provider}
          onChange={(e) => update('provider', e.target.value)}
        >
          <option value="claude">Anthropic Claude</option>
          <option value="gemini">Google Gemini</option>
          <option value="openai">OpenAI</option>
        </select>
      </div>

      <div className="setting-group">
        <label className="setting-label">Model</label>
        <select
          className="setting-select"
          value={config.model}
          onChange={(e) => update('model', e.target.value)}
        >
          {models.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      <div className="divider" />

      <div className="setting-group">
        <label className="setting-checkbox">
          <input
            type="checkbox"
            checked={config.useMock}
            onChange={(e) => update('useMock', e.target.checked)}
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Use Mock Mode
          </span>
        </label>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', marginTop: 4, paddingLeft: 22 }}>
          Simulate agents without API calls
        </div>
      </div>

      <div className="setting-group">
        <label className="setting-label">Max Sub-Agents</label>
        <input
          type="number"
          className="setting-input"
          value={config.maxSubAgents}
          onChange={(e) => update('maxSubAgents', parseInt(e.target.value) || 5)}
          min={1}
          max={10}
        />
      </div>

      <div className="setting-group">
        <label className="setting-label">Max Tool Calls / Agent</label>
        <input
          type="number"
          className="setting-input"
          value={config.maxToolCalls}
          onChange={(e) => update('maxToolCalls', parseInt(e.target.value) || 10)}
          min={1}
          max={25}
        />
      </div>
    </div>
  );
}
