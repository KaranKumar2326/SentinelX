import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import toast from 'react-hot-toast';
import { ArrowLeft, Clock, Server, CheckCircle, Zap, MessageSquare, Send, User } from 'lucide-react';
import { useState } from 'react';
import LineageGraph from '../components/Lineage/LineageGraph';
import clsx from 'clsx';

const severityStyles: Record<string, { bg: string; text: string; border: string }> = {
  HIGH:     { bg: '#fff1f2', text: '#e11d48', border: '#fecdd3' },
  CRITICAL: { bg: '#fff1f2', text: '#9f1239', border: '#fda4af' },
  MEDIUM:   { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  LOW:      { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
};

const IncidentDetail = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');

  const { data: incident, isLoading: isLoadingIncident } = useQuery({
    queryKey: ['incident', id],
    queryFn: async () => {
      const res = await apiClient.get(`/incidents/${id}`);
      return res.data;
    }
  });

  const { data: insights, isLoading: isLoadingInsights } = useQuery({
    queryKey: ['insights', id],
    queryFn: async () => {
      const res = await apiClient.get(`/incidents/${id}/insights`);
      return res.data;
    }
  });

  const { data: lineage, isLoading: isLoadingLineage } = useQuery({
    queryKey: ['lineage', id],
    queryFn: async () => {
      const res = await apiClient.get(`/incidents/${id}/lineage`);
      return res.data;
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await apiClient.patch(`/incidents/${id}`, { status });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['incident', id] });
      toast.success(`Incident marked as ${data.status}`);
    }
  });

  const remediationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/incidents/${id}/remediate`);
      return res.data;
    },
    onSuccess: (data) => toast.success(data.message, { duration: 6000 }),
    onError: () => toast.error('Failed to trigger remediation pipeline')
  });

  const addLogMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiClient.post(`/incidents/${id}/logs`, { message });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', id] });
      setNewComment('');
      toast.success('Note added to timeline');
    },
  });

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addLogMutation.mutate(newComment);
  };

  const assignOwnerMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/incidents/${id}/owner`, { userName: 'Hackathon Engineer' });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', id] });
      toast.success('Ownership synced to OpenMetadata!');
    }
  });

  if (isLoadingIncident) return (
    <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading incident details...</div>
  );
  if (!incident) return (
    <div className="flex items-center justify-center h-64 text-red-500 text-sm">Incident not found</div>
  );

  const sev = severityStyles[incident.severity] || severityStyles.LOW;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Topbar Actions */}
      <div className="flex items-center justify-between">
        <Link to="/incidents" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors">
          <ArrowLeft size={16} /> Back
        </Link>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => assignOwnerMutation.mutate()}
            disabled={!!incident.owner || assignOwnerMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-50">
            <User size={16} /> {incident.owner ? `Owner: ${incident.owner}` : 'Assign Me'}
          </button>

          <button
            onClick={() => updateStatusMutation.mutate('INVESTIGATING')}
            disabled={incident.status !== 'OPEN' || updateStatusMutation.isPending || remediationMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50">
            <Clock size={16} /> {incident.status === 'OPEN' ? 'Acknowledge' : 'Acknowledged'}
          </button>
          
          <button
            onClick={() => updateStatusMutation.mutate('RESOLVED')}
            disabled={incident.status === 'RESOLVED' || updateStatusMutation.isPending || remediationMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">
            <CheckCircle size={16} /> Resolve Incident
          </button>

          <button
            onClick={() => remediationMutation.mutate()}
            disabled={remediationMutation.isPending || incident.status === 'RESOLVED' || updateStatusMutation.isPending}
            className={clsx(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-md ml-auto",
                remediationMutation.isPending ? "bg-slate-400 animate-pulse" : "bg-indigo-600 hover:bg-indigo-700"
            )}>
            <Zap size={16} /> {remediationMutation.isPending ? 'Initiating Recovery...' : 'Restart Pipeline'}
          </button>
        </div>
      </div>

      {/* Incident Header Card */}
      <div className="glass-card p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <span className="status-badge" style={{ background: sev.bg, color: sev.text, border: `1px solid ${sev.border}` }}>
                {incident.severity}
              </span>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">{incident.entityName}</h1>
            </div>
            <p className="text-slate-500 text-sm max-w-2xl leading-relaxed">{incident.description}</p>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</div>
            <p className={clsx("text-sm font-bold", incident.status === 'RESOLVED' ? "text-emerald-600" : "text-amber-600 uppercase")}>{incident.status}</p>
          </div>
        </div>
      </div>

      {/* Sentinel AI Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-card p-6 border-l-4 border-l-indigo-500" style={{ background: 'linear-gradient(to right, #f5f3ff, #ffffff)' }}>
              <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-indigo-100 rounded-lg animate-pulse"><Zap size={16} className="text-indigo-600" /></div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Sentinel AI Agent</h3>
              </div>
              {isLoadingInsights ? (
                  <div className="space-y-2">
                     <div className="flex items-center gap-2 text-xs font-bold text-indigo-500 animate-pulse uppercase tracking-widest">
                        <div className="w-2 h-2 rounded-full bg-indigo-500" /> Analyzing Lineage Graph...
                     </div>
                     <div className="h-4 bg-slate-100 rounded-md w-full" />
                     <div className="h-4 bg-slate-100 rounded-md w-3/4" />
                  </div>
              ) : (
                  <div className="space-y-3">
                      <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">
                         <CheckCircle size={10} /> Root Cause Isolated
                      </div>
                      <p className="text-base text-slate-700 font-medium italic leading-relaxed">
                         {insights?.diagnosis}
                      </p>

                      {insights?.suggestedFix && (
                        <div className="mt-4">
                           <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Automated Recovery Suggestion</div>
                           <div className="p-4 bg-slate-900 rounded-xl font-mono text-[11px] text-indigo-300 overflow-x-auto border border-slate-800 shadow-inner">
                              <pre>{insights.suggestedFix}</pre>
                           </div>
                        </div>
                      )}
                      
                      {incident.children?.length > 0 && (
                        <div className="mt-4 p-3 bg-white/50 rounded-xl border border-indigo-100">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Cascaded Impact (Blast Radius)</h4>
                          <div className="flex flex-wrap gap-2">
                            {incident.children.map((child: any) => (
                              <div key={child.id} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white border border-slate-100 text-xs font-medium text-slate-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                {child.entityName}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-4 pt-2">
                        <div className="px-3 py-1 bg-white border border-indigo-100 rounded-lg text-[11px] font-bold text-indigo-600 shadow-sm">
                           PREDICTION: High
                        </div>
                        <div className="px-3 py-1 bg-white border border-indigo-100 rounded-lg text-[11px] font-bold text-indigo-600 shadow-sm uppercase">
                           SOURCE: Metadata
                        </div>
                      </div>
                  </div>
              )}
          </div>

          <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-4">
                  <Server size={16} className="text-slate-400" />
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Business Impact</h3>
              </div>
              {isLoadingInsights ? <div className="animate-pulse h-20 bg-slate-100 rounded-md" /> : (
                  <div className="space-y-4">
                      <div>
                          <div className="text-3xl font-black text-slate-800 tracking-tight">{insights?.impact?.estimatedUsers || '0'}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Downstream Consumers</div>
                      </div>
                      <div>
                          <div className="text-lg font-bold text-slate-700">{insights?.impact?.queryImpact24h || '0'}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Daily Query Load (24h)</div>
                      </div>
                  </div>
              )}
          </div>
      </div>

      {/* RCA Section */}
      <div className="glass-card p-6">
        <h2 className="text-base font-bold text-slate-800 mb-4">Root Cause Analysis — Lineage Graph</h2>
        {isLoadingLineage ? (
          <div className="h-[380px] rounded-xl flex items-center justify-center text-slate-400 text-sm"
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            Tracing upstream dependencies...
          </div>
        ) : lineage?.nodes?.length > 0 ? (
          <LineageGraph nodesData={lineage.nodes} edgesData={lineage.edges} />
        ) : (
          <div className="h-[380px] rounded-xl flex items-center justify-center text-slate-400 text-sm"
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            No lineage data available for this entity.
          </div>
        )}
      </div>

      {/* Collaboration & Timeline Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <Clock size={16} className="text-slate-400" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Activity Timeline</h3>
          </div>
          
          <div className="space-y-6 relative before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-100">
            {incident.logs?.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((log: any) => (
              <div key={log.id} className="relative pl-8">
                <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                </div>
                <div className="text-xs font-bold text-slate-400 mb-1">{new Date(log.timestamp).toLocaleString()}</div>
                <div className="text-sm text-slate-600 leading-relaxed font-medium">{log.message}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={16} className="text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Investigation Note</h3>
            </div>
            <form onSubmit={handleAddComment}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Log findings here..."
                className="w-full h-32 text-sm p-4 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none mb-3"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={addLogMutation.isPending || !newComment.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 12px rgba(99,102,241,0.2)' }}>
                  <Send size={14} /> Post Note
                </button>
              </div>
            </form>
          </div>

          <div className="glass-card p-5 flex items-center gap-4 bg-indigo-50/30 border-indigo-100">
             <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-indigo-500 border border-indigo-100">
               <User size={18} />
             </div>
             <div className="text-xs">
                <p className="font-bold text-slate-700">Team Collaboration</p>
                <p className="text-slate-500">Shared with Data Ops and Analytics instantly.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentDetail;
