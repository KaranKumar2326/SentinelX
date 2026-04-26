import { Mail, CheckCircle, Clock, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const mockDispatches = [
  { id: 'disp-1', channel: 'Email', recipient: 'data_team@company.com', status: 'Delivered', time: '10 mins ago', incident: 'DQ_FAILURE' },
  { id: 'disp-2', channel: 'Slack', recipient: '#data-incidents', status: 'Delivered', time: '1 hour ago', incident: 'STALE_DATA' },
  { id: 'disp-3', channel: 'Email', recipient: 'ankitrawat7107@gmail.com', status: 'Pending', time: 'Just now', incident: 'MISSING_OWNER' },
];

const AlertsPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Alert Dispatch Log</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor all outgoing notifications and webhook deliveries.</p>
        </div>
        <button
          onClick={() => toast.success('Webhook modal opened (Mock Mode)')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
          <Plus size={16} /> Add Webhook
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Dispatches (24h)', value: '1,204', color: '#0f172a' },
          { label: 'Delivery Success Rate', value: '99.8%', color: '#10b981' },
          { label: 'Active Channels', value: '4', color: '#0f172a' },
        ].map(stat => (
          <div key={stat.label} className="glass-card p-5">
            <div className="text-xs text-slate-500 font-medium mb-1">{stat.label}</div>
            <div className="text-3xl font-black" style={{ color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left">
          <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <tr>
              {['Channel', 'Recipient', 'Time', 'Incident Trigger', 'Status'].map(h => (
                <th key={h} className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mockDispatches.map((d, i) => (
              <tr key={d.id} className="hover:bg-slate-50 transition-colors"
                style={{ borderBottom: i < mockDispatches.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#eef2ff' }}>
                      <Mail size={15} className="text-indigo-600" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{d.channel}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600 font-medium">{d.recipient}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-sm text-slate-400">
                    <Clock size={13} /> {d.time}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-mono font-semibold px-2 py-1 rounded-md"
                    style={{ background: '#f1f5f9', color: '#475569' }}>{d.incident}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {d.status === 'Delivered' ? (
                      <CheckCircle size={15} className="text-emerald-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                    )}
                    <span className={`text-sm font-semibold ${d.status === 'Delivered' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {d.status}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AlertsPage;
