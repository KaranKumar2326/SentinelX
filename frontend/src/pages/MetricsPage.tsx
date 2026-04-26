import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const mockDomainData = [
  { name: 'Core Entity', incidents: 42 },
  { name: 'Marketing', incidents: 12 },
  { name: 'Sales', incidents: 38 },
  { name: 'Finance', incidents: 5 },
  { name: 'Product', incidents: 19 },
];

const MetricsPage = () => {
  const { data: trends } = useQuery({
    queryKey: ['trends'],
    queryFn: async () => {
      const res = await apiClient.get('/incidents/trends');
      return res.data;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Platform Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Historical health and incident frequency across your data platform.</p>
        </div>
        <div className="text-sm font-semibold px-4 py-2 rounded-xl"
          style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }}>
          Last 30 Days
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass-card p-6">
          <h3 className="text-sm font-bold text-slate-700 mb-5">Incident Frequency (7-Day Trend)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends || []}>
                <defs>
                  <linearGradient id="grad1" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#0f172a', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} itemStyle={{ color: '#6366f1' }} />
                <Line type="monotone" dataKey="total" name="Total" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="critical" name="Critical" stroke="#e11d48" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-sm font-bold text-slate-700 mb-5">Incidents by Business Domain</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockDomainData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={80} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#0f172a' }} />
                <Bar dataKey="incidents" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsPage;
