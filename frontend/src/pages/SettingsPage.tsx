import { useState, useEffect } from 'react';
import { Bell, Shield, Database, CheckCircle, XCircle, Loader, Zap } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

const Section = ({ icon, iconBg, title, children }: any) => (
  <div className="glass-card overflow-hidden">
    <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: '1px solid #f1f5f9', background: '#fafafe' }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: iconBg }}>{icon}</div>
      <h2 className="text-sm font-bold text-slate-700">{title}</h2>
    </div>
    <div className="p-6 space-y-4">{children}</div>
  </div>
);

const SettingsPage = () => {
  const { user } = useAuth();
  const [omUrl, setOmUrl] = useState('');
  const [omToken, setOmToken] = useState('');
  const [airflowUrl, setAirflowUrl] = useState('');
  const [airflowUser, setAirflowUser] = useState('');
  const [airflowPass, setAirflowPass] = useState('');
  const [webhookUrl, setWebhookUrl] = useState(
    import.meta.env.VITE_SLACK_WEBHOOK_URL || ''
  );
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [connectionMsg, setConnectionMsg] = useState('');
  const [omConnected, setOmConnected] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient.get('/settings').then(res => {
      setOmUrl(res.data.omUrl || '');
      setOmConnected(res.data.omConnected || false);
      setAirflowUrl(res.data.airflowUrl || '');
      setAirflowUser(res.data.airflowUser || '');
      if (res.data.omToken) setOmToken(''); // Don't pre-fill masked token
    }).catch(() => { });
  }, []);

  const handleTestConnection = async () => {
    if (!omUrl || !omToken) {
      toast.error('Please enter both the URL and token first.');
      return;
    }
    setConnectionStatus('testing');
    setConnectionMsg('');
    try {
      const res = await apiClient.post('/settings/test-connection', { omUrl, omToken });
      setConnectionStatus('success');
      setConnectionMsg(res.data.message);
      setOmConnected(true);
    } catch (err: any) {
      setConnectionStatus('error');
      setConnectionMsg(err.response?.data?.message || 'Connection failed');
    }
  };

  const handleSaveConnection = async () => {
    if (!omUrl || !omToken) {
      toast.error('Test and verify the connection first.');
      return;
    }
    setSaving(true);
    try {
      await apiClient.put('/settings', {
        omUrl, omToken,
        airflowUrl, airflowUser, airflowPass
      });
      toast.success('Settings saved successfully!');
    } catch {
      toast.error('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Configure your workspace and data connections.</p>
      </div>

      {/* OpenMetadata Connection */}
      <Section icon={<Database size={16} className="text-indigo-500" />} iconBg="#eef2ff" title="OpenMetadata Connection">
        <div className="flex items-center gap-2 mb-2">
          {omConnected
            ? <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100"><CheckCircle size={12} /> Connected</span>
            : <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-200"><XCircle size={12} /> Not Connected</span>
          }
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">OpenMetadata Server URL</label>
          <input
            type="url"
            value={omUrl}
            onChange={e => setOmUrl(e.target.value)}
            placeholder="http://192.168.1.X:8585"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
          />
          <p className="text-xs text-slate-400 mt-1">Include http:// but no trailing slash or /api/v1</p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">API Token</label>
          <input
            type="password"
            value={omToken}
            onChange={e => setOmToken(e.target.value)}
            placeholder="Paste your OpenMetadata JWT token"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
          />
          <p className="text-xs text-slate-400 mt-1">Found in OpenMetadata → My Profile → Access Token</p>
        </div>

        {connectionMsg && (
          <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium border ${connectionStatus === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
            {connectionStatus === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
            {connectionMsg}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleTestConnection}
            disabled={connectionStatus === 'testing'}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all disabled:opacity-50">
            {connectionStatus === 'testing' ? <Loader size={14} className="animate-spin" /> : <Database size={14} />}
            {connectionStatus === 'testing' ? 'Testing...' : 'Test Connection'}
          </button>
          <button
            onClick={handleSaveConnection}
            disabled={saving || connectionStatus !== 'success'}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            {saving ? 'Saving...' : 'Save Connection'}
          </button>
        </div>
      </Section>

      {/* Airflow Connection */}
      <Section icon={<Zap size={16} className="text-blue-500" />} iconBg="#eff6ff" title="Pipeline Orchestration (Airflow)">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Airflow Web Server URL</label>
            <input
              type="url"
              value={airflowUrl}
              onChange={e => setAirflowUrl(e.target.value)}
              placeholder="http://airflow-server:8080"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">API Username</label>
            <input
              type="text"
              value={airflowUser}
              onChange={e => setAirflowUser(e.target.value)}
              placeholder="admin"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">API Password</label>
            <input
              type="password"
              value={airflowPass}
              onChange={e => setAirflowPass(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
        </div>
        <p className="text-xs text-slate-400">SentinelX uses the Airflow REST API to trigger DAG runs for self-healing.</p>
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSaveConnection}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all bg-blue-600 hover:bg-blue-700 shadow-md">
            {saving ? 'Saving...' : 'Save Airflow Settings'}
          </button>
        </div>
      </Section>

      {/* Notification Channels */}
      <Section icon={<Bell size={16} className="text-amber-500" />} iconBg="#fffbeb" title="Notification Channels">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Slack Webhook URL</label>
          <input
            type="url"
            value={webhookUrl}
            onChange={e => setWebhookUrl(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
          />
          <p className="text-xs text-slate-400 mt-1">SentinelX will post incident alerts to this Slack channel.</p>
        </div>
        <div className="flex items-center justify-between py-3" style={{ borderTop: '1px solid #f1f5f9' }}>
          <div>
            <div className="text-sm font-semibold text-slate-700">Email Alerts</div>
            <div className="text-xs text-slate-400">Receive critical alerts via email</div>
          </div>
          <div className="w-10 h-6 rounded-full bg-indigo-500 relative cursor-pointer">
            <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white shadow-sm" />
          </div>
        </div>
      </Section>

      {/* Account */}
      <Section icon={<Shield size={16} className="text-slate-500" />} iconBg="#f8fafc" title="Account">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{user?.name}</p>
            <p className="text-xs text-slate-400">{user?.email}</p>
          </div>
        </div>
      </Section>
    </div>
  );
};

export default SettingsPage;
