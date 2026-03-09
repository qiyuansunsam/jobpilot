import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, User, Settings, LogOut, Linkedin } from 'lucide-react';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/linkedin', label: 'LinkedIn Jobs', icon: Linkedin },
  { to: '/profile', label: 'Profile & CV', icon: User },
  { to: '/preferences', label: 'Preferences', icon: Settings },
];

export default function Sidebar() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 glass border-r border-zinc-800/50 flex flex-col animate-slide-in-left">
      {/* Logo */}
      <div className="p-6 border-b border-zinc-800/50">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-gradient">Job</span>
          <span className="text-zinc-100">Pilot</span>
        </h1>
        <p className="text-[10px] text-zinc-600 mt-1 uppercase tracking-widest">AI-powered applications</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 stagger-children">
        {links.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 animate-fade-in ${
                active
                  ? 'bg-indigo-500/10 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.1)]'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-indigo-500 rounded-r-full" />
              )}
              <Icon size={18} className={`transition-transform duration-200 group-hover:scale-110 ${active ? 'drop-shadow-[0_0_6px_rgba(99,102,241,0.5)]' : ''}`} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-zinc-800/50 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white uppercase">
              {user?.username?.charAt(0) || '?'}
            </div>
            <span className="text-sm text-zinc-400">{user?.username}</span>
          </div>
          <button
            onClick={logout}
            className="text-zinc-600 hover:text-red-400 transition-all duration-200 hover:scale-110"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
