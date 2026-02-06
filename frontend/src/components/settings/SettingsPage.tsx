import { useState, useEffect } from 'react';
import { Settings, Server, Key, Check, Loader2, Wifi, WifiOff, HardDrive, Mail } from 'lucide-react';
import { getSettings, updateSettings, getLocalModels } from '@/services/api';

interface SettingsData {
  ollama_base_url: string;
  lmstudio_base_url: string;
  anthropic_api_key_mask: string;
  openai_api_key_mask: string;
  google_api_key_mask: string;
  default_model: string;
  // Cloud storage
  dropbox_app_key_mask: string;
  dropbox_app_secret_mask: string;
  dropbox_refresh_token_mask: string;
  google_drive_credentials_json: string;
  google_drive_delegated_user: string;
  microsoft_tenant_id: string;
  microsoft_client_id: string;
  microsoft_client_secret_mask: string;
  microsoft_user_id: string;
  file_search_local_roots: string;
  // Email
  gmail_credentials_json: string;
  gmail_token_json: string;
  imap_server: string;
  imap_port: number;
  imap_username: string;
  imap_password_mask: string;
  imap_use_ssl: boolean;
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
  // Cloud storage
  const [dropboxAppKey, setDropboxAppKey] = useState('');
  const [dropboxAppSecret, setDropboxAppSecret] = useState('');
  const [dropboxRefreshToken, setDropboxRefreshToken] = useState('');
  const [gdriveCredsJson, setGdriveCredsJson] = useState('');
  const [gdriveDelegatedUser, setGdriveDelegatedUser] = useState('');
  const [msTenantId, setMsTenantId] = useState('');
  const [msClientId, setMsClientId] = useState('');
  const [msClientSecret, setMsClientSecret] = useState('');
  const [msUserId, setMsUserId] = useState('');
  const [localRoots, setLocalRoots] = useState('');
  // Email
  const [gmailCredsJson, setGmailCredsJson] = useState('');
  const [gmailTokenJson, setGmailTokenJson] = useState('');
  const [imapServer, setImapServer] = useState('');
  const [imapPort, setImapPort] = useState(993);
  const [imapUsername, setImapUsername] = useState('');
  const [imapPassword, setImapPassword] = useState('');
  const [imapUseSsl, setImapUseSsl] = useState(true);

