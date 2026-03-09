import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { Sparkles, ExternalLink, ChevronDown, ChevronUp, Briefcase, Send, MessageSquare, XCircle, User, FileText, MapPin, GripVertical, Code, GraduationCap, Globe, Award, Phone, Mail, Loader2 } from 'lucide-react';

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

interface CVSummary {
  name: string;
  headline: string;
  summary: string;
  skills: string[];
  experience: { title: string; company: string; duration: string; highlights: string }[];
  education: { degree: string; school: string; year: string }[];
  languages: string[];
  certifications: string[];
  contact: { email: string; phone: string; location: string };
}

interface Preferences {
  job_titles: string | null;
  locations: string | null;
  experience: string | null;
}

const statusConfig: Record<string, { color: string; icon: typeof Briefcase; glow: string }> = {
  generated: { color: 'bg-zinc-700/50 text-zinc-300 border-zinc-600/50', icon: Sparkles, glow: '' },
  applied: { color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30', icon: Send, glow: 'shadow-[0_0_12px_rgba(99,102,241,0.15)]' },
  interview: { color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: MessageSquare, glow: 'shadow-[0_0_12px_rgba(52,211,153,0.15)]' },
  rejected: { color: 'bg-red-500/10 text-red-400 border-red-500/30', icon: XCircle, glow: '' },
};

// Drag-and-drop hook for reordering boxes
function useDraggableOrder(initial: string[]) {
  const [order, setOrder] = useState(initial);
  const dragItem = useRef<string | null>(null);
  const dragOver = useRef<string | null>(null);

  const onDragStart = useCallback((id: string) => {
    dragItem.current = id;
  }, []);

  const onDragEnter = useCallback((id: string) => {
    dragOver.current = id;
  }, []);

  const onDragEnd = useCallback(() => {
    if (dragItem.current === null || dragOver.current === null || dragItem.current === dragOver.current) {
      dragItem.current = null;
      dragOver.current = null;
      return;
    }
    setOrder(prev => {
      const copy = [...prev];
      const fromIdx = copy.indexOf(dragItem.current!);
      const toIdx = copy.indexOf(dragOver.current!);
      if (fromIdx < 0 || toIdx < 0) return prev;
      copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, dragItem.current!);
      return copy;
    });
    dragItem.current = null;
    dragOver.current = null;
  }, []);

  return { order, onDragStart, onDragEnter, onDragEnd };
}

