import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, AlertCircle, TrendingUp, Settings, Zap, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface LayoutProps { children: ReactNode; }

const DashboardLayout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
      {/* Sidebar */}
      <aside className="w-64 flex flex-col flex-shrink-0" style={{
        background: 'var(--card-bg)',
        borderRight: '1px solid var(--border-color)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.04)'
      }}>
        {/* Logo */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3 mb-8">
            <div className="relative w-10 h-10 rounded-xl flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: '0 4px 12px rgba(99,102,241,0.35)'
            }}>
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>SentinelX</div>
              <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Data Incident Center</div>
            </div>
          </div>

          <nav className="space-y-1">
            <NavItem icon={<LayoutDashboard size={18} />} label="Incidents" to="/incidents" />
            <NavItem icon={<AlertCircle size={18} />} label="Alerts" to="/alerts" />
            <NavItem icon={<TrendingUp size={18} />} label="Metrics" to="/metrics" />
            <NavItem icon={<Settings size={18} />} label="Configurations" to="/settings" />
          </nav>
        </div>

        <div className="mt-auto p-4" style={{ borderTop: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{user?.name || 'User'}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-8 flex-shrink-0" style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-color)',
          boxShadow: '0 1px 8px rgba(0,0,0,0.04)'
        }}>
          <h1 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Metadata Incident Response</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold"
              style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" />
              System Operational
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ icon, label, to }: { icon: ReactNode; label: string; to: string }) => {
  const location = useLocation();
  const active = location.pathname.startsWith(to);

  return (
    <Link to={to} style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 12px', borderRadius: '10px', textDecoration: 'none',
      fontSize: '0.875rem', fontWeight: active ? 600 : 500, transition: 'all 0.15s ease',
      background: active ? 'linear-gradient(135deg, #eef2ff, #ede9fe)' : 'transparent',
      color: active ? '#6366f1' : '#64748b',
      boxShadow: active ? '0 2px 8px rgba(99,102,241,0.12)' : 'none',
    }}>
      {icon}
      <span>{label}</span>
    </Link>
  );
};

export default DashboardLayout;
