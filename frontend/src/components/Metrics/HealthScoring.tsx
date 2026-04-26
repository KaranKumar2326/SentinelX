import React from 'react';
import { ShieldCheck, Database, ListChecks, History } from 'lucide-react';

const HealthScoring = ({ tableFqn, score }: { tableFqn: string, score: number }) => {
  const getScoreColor = (s: number) => {
    if (s >= 90) return 'text-emerald-400';
    if (s >= 70) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-white">Dataset Health Score</h3>
          <p className="text-sm text-slate-400">{tableFqn}</p>
        </div>
        <div className={`text-4xl font-black ${getScoreColor(score)}`}>
          {score}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <HealthMetric icon={<ShieldCheck size={16}/>} label="Ownership" value="100%" />
        <HealthMetric icon={<ListChecks size={16}/>} label="DQ Passed" value="85%" />
        <HealthMetric icon={<History size={16}/>} label="Freshness" value="92%" />
        <HealthMetric icon={<Database size={16}/>} label="Lineage" value="Complete" />
      </div>

      <div className="pt-4 border-t border-slate-800">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase mb-4 tracking-wider">
          <History size={14} /> Score History
        </div>
        <div className="flex items-end gap-1 h-12">
          {[85, 88, 90, 85, 92, 95, 90, 94].map((s, i) => (
            <div 
              key={i} 
              className="flex-1 bg-blue-500/20 rounded-t-sm hover:bg-blue-500/40 transition-colors"
              style={{ height: `${s}%` }}
              title={`Score: ${s}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const HealthMetric = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
      {icon}
      <span>{label}</span>
    </div>
    <div className="text-sm font-bold text-white">{value}</div>
  </div>
);

export default HealthScoring;
