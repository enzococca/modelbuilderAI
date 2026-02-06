import { useState, useEffect } from 'react';
import { Settings, Server, Key, Check, Loader2, Wifi, WifiOff } from 'lucide-react';
import { getSettings, updateSettings, getLocalModels } from '@/services/api';

interface SettingsData {
  ollama_base_url: string;
  lmstudio_base_url: string;
  anthropic_api_key_mask: string;
  openai_api_key_mask: string;
  google_api_key_mask: string;
  default_model: string;
}

export function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [ollamaUrl, setOllamaUrl] = useState('');
  const [lmstudioUrl, setLmstudioUrl] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [googleKey, setGoogleKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');
  const [lmstudioStatus, setLmstudioStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');

  useEffect(() => {
    getSettings().then((s: SettingsData) => {
      setData(s);
      setOllamaUrl(s.ollama_base_url);
      setLmstudioUrl(s.lmstudio_base_url);
      setAnthropicKey(s.anthropic_api_key_mask);
      setOpenaiKey(s.openai_api_key_mask);
      setGoogleKey(s.google_api_key_mask);
    }).catch(() => {});
  }, []);

  const testConnections = async () => {
    try {
      const models = await getLocalModels();
      const hasOllama = models.some(m => m.provider === 'ollama');
      const hasLmstudio = models.some(m => m.provider === 'lmstudio');
      setOllamaStatus(hasOllama ? 'online' : 'offline');
      setLmstudioStatus(hasLmstudio ? 'online' : 'offline');
    } catch {
      setOllamaStatus('offline');
      setLmstudioStatus('offline');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({
        ollama_base_url: ollamaUrl,
        lmstudio_base_url: lmstudioUrl,
        anthropic_api_key: anthropicKey,
        openai_api_key: openaiKey,
        google_api_key: googleKey,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const StatusIcon = ({ status }: { status: 'unknown' | 'online' | 'offline' }) => {
    if (status === 'online') return <Wifi className="w-4 h-4 text-green-400" />;
    if (status === 'offline') return <WifiOff className="w-4 h-4 text-red-400" />;
    return <Server className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8 overflow-y-auto h-full">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-indigo-400" />
        <h1 className="text-xl font-bold">Impostazioni</h1>
      </div>

      {/* Local Models */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Modelli Locali</h2>
          <button
            onClick={testConnections}
            className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded hover:bg-gray-800 transition-colors"
          >
            Test Connessione
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 flex items-center gap-2">
              <StatusIcon status={ollamaStatus} />
              Ollama URL
            </label>
            <input
              value={ollamaUrl}
              onChange={e => setOllamaUrl(e.target.value)}
              placeholder="http://localhost:11434"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 flex items-center gap-2">
              <StatusIcon status={lmstudioStatus} />
              LM Studio URL
            </label>
            <input
              value={lmstudioUrl}
              onChange={e => setLmstudioUrl(e.target.value)}
              placeholder="http://localhost:1234"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </section>

      {/* API Keys */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-yellow-400" />
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">API Keys</h2>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Anthropic API Key</label>
            <input
              value={anthropicKey}
              onChange={e => setAnthropicKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">OpenAI API Key</label>
            <input
              value={openaiKey}
              onChange={e => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Google API Key</label>
            <input
              value={googleKey}
              onChange={e => setGoogleKey(e.target.value)}
              placeholder="AIza..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <p className="text-[10px] text-gray-600">Le chiavi sono mascherate per sicurezza. Inserisci una nuova chiave per sostituirla.</p>
        </div>
      </section>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl text-sm font-medium transition-colors"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" />
          : saved ? <Check className="w-4 h-4" />
          : <Settings className="w-4 h-4" />}
        {saved ? 'Salvato!' : 'Salva Impostazioni'}
      </button>
    </div>
  );
}
