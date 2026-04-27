import { useState, useEffect } from 'react';
import { Mail, CheckCircle, Clock, Plus, Bell, Smartphone, Loader, XCircle } from 'lucide-react';
import { apiClient } from '../api/client';
import toast from 'react-hot-toast';

const AlertsPage = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ total: 0, successRate: '100%', activeChannels: 2 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [logsRes, statsRes] = await Promise.all([
          apiClient.get('/alerts'),
          apiClient.get('/alerts/stats')
        ]);
        setLogs(logsRes.data);
        setStats(statsRes.data);
      } catch (err) {
        console.error('Failed to fetch alerts:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader className="animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl heading-serif text-slate-900">Alert Dispatch Log</h1>
          <p className="text-sm text-slate-500 mt-1">Audit trail for all automated outgoing notifications.</p>
        </div>
        <button
          onClick={() => toast.success('Webhook system fully active.')}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all">
          <Plus size={16} /> Add Webhook
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Dispatches (Lifetime)', value: stats.total, color: '#0f172a' },
          { label: 'Delivery Success Rate', value: stats.successRate, color: '#10b981' },
          { label: 'Active Channels', value: stats.activeChannels, color: '#0f172a' },
        ].map(stat => (
          <div key={stat.label} className="glass-card p-5">
            <div className="text-xs text-slate-500 font-medium mb-1">{stat.label}</div>
            <div className="text-3xl font-black" style={{ color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        {logs.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Bell size={40} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-500 font-medium">No alerts dispatched yet.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                {['Channel', 'Recipient', 'Time', 'Incident Type', 'Status'].map(h => (
                  <th key={h} className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((d, i) => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors"
                  style={{ borderBottom: i < logs.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: d.channel === 'Email' ? '#eef2ff' : '#ecfdf5' }}>
                        {d.channel === 'Email' ? <Mail size={15} className="text-indigo-600" /> : <Smartphone size={15} className="text-emerald-600" />}
                      </div>
                      <span className="text-sm font-semibold text-slate-700">{d.channel}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-medium truncate max-w-[200px]">{d.recipient}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-slate-400">
                      <Clock size={13} /> {formatTime(d.time)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-mono font-semibold px-2 py-1 rounded-md"
                      style={{ background: '#f1f5f9', color: '#475569' }}>{d.type}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {d.status === 'Delivered' ? (
                        <CheckCircle size={15} className="text-emerald-500" />
                      ) : (
                        <XCircle size={15} className="text-rose-500" />
                      )}
                      <span className={`text-sm font-semibold ${d.status === 'Delivered' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {d.status}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AlertsPage;
