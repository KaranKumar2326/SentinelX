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
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 8;

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl heading-serif text-slate-900">Incident Command Center</h1>
          <p className="text-sm text-slate-500 mt-1">Autonomous metadata failure detection and real-time response triage.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => simulateMutation.mutate()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all active:scale-95"
          >
            <Play size={14} fill="currentColor" /> Simulate Failure
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard title="Total Incidents" value={metrics?.totalIncidents ?? 0} icon={<AlertTriangle size={20} />} iconColor="#0369a1" />
        <KPICard title="Active Alerts"   value={(metrics?.totalIncidents ?? 0) - (metrics?.resolvedIncidents ?? 0)}  icon={<Clock size={20} />}          iconColor="#f59e0b" accent />
        <KPICard title="Critical"        value={metrics?.criticalIncidents ?? 0} icon={<AlertTriangle size={20} />} iconColor="#e11d48" />
        <KPICard title="MTTR"           value={metrics?.mttr ?? '0h'}  icon={<CheckCircle size={20} />}     iconColor="#10b981" />
        <KPICard title="MTTA (min)"      value={metrics?.mtta ?? 0}  icon={<TrendingUp size={20} />}      iconColor="#0369a1" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-blue-500" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Incident Volume — Last 7 Days</h3>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends || []}>
                <defs>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#0369a1" />
                    <stop offset="100%" stopColor="#0ea5e9" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e8e8ee', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', color: '#0d0d12' }} itemStyle={{ color: '#0369a1' }} />
                <Line type="monotone" dataKey="total" stroke="url(#lineGrad)" strokeWidth={3} dot={{ r: 4, fill: '#0369a1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6 flex flex-col items-center justify-center text-center gap-2">
          <div className="text-6xl heading-serif" style={{ color: '#10b981' }}>92%</div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Global Platform Health</div>
          <div className="w-full h-1.5 rounded-full bg-slate-100 mt-2 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: '92%' }} />
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
      <div className="glass-card overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e8e8ee' }}>
                {['Severity', 'Status', 'Entity', 'Description', 'SLA / Detection', 'Action'].map(h => (
                  <th key={h} className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {incidents?.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((incident: any, i: number) => {
                const sev = severityStyles[incident.severity] || severityStyles.LOW;
                return (
                  <tr key={incident.id}
                    style={{ borderBottom: i < Math.min(incidents?.length || 0, PAGE_SIZE) - 1 ? '1px solid #f8f8fa' : 'none' }}
                    className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-5 text-sm">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider" style={{ background: sev.bg, color: sev.text, border: `1px solid ${sev.border}` }}>
                        {incident.severity}
                      </span>
                    </td>
                    <td className={`px-6 py-5 text-sm font-bold ${statusStyles[incident.status] || ''}`}>{incident.status}</td>
                    <td className="px-6 py-5 text-sm font-bold text-slate-900">{incident.entityName}</td>
                    <td className="px-6 py-5 text-sm text-slate-500 max-w-[280px]">
                       <div className="truncate font-medium">{incident.description}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                         <LiveTimer createdAt={incident.createdAt} status={incident.status} />
                         <span className="text-[10px] text-slate-400">Captured: {new Date(incident.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <Link to={`/incidents/${incident.id}`}
                        className="inline-flex whitespace-nowrap text-[11px] font-black uppercase tracking-widest px-4 py-2 rounded border border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
                        Perform RCA →
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {(!incidents || incidents.length === 0) && (
                <tr><td colSpan={6} className="px-6 py-16 text-center text-slate-400 text-sm italic font-medium">No active incidents detected. Pipeline health at 100%.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Simple Pagination Footer */}
        {incidents && incidents.length > 0 && (
          <div className="px-6 py-4 bg-[#fafafe] border-t border-[#e8e8ee] flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, incidents.length)} of {incidents.length} logs
            </span>
            <div className="flex gap-1">
               <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded bg-white border border-slate-200 text-slate-400 text-[10px] font-black hover:bg-slate-50 disabled:opacity-50 transition-colors">PREV</button>
               <button className="px-3 py-1 rounded bg-blue-600 text-white text-[10px] font-black">{currentPage}</button>
               <button 
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage * PAGE_SIZE >= incidents.length}
                className="px-3 py-1 rounded bg-white border border-slate-200 text-slate-400 text-[10px] font-black hover:bg-slate-50 disabled:opacity-50 transition-colors">NEXT</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const KPICard = ({ title, value, icon, iconColor, accent }: { title: string; value: string | number; icon: React.ReactNode; iconColor: string; accent?: boolean }) => (
  <div className="glass-card p-5 flex items-center gap-5">
    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
      style={{ background: `${iconColor}12`, color: iconColor, border: `1px solid ${iconColor}20` }}>
      {icon}
    </div>
    <div>
      <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.1em] mb-1">{title}</p>
      <p className="text-3xl heading-serif" style={{ color: accent ? iconColor : '#0d0d12' }}>{value}</p>
    </div>
  </div>
);

export default IncidentDashboard;
