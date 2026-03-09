import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { Sparkles, ExternalLink, ChevronDown, ChevronUp, Briefcase, Send, MessageSquare, XCircle } from 'lucide-react';

interface Application {
  id: number;
  job_title: string;
  company: string | null;
  job_url: string | null;
  status: string;
  generated_cover: string | null;
  generated_answers: string | null;
  created_at: string;
}

const statusConfig: Record<string, { color: string; icon: typeof Briefcase; glow: string }> = {
  generated: { color: 'bg-zinc-700/50 text-zinc-300 border-zinc-600/50', icon: Sparkles, glow: '' },
  applied: { color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30', icon: Send, glow: 'shadow-[0_0_12px_rgba(99,102,241,0.15)]' },
  interview: { color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: MessageSquare, glow: 'shadow-[0_0_12px_rgba(52,211,153,0.15)]' },
  rejected: { color: 'bg-red-500/10 text-red-400 border-red-500/30', icon: XCircle, glow: '' },
};

export default function DashboardPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    api.get('/applications').then(({ data }) => {
      setApps(data);
      setLoading(false);
    });
  }, []);

  const updateStatus = async (id: number, status: string) => {
    await api.patch(`/applications/${id}/status`, { status });
    setApps(apps.map(a => a.id === id ? { ...a, status } : a));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">
            <span className="text-gradient">Applications</span>
          </h1>
          <p className="text-zinc-600 text-sm mt-1">{apps.length} total</p>
        </div>
        <Link
          to="/generate"
          className="group flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)]"
        >
          <Sparkles size={16} className="group-hover:animate-spin" style={{ animationDuration: '1s' }} />
          New Application
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8 stagger-children">
        {(['generated', 'applied', 'interview', 'rejected'] as const).map((status) => {
          const conf = statusConfig[status];
          const Icon = conf.icon;
          const count = apps.filter(a => a.status === status).length;
          return (
            <div key={status} className={`glass border border-zinc-800/50 rounded-2xl p-5 animate-fade-in-up transition-all duration-300 hover:scale-[1.02] hover:border-zinc-700/50 ${conf.glow}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest">{status}</p>
                <Icon size={14} className="text-zinc-700" />
              </div>
              <p className="text-3xl font-bold text-zinc-100">{count}</p>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass border border-zinc-800/50 rounded-2xl p-5 animate-shimmer" style={{ animationDelay: `${i * 200}ms` }}>
              <div className="h-5 bg-zinc-800/50 rounded w-1/3 mb-2" />
              <div className="h-4 bg-zinc-800/30 rounded w-1/5" />
            </div>
          ))}
        </div>
      ) : apps.length === 0 ? (
        <div className="glass border border-zinc-800/50 rounded-2xl p-16 text-center animate-scale-in">
          <div className="animate-float">
            <Sparkles className="mx-auto text-indigo-500/30 mb-4" size={48} />
          </div>
          <p className="text-zinc-400 text-lg font-medium">No applications yet</p>
          <p className="text-zinc-600 text-sm mt-2">Search LinkedIn or generate your first AI-powered application</p>
          <div className="flex gap-3 justify-center mt-6">
            <Link to="/linkedin" className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-xl text-sm transition-all duration-200">
              Search LinkedIn
            </Link>
            <Link to="/generate" className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm transition-all duration-200">
              Generate Manually
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-2 stagger-children">
          {apps.map(app => {
            const conf = statusConfig[app.status] || statusConfig.generated;
            return (
              <div key={app.id} className={`glass border border-zinc-800/50 rounded-2xl overflow-hidden animate-fade-in-up transition-all duration-300 hover:border-zinc-700/50 ${expanded === app.id ? 'animate-border-glow' : ''}`}>
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-800/20 transition-all duration-200"
                  onClick={() => setExpanded(expanded === app.id ? null : app.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center border border-zinc-700/30">
                      <Briefcase size={16} className="text-zinc-500" />
                    </div>
                    <div>
                      <h3 className="font-medium text-zinc-100">{app.job_title}</h3>
                      <p className="text-sm text-zinc-500">{app.company || 'Unknown company'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] px-3 py-1 rounded-full font-medium border ${conf.color}`}>
                      {app.status}
                    </span>
                    <span className="text-xs text-zinc-700">{new Date(app.created_at).toLocaleDateString()}</span>
                    {app.job_url && (
                      <a href={app.job_url} target="_blank" rel="noreferrer" className="text-zinc-600 hover:text-indigo-400 transition-colors" onClick={e => e.stopPropagation()}>
                        <ExternalLink size={14} />
                      </a>
                    )}
                    <div className="transition-transform duration-200">
                      {expanded === app.id ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
                    </div>
                  </div>
                </div>

                {expanded === app.id && (
                  <div className="border-t border-zinc-800/50 p-5 space-y-4 animate-fade-in">
                    <div className="flex gap-2">
                      {(['generated', 'applied', 'interview', 'rejected'] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => updateStatus(app.id, s)}
                          className={`text-[10px] px-3 py-1.5 rounded-full border transition-all duration-200 ${
                            app.status === s
                              ? 'border-indigo-500/50 text-indigo-400 bg-indigo-500/10'
                              : 'border-zinc-800 text-zinc-600 hover:border-zinc-600 hover:text-zinc-400'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>

                    {app.generated_cover && (
                      <div className="animate-fade-in-up">
                        <h4 className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Cover Letter</h4>
                        <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4 text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                          {app.generated_cover}
                        </div>
                      </div>
                    )}

                    {app.generated_answers && (
                      <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                        <h4 className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Screening Answers</h4>
                        <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4 text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                          {app.generated_answers}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