export default function DashboardPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [cvSummary, setCvSummary] = useState<CVSummary | null>(null);
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [hasCv, setHasCv] = useState(false);

  const { order, onDragStart, onDragEnter, onDragEnd } = useDraggableOrder([
    'profile', 'skills', 'experience', 'education', 'extras',
  ]);

  useEffect(() => {
    Promise.allSettled([
      api.get('/applications'),
      api.get('/profile'),
      api.get('/preferences'),
    ]).then(([appsRes, profileRes, prefsRes]) => {
      if (appsRes.status === 'fulfilled') setApps(appsRes.value.data || []);
      if (prefsRes.status === 'fulfilled') setPrefs(prefsRes.value.data);
      const profileData = profileRes.status === 'fulfilled' ? profileRes.value.data : null;
      setHasCv(!!profileData?.cv_filename);
      setLoading(false);

      // Auto-fetch summary if CV exists
      if (profileData?.cv_filename) {
        setSummarizing(true);
        api.get('/profile/summary').then(({ data }) => {
          if (data && !data.error) setCvSummary(data);
        }).catch(() => {}).finally(() => setSummarizing(false));
      }
    });
  }, []);

  const updateStatus = async (id: number, status: string) => {
    await api.patch(`/applications/${id}/status`, { status });
    setApps(apps.map(a => a.id === id ? { ...a, status } : a));
  };

  // Draggable box wrapper
  const DragBox = ({ id, children }: { id: string; children: React.ReactNode }) => (
    <div
      draggable
      onDragStart={() => onDragStart(id)}
      onDragEnter={() => onDragEnter(id)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      className="group/drag animate-fade-in-up"
    >
      {children}
    </div>
  );

  const renderBox = (id: string) => {
    switch (id) {
      case 'profile': return (
        <DragBox key={id} id={id}>
          <div className="glass border border-zinc-800/50 rounded-2xl p-6 transition-all duration-300 hover:border-zinc-700/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.08)]">
            <div className="flex items-center gap-3 mb-5 cursor-grab active:cursor-grabbing">
              <GripVertical size={14} className="text-zinc-700 opacity-0 group-hover/drag:opacity-100 transition-opacity" />
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/10">
                <User size={20} className="text-indigo-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-zinc-100">
                  {cvSummary?.name || 'Your Profile'}
                </h3>
                {cvSummary?.headline && (
                  <p className="text-xs text-zinc-500 mt-0.5">{cvSummary.headline}</p>
                )}
              </div>
              {cvSummary?.contact?.location && (
                <span className="text-[11px] px-2.5 py-1 bg-zinc-800/50 text-zinc-400 rounded-full border border-zinc-700/30 flex items-center gap-1">
                  <MapPin size={10} /> {cvSummary.contact.location}
                </span>
              )}
            </div>
            {summarizing ? (
              <div className="flex items-center gap-2 text-sm text-indigo-400 py-6 justify-center">
                <Loader2 size={16} className="animate-spin" /> Analyzing your CV...
              </div>
            ) : cvSummary ? (
              <>
                <p className="text-sm text-zinc-400 leading-relaxed mb-4">{cvSummary.summary}</p>
                <div className="flex gap-3 flex-wrap text-[10px]">
                  {cvSummary.contact?.email && (
                    <span className="flex items-center gap-1 text-zinc-500"><Mail size={9} /> {cvSummary.contact.email}</span>
                  )}
                  {cvSummary.contact?.phone && (
                    <span className="flex items-center gap-1 text-zinc-500"><Phone size={9} /> {cvSummary.contact.phone}</span>
                  )}
                </div>
                {/* Preferences */}
                {prefs && (
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {prefs.experience && (
                      <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20">{prefs.experience}</span>
                    )}
                    {prefs.job_titles && (() => {
                      try { const t = JSON.parse(prefs.job_titles); return t.map((title: string) => (
                        <span key={title} className="text-[10px] px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20">{title}</span>
                      )); } catch { return null; }
                    })()}
                    {prefs.locations && (() => {
                      try { const l = JSON.parse(prefs.locations); return l.map((loc: string) => (
                        <span key={loc} className="text-[10px] px-2 py-0.5 bg-zinc-800/50 text-zinc-400 rounded-full border border-zinc-700/30 flex items-center gap-1"><MapPin size={8} />{loc}</span>
                      )); } catch { return null; }
                    })()}
                  </div>
                )}
              </>
            ) : !hasCv ? (
              <div className="text-center py-3">
                <p className="text-xs text-zinc-600 mb-2">Upload your CV to see your profile summary</p>
                <Link to="/profile" className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors">Upload CV →</Link>
              </div>
            ) : null}
          </div>
        </DragBox>
      );

      case 'skills': return cvSummary?.skills?.length ? (
        <DragBox key={id} id={id}>
          <div className="glass border border-zinc-800/50 rounded-2xl p-5 transition-all duration-300 hover:border-zinc-700/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.08)]">
            <div className="flex items-center gap-2 mb-3 cursor-grab active:cursor-grabbing">
              <GripVertical size={14} className="text-zinc-700 opacity-0 group-hover/drag:opacity-100 transition-opacity" />
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/10">
                <Code size={16} className="text-cyan-400" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-100">Skills</h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {cvSummary.skills.map((skill, i) => (
                <span key={i} className="text-[11px] px-2.5 py-1 rounded-lg bg-gradient-to-r from-zinc-800/80 to-zinc-800/40 text-zinc-300 border border-zinc-700/40 hover:border-cyan-500/30 hover:text-cyan-300 transition-all duration-200 cursor-default">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </DragBox>
      ) : null;

      case 'experience': return cvSummary?.experience?.length ? (
        <DragBox key={id} id={id}>
          <div className="glass border border-zinc-800/50 rounded-2xl p-5 transition-all duration-300 hover:border-zinc-700/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.08)]">
            <div className="flex items-center gap-2 mb-3 cursor-grab active:cursor-grabbing">
              <GripVertical size={14} className="text-zinc-700 opacity-0 group-hover/drag:opacity-100 transition-opacity" />
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center border border-emerald-500/10">
                <Briefcase size={16} className="text-emerald-400" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-100">Experience</h3>
            </div>
            <div className="space-y-3">
              {cvSummary.experience.map((exp, i) => (
                <div key={i} className="relative pl-4 border-l-2 border-emerald-500/20 hover:border-emerald-500/40 transition-colors">
                  <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-emerald-500/50" />
                  <h4 className="text-xs font-medium text-zinc-200">{exp.title}</h4>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5">
                    <span className="text-zinc-400">{exp.company}</span>
                    {exp.duration && <span className="text-zinc-600">·</span>}
                    {exp.duration && <span>{exp.duration}</span>}
                  </div>
                  {exp.highlights && <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">{exp.highlights}</p>}
                </div>
              ))}
            </div>
          </div>
        </DragBox>
      ) : null;

      case 'education': return cvSummary?.education?.length ? (
        <DragBox key={id} id={id}>
          <div className="glass border border-zinc-800/50 rounded-2xl p-5 transition-all duration-300 hover:border-zinc-700/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.08)]">
            <div className="flex items-center gap-2 mb-3 cursor-grab active:cursor-grabbing">
              <GripVertical size={14} className="text-zinc-700 opacity-0 group-hover/drag:opacity-100 transition-opacity" />
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-500/10">
                <GraduationCap size={16} className="text-amber-400" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-100">Education</h3>
            </div>
            <div className="space-y-2.5">
              {cvSummary.education.map((edu, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50 mt-1.5 shrink-0" />
                  <div>
                    <h4 className="text-xs font-medium text-zinc-200">{edu.degree}</h4>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5">
                      <span className="text-zinc-400">{edu.school}</span>
                      {edu.year && <span className="text-zinc-600">· {edu.year}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DragBox>
      ) : null;

      case 'extras': {
        const hasLanguages = cvSummary?.languages?.length;
        const hasCerts = cvSummary?.certifications?.length;
        if (!hasLanguages && !hasCerts) return null;
        return (
          <DragBox key={id} id={id}>
            <div className="glass border border-zinc-800/50 rounded-2xl p-5 transition-all duration-300 hover:border-zinc-700/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.08)]">
              <div className="flex items-center gap-2 mb-3 cursor-grab active:cursor-grabbing">
                <GripVertical size={14} className="text-zinc-700 opacity-0 group-hover/drag:opacity-100 transition-opacity" />
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border border-purple-500/10">
                  <Award size={16} className="text-purple-400" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-100">More</h3>
              </div>
              <div className="space-y-3">
                {hasLanguages ? (
                  <div>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Globe size={9} /> Languages</p>
                    <div className="flex flex-wrap gap-1.5">
                      {cvSummary!.languages.map((lang, i) => (
                        <span key={i} className="text-[11px] px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20">{lang}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {hasCerts ? (
                  <div>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Award size={9} /> Certifications</p>
                    <div className="flex flex-wrap gap-1.5">
                      {cvSummary!.certifications.map((cert, i) => (
                        <span key={i} className="text-[11px] px-2.5 py-1 rounded-lg bg-pink-500/10 text-pink-300 border border-pink-500/20">{cert}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </DragBox>
        );
      }

      default: return null;
    }
  };

  return (
    <div className="flex gap-6 -my-2">
      {/* Left: Profile section boxes */}
      <div className="w-[440px] shrink-0 space-y-3 stagger-children">
        <div className="flex items-center justify-between mb-2 animate-fade-in">
          <h1 className="text-xl font-bold">
            <span className="text-gradient">Dashboard</span>
          </h1>
          <Link
            to="/generate"
            className="group flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-4 py-2 rounded-xl text-xs font-medium transition-all duration-300 shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)]"
          >
            <Sparkles size={12} className="group-hover:animate-spin" style={{ animationDuration: '1s' }} />
            New
          </Link>
        </div>

        {order.map(id => renderBox(id))}
      </div>

      {/* Right: Applications section */}
      <div className="flex-1 min-w-0">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 mb-4 stagger-children">
          {(['generated', 'applied', 'interview', 'rejected'] as const).map((status) => {
            const conf = statusConfig[status];
            const Icon = conf.icon;
            const count = apps.filter(a => a.status === status).length;
            return (
              <div key={status} className={`glass border border-zinc-800/50 rounded-2xl p-4 animate-fade-in-up transition-all duration-300 hover:scale-[1.02] hover:border-zinc-700/50 ${conf.glow}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[9px] text-zinc-600 uppercase tracking-widest">{status}</p>
                  <Icon size={12} className="text-zinc-700" />
                </div>
                <p className="text-2xl font-bold text-zinc-100">{count}</p>
              </div>
            );
          })}
        </div>

        {/* Applications header */}
        <div className="flex items-center justify-between mb-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-200">Applications</h2>
            <span className="text-[10px] px-2 py-0.5 bg-zinc-800/50 text-zinc-500 rounded-full border border-zinc-700/30">{apps.length}</span>
          </div>
          <div className="flex gap-2">
            <Link to="/linkedin" className="text-[10px] bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-400 px-3 py-1.5 rounded-lg border border-zinc-700/30 transition-all">
              Search LinkedIn
            </Link>
          </div>
        </div>

        {/* Applications list */}
        <div className="space-y-1.5 overflow-y-auto max-h-[calc(100vh-14rem)]">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="glass border border-zinc-800/50 rounded-xl p-4 animate-shimmer" style={{ animationDelay: `${i * 200}ms` }}>
                  <div className="h-4 bg-zinc-800/50 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-zinc-800/30 rounded w-1/5" />
                </div>
              ))}
            </div>
          ) : apps.length === 0 ? (
            <div className="glass border border-zinc-800/50 rounded-2xl p-12 text-center animate-scale-in">
              <div className="animate-float">
                <Sparkles className="mx-auto text-indigo-500/30 mb-3" size={40} />
              </div>
              <p className="text-zinc-400 font-medium">No applications yet</p>
              <p className="text-zinc-600 text-xs mt-1.5">Search LinkedIn or generate your first AI-powered application</p>
              <div className="flex gap-3 justify-center mt-5">
                <Link to="/linkedin" className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-xl text-xs transition-all">
                  Search LinkedIn
                </Link>
                <Link to="/generate" className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs transition-all">
                  Generate
                </Link>
              </div>
            </div>
          ) : (
            apps.map(app => {
              const conf = statusConfig[app.status] || statusConfig.generated;
              return (
                <div key={app.id} className={`glass border border-zinc-800/50 rounded-xl overflow-hidden animate-fade-in-up transition-all duration-300 hover:border-zinc-700/50 ${expanded === app.id ? 'animate-border-glow' : ''}`}>
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-zinc-800/20 transition-all duration-200"
                    onClick={() => setExpanded(expanded === app.id ? null : app.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center border border-zinc-700/30">
                        <Briefcase size={13} className="text-zinc-500" />
                      </div>
                      <div>
                        <h3 className="font-medium text-sm text-zinc-100">{app.job_title}</h3>
                        <p className="text-[11px] text-zinc-500">{app.company || 'Unknown company'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-medium border ${conf.color}`}>
                        {app.status}
                      </span>
                      <span className="text-[10px] text-zinc-700">{new Date(app.created_at).toLocaleDateString()}</span>
                      {app.job_url && (
                        <a href={app.job_url} target="_blank" rel="noreferrer" className="text-zinc-600 hover:text-indigo-400 transition-colors" onClick={e => e.stopPropagation()}>
                          <ExternalLink size={12} />
                        </a>
                      )}
                      {expanded === app.id ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
                    </div>
                  </div>

                  {expanded === app.id && (
                    <div className="border-t border-zinc-800/50 p-4 space-y-3 animate-fade-in">
                      <div className="flex gap-1.5">
                        {(['generated', 'applied', 'interview', 'rejected'] as const).map(s => (
                          <button
                            key={s}
                            onClick={() => updateStatus(app.id, s)}
                            className={`text-[10px] px-2.5 py-1 rounded-full border transition-all duration-200 ${
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
                          <h4 className="text-[10px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Cover Letter</h4>
                          <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-3 text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
                            {app.generated_cover}
                          </div>
                        </div>
                      )}

                      {app.generated_answers && (
                        <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                          <h4 className="text-[10px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Screening Answers</h4>
                          <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-3 text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
                            {app.generated_answers}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