  useEffect(() => {
    getSettings().then((s: SettingsData) => {
      setData(s);
      setOllamaUrl(s.ollama_base_url);
      setLmstudioUrl(s.lmstudio_base_url);
      setAnthropicKey(s.anthropic_api_key_mask);
      setOpenaiKey(s.openai_api_key_mask);
      setGoogleKey(s.google_api_key_mask);
      // Cloud
      setDropboxAppKey(s.dropbox_app_key_mask || '');
      setDropboxAppSecret(s.dropbox_app_secret_mask || '');
      setDropboxRefreshToken(s.dropbox_refresh_token_mask || '');
      setGdriveCredsJson(s.google_drive_credentials_json || '');
      setGdriveDelegatedUser(s.google_drive_delegated_user || '');
      setMsTenantId(s.microsoft_tenant_id || '');
      setMsClientId(s.microsoft_client_id || '');
      setMsClientSecret(s.microsoft_client_secret_mask || '');
      setMsUserId(s.microsoft_user_id || '');
      setLocalRoots(s.file_search_local_roots || '');
      // Email
      setGmailCredsJson(s.gmail_credentials_json || '');
      setGmailTokenJson(s.gmail_token_json || '');
      setImapServer(s.imap_server || '');
      setImapPort(s.imap_port || 993);
      setImapUsername(s.imap_username || '');
      setImapPassword(s.imap_password_mask || '');
      setImapUseSsl(s.imap_use_ssl ?? true);
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
        // Cloud storage
        dropbox_app_key: dropboxAppKey,
        dropbox_app_secret: dropboxAppSecret,
        dropbox_refresh_token: dropboxRefreshToken,
        google_drive_credentials_json: gdriveCredsJson,
        google_drive_delegated_user: gdriveDelegatedUser,
        microsoft_tenant_id: msTenantId,
        microsoft_client_id: msClientId,
        microsoft_client_secret: msClientSecret,
        microsoft_user_id: msUserId,
        file_search_local_roots: localRoots,
        // Email
        gmail_credentials_json: gmailCredsJson,
        gmail_token_json: gmailTokenJson,
        imap_server: imapServer,
        imap_port: imapPort,
        imap_username: imapUsername,
        imap_password: imapPassword,
        imap_use_ssl: imapUseSsl,
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

      {/* Cloud Storage & File Search */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Cloud Storage & File Search</h2>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-gray-500 font-medium">Dropbox</p>
          <div className="grid grid-cols-1 gap-2">
            <input value={dropboxAppKey} onChange={e => setDropboxAppKey(e.target.value)} placeholder="Dropbox App Key" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500" />
            <input value={dropboxAppSecret} onChange={e => setDropboxAppSecret(e.target.value)} placeholder="Dropbox App Secret" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500" />
            <input value={dropboxRefreshToken} onChange={e => setDropboxRefreshToken(e.target.value)} placeholder="Dropbox Refresh Token" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500" />
          </div>

          <p className="text-xs text-gray-500 font-medium pt-2">Google Drive</p>
          <div className="grid grid-cols-1 gap-2">
            <input value={gdriveCredsJson} onChange={e => setGdriveCredsJson(e.target.value)} placeholder="Path to service account JSON" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
            <input value={gdriveDelegatedUser} onChange={e => setGdriveDelegatedUser(e.target.value)} placeholder="Delegated user email (optional)" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
          </div>

          <p className="text-xs text-gray-500 font-medium pt-2">Microsoft (OneDrive + Outlook)</p>
          <div className="grid grid-cols-2 gap-2">
            <input value={msTenantId} onChange={e => setMsTenantId(e.target.value)} placeholder="Tenant ID" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500" />
            <input value={msClientId} onChange={e => setMsClientId(e.target.value)} placeholder="Client ID" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500" />
            <input value={msClientSecret} onChange={e => setMsClientSecret(e.target.value)} placeholder="Client Secret" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500" />
            <input value={msUserId} onChange={e => setMsUserId(e.target.value)} placeholder="User ID (optional)" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
          </div>

          <p className="text-xs text-gray-500 font-medium pt-2">Local File Search</p>
          <input value={localRoots} onChange={e => setLocalRoots(e.target.value)} placeholder="/Users/enzo/Documents, /Users/enzo/Desktop" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
          <p className="text-[10px] text-gray-600">Cartelle separate da virgola. Vuoto = home directory.</p>
        </div>
      </section>

      {/* Email Search */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Email Search</h2>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-gray-500 font-medium">Gmail</p>
          <div className="grid grid-cols-1 gap-2">
            <input value={gmailCredsJson} onChange={e => setGmailCredsJson(e.target.value)} placeholder="Path to OAuth credentials JSON" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
            <input value={gmailTokenJson} onChange={e => setGmailTokenJson(e.target.value)} placeholder="Path to token.json (cached)" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
          </div>

          <p className="text-xs text-gray-500 font-medium pt-2">IMAP (generico)</p>
          <div className="grid grid-cols-2 gap-2">
            <input value={imapServer} onChange={e => setImapServer(e.target.value)} placeholder="IMAP server (es. imap.gmail.com)" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
            <input type="number" value={imapPort} onChange={e => setImapPort(parseInt(e.target.value, 10))} placeholder="Port (993)" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
            <input value={imapUsername} onChange={e => setImapUsername(e.target.value)} placeholder="Username" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
            <input type="password" value={imapPassword} onChange={e => setImapPassword(e.target.value)} placeholder="Password / App password" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500" />
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-400">
            <input type="checkbox" checked={imapUseSsl} onChange={e => setImapUseSsl(e.target.checked)} className="rounded" />
            Use SSL (port 993)
          </label>

          <p className="text-[10px] text-gray-600">Outlook usa le stesse credenziali Microsoft (sopra).</p>
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
