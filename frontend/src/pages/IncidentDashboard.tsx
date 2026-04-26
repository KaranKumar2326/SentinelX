import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient, socket } from '../api/client';
import { AlertTriangle, CheckCircle, Clock, Filter, Play, Zap, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const severityStyles: Record<string, { bg: string; text: string; border: string }> = {
  HIGH:     { bg: '#fff1f2', text: '#e11d48', border: '#fecdd3' },
  CRITICAL: { bg: '#fff1f2', text: '#9f1239', border: '#fda4af' },
  MEDIUM:   { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  LOW:      { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
};

const LiveTimer = ({ createdAt, status }: { createdAt: string, status: string }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(createdAt).getTime();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [createdAt]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const isBreached = status === 'OPEN' && minutes >= 15;

  return (
    <span className={clsx(
      "font-mono text-xs font-bold px-2 py-0.5 rounded",
      isBreached ? "bg-rose-100 text-rose-600 animate-pulse border border-rose-200" : "text-slate-400"
    )}>
      {isBreached ? '⚠️ SLA BREACH: ' : ''}{minutes}m {seconds}s
    </span>
  );
};

const statusStyles: Record<string, string> = {
  OPEN:          'text-rose-600 font-semibold',
  INVESTIGATING: 'text-amber-600 font-semibold',
  RESOLVED:      'text-emerald-600 font-semibold',
};

const IncidentDashboard = () => {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('');

  const { data: incidents, isLoading } = useQuery({
    queryKey: ['incidents', filterStatus],
    queryFn: async () => {
      const res = await apiClient.get('/incidents', { params: { status: filterStatus } });
      // The backend now returns { data: [], pagination: {} }
      const incidentArray = Array.isArray(res.data.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      // Filter out redundant cascaded incidents for a cleaner primary view
      return incidentArray.filter((inc: any) => !inc.parentId);
    }
  });

  const { data: metrics } = useQuery({
    queryKey: ['metrics'],
    queryFn: async () => {
      const res = await apiClient.get('/incidents/metrics');
      return res.data;
    }
  });

  const { data: trends } = useQuery({
    queryKey: ['trends'],
    queryFn: async () => {
      const res = await apiClient.get('/incidents/trends');
      return res.data;
    }
  });

  const simulateMutation = useMutation({
    mutationFn: () => apiClient.post('/incidents/simulate'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success('Detection check triggered. New incidents injected!');
    }
  });

  const simulateFixMutation = useMutation({
    mutationFn: () => apiClient.post('/incidents/simulate-fix'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      toast.success('Pipeline fixed! Auto-Resolution engine swept open incidents ✅', { duration: 4000 });
    },
    onError: () => toast.error('Simulation failed')
  });

  useEffect(() => {
    socket.on('new_incident', () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['trends'] });
    });
    socket.on('incident_resolved', (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      toast.success(`⚡ Auto-Resolved: ${data.entityName} (${data.type})`, { duration: 5000 });
    });
    return () => { socket.off('new_incident'); socket.off('incident_resolved'); };
  }, [queryClient]);

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading Incidents...</div>
  );

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard title="Total Incidents" value={metrics?.totalIncidents ?? 0} icon={<AlertTriangle size={20} />} iconColor="#6366f1" />
        <KPICard title="Active Alerts"   value={(metrics?.totalIncidents ?? 0) - (metrics?.resolvedIncidents ?? 0)}  icon={<Clock size={20} />}          iconColor="#f59e0b" accent />
        <KPICard title="Critical"        value={metrics?.criticalIncidents ?? 0} icon={<AlertTriangle size={20} />} iconColor="#e11d48" />
        <KPICard title="MTTR"           value={metrics?.mttr ?? '0h'}  icon={<CheckCircle size={20} />}     iconColor="#10b981" />
        <KPICard title="MTTA (min)"      value={metrics?.mtta ?? 0}  icon={<TrendingUp size={20} />}      iconColor="#6366f1" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-700">Incident Volume — Last 7 Days</h3>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends || []}>
                <defs>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', color: '#0f172a' }} itemStyle={{ color: '#6366f1' }} />
                <Line type="monotone" dataKey="total" stroke="url(#lineGrad)" strokeWidth={3} dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6 flex flex-col items-center justify-center text-center gap-2">
          <div className="text-6xl font-black" style={{
            background: 'linear-gradient(135deg, #10b981, #059669)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>92%</div>
          <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Global Platform Health</div>
          <div className="w-full h-2 rounded-full bg-slate-100 mt-2 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-400" style={{ width: '92%' }} />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="glass-card px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Filter size={16} className="text-slate-400" />
          <select
            className="text-sm font-medium rounded-lg px-3 py-2 outline-none focus:ring-2"
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569' }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => simulateMutation.mutate()}
            disabled={simulateMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}
          >
            <Play size={14} /> Simulate Failure
          </button>
          <button
            onClick={() => simulateFixMutation.mutate()}
            disabled={simulateFixMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
          >
            <Zap size={14} /> Simulate Pipeline Fix
          </button>
        </div>
      </div>

      {/* Incident Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {['Severity', 'Status', 'Entity', 'Description', 'SLA / Detection', 'Action'].map(h => (
                <th key={h} className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {incidents?.map((incident: any, i: number) => {
              const sev = severityStyles[incident.severity] || severityStyles.LOW;
              return (
                <tr key={incident.id}
                  style={{ borderBottom: i < incidents.length - 1 ? '1px solid #f1f5f9' : 'none' }}
                  className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <span className="status-badge" style={{ background: sev.bg, color: sev.text, border: `1px solid ${sev.border}` }}>
                      {incident.severity}
                    </span>
                  </td>
                  <td className={`px-5 py-4 text-sm ${statusStyles[incident.status] || ''}`}>{incident.status}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-slate-800">{incident.entityName}</td>
                  <td className="px-5 py-4 text-sm text-slate-500 max-w-xs truncate">{incident.description}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1">
                       <LiveTimer createdAt={incident.createdAt} status={incident.status} />
                       <span className="text-[10px] text-slate-400 pl-2">Detected: {new Date(incident.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <Link to={`/incidents/${incident.id}`}
                      className="text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      style={{ background: '#eef2ff', color: '#6366f1' }}>
                      View RCA →
                    </Link>
                  </td>
                </tr>
              );
            })}
            {(!incidents || incidents.length === 0) && (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400 text-sm">No incidents found. Click "Simulate Failure" to generate demo data.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, icon, iconColor, accent }: { title: string; value: number; icon: React.ReactNode; iconColor: string; accent?: boolean }) => (
  <div className="glass-card p-5 flex items-center gap-4">
    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: `${iconColor}18`, color: iconColor }}>
      {icon}
    </div>
    <div>
      <p className="text-xs text-slate-500 font-medium mb-0.5">{title}</p>
      <p className="text-2xl font-black" style={{ color: accent ? iconColor : '#0f172a' }}>{value}</p>
    </div>
  </div>
);

export default IncidentDashboard;
