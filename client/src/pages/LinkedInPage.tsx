import { useState, useEffect, useRef } from 'react';
import api from '../api/client';
import { Search, Briefcase, MapPin, Clock, Sparkles, Wifi, WifiOff, LogIn, LogOut, ChevronDown, ChevronUp, ExternalLink, Zap, Globe, Send, Bot, User, Rocket, CheckCircle, XCircle, Loader2, ToggleLeft, ToggleRight, Play, Square, FileText } from 'lucide-react';

interface LinkedInSession { authenticated: boolean; name?: string; headline?: string; }
interface Job { job_id: string; title: string; company: string; location: string; listed_at: number; work_remote_allowed: boolean; }
interface JobDetail { job_id: string; title: string; description: string; company: string; location: string; employment_type: string; experience_level: string; apply_url: string; is_easy_apply: boolean; }
interface ChatMessage { role: 'user' | 'assistant' | 'system'; content: string; timestamp: number; }

export default function LinkedInPage() {
  const [session, setSession] = useState<LinkedInSession>({ authenticated: false });
  const [checkingSession, setCheckingSession] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Search
  const [keywords, setKeywords] = useState('');
  const [location, setLocation] = useState('');
  const [remote, setRemote] = useState<string[]>([]);
  const [experience, setExperience] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);

  // Job detail
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [jobDetails, setJobDetails] = useState<Record<string, JobDetail>>({});
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);

  // Mode
  const [mode, setMode] = useState<'auto' | 'advanced'>('advanced');

  // Auto mode state
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoLog, setAutoLog] = useState<string[]>([]);

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'system', content: 'Hi! I\'m your JobPilot AI. Search for jobs, select one, and I\'ll help you apply. Use **Auto Mode** for one-click applications or **Advanced Mode** to review each one.', timestamp: Date.now() }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Apply state
  const [applying, setApplying] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const autoStopRef = useRef(false);

  // AI summary toggle per job
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [summarizing, setSummarizing] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState<Record<string, boolean>>({});

  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/linkedin/session').then(({ data }) => {
      setSession(data);
      setCheckingSession(false);
    }).catch(() => setCheckingSession(false));
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const addChat = (role: ChatMessage['role'], content: string) => {
    setChatMessages(prev => [...prev, { role, content, timestamp: Date.now() }]);
  };

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) { setError('Enter your LinkedIn email and password'); return; }
    setLoggingIn(true);
    setError('');
    try {
      const { data } = await api.post('/linkedin/login', { email: loginEmail, password: loginPassword });
      if (data.ok) {
        setSession({ authenticated: true, name: data.name, headline: data.headline });
        setLoginPassword('');
        addChat('system', `Connected as **${data.name}**! Ready to search jobs.`);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await api.post('/linkedin/logout');
    setSession({ authenticated: false });
    addChat('system', 'Disconnected from LinkedIn.');
  };

  const handleSearch = async () => {
    if (!keywords && !location) return;
    setSearching(true);
    setError('');
    setJobs([]);
    setSelectedJob(null);
    addChat('system', `Searching LinkedIn for "${keywords}" in "${location || 'anywhere'}"...`);
    try {
      const { data } = await api.post('/linkedin/search', {
        keywords: keywords || undefined,
        location_name: location || undefined,
        remote: remote.length > 0 ? remote : undefined,
        experience: experience.length > 0 ? experience : undefined,
        limit: 25,
      });
      setJobs(data);
      addChat('system', `Found **${data.length} jobs**. ${mode === 'auto' ? 'Click Auto Apply to apply to all Easy Apply jobs.' : 'Click a job to view details and generate an application.'}`);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Search failed';
      setError(msg);
      if (msg.includes('expired') || msg.includes('Not authenticated')) {
        setSession({ authenticated: false });
        addChat('system', `Session expired. Please reconnect to LinkedIn.`);
      } else {
        addChat('system', `Search failed: ${msg}`);
      }
    } finally {
      setSearching(false);
    }
  };

  const loadJobDetail = async (jobId: string) => {
    if (selectedJob === jobId) { setSelectedJob(null); return; }
    setSelectedJob(jobId);
    if (jobDetails[jobId]) return;
    setLoadingDetail(jobId);
    try {
      const { data } = await api.get(`/linkedin/job/${jobId}`);
      setJobDetails(prev => ({ ...prev, [jobId]: data }));
    } catch { setError('Failed to load job details'); }
    finally { setLoadingDetail(null); }
  };

  const generateForJob = async (jobId: string) => {
    const detail = jobDetails[jobId];
    if (!detail) return;
    setGenerating(jobId);
    addChat('system', `Generating application for **${detail.title}** at **${detail.company}**...`);
    try {
      const { data } = await api.post('/ai/generate', {
        jobTitle: detail.title,
        company: detail.company,
        jobUrl: `https://www.linkedin.com/jobs/view/${jobId}`,
        jobDescription: detail.description,
        generateType: 'both',
      });
      addChat('assistant', `**Cover Letter for ${detail.title}:**\n\n${data.generated.coverLetter || '(none)'}\n\n---\n\n**Screening Answers:**\n${data.generated.screeningAnswers || '(none)'}`);
      addChat('system', 'Application saved to Dashboard. You can ask me to edit it in the chat.');
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Server unreachable — check if the backend is running';
      addChat('system', `Generation failed: ${errMsg}`);
    } finally { setGenerating(null); }
  };

  const toggleSummary = async (jobId: string) => {
    if (showSummary[jobId]) {
      setShowSummary(prev => ({ ...prev, [jobId]: false }));
      return;
    }
    setShowSummary(prev => ({ ...prev, [jobId]: true }));
    if (summaries[jobId]) return;
    const detail = jobDetails[jobId];
    if (!detail) return;
    setSummarizing(jobId);
    try {
      const { data } = await api.post('/chat', {
        message: 'Summarize this job posting in 3-4 concise bullet points. Focus on: role responsibilities, key requirements, and any standout details (salary, perks, etc). Be brief.',
        context: `Job: ${detail.title} at ${detail.company}\nLocation: ${detail.location}\nType: ${detail.employment_type || 'N/A'}\nExperience: ${detail.experience_level || 'N/A'}\n\nDescription:\n${detail.description?.slice(0, 3000)}`,
      });
      setSummaries(prev => ({ ...prev, [jobId]: data.reply }));
    } catch {
      setSummaries(prev => ({ ...prev, [jobId]: 'Failed to generate summary.' }));
    } finally { setSummarizing(null); }
  };

  const applyToJob = async (jobId: string) => {
    const detail = jobDetails[jobId];
    if (!detail) { await loadJobDetail(jobId); return; }
    setApplying(jobId);
    addChat('system', `Applying to **${detail.title}** at **${detail.company}** via Easy Apply...`);
    try {
      const { data } = await api.post(`/linkedin/apply/${jobId}`, { answers: {} });
      if (data.ok) {
        addChat('system', `Applied to **${detail.title}**! ${data.steps?.join(' -> ') || ''}`);
      } else {
        addChat('system', `Could not apply: ${data.error}. Steps: ${data.steps?.join(' -> ') || 'none'}`);
      }
    } catch (err: any) {
      addChat('system', `Apply error: ${err.response?.data?.error || 'Unknown'}`);
    } finally { setApplying(null); }
  };

  const stopAutoMode = () => {
    autoStopRef.current = true;
    addChat('system', '**Stopping auto mode...** Will stop after current job finishes.');
  };

  const runAutoMode = async () => {
    if (!jobs.length) { addChat('system', 'Search for jobs first!'); return; }
    autoStopRef.current = false;
    setAutoRunning(true);
    setAutoLog([]);
    addChat('system', `**AUTO MODE**: Processing ${jobs.length} jobs...`);

    for (const job of jobs) {
      if (autoStopRef.current) {
        addChat('system', '**AUTO MODE STOPPED** by user.');
        break;
      }

      // Load detail if not already loaded
      let detail = jobDetails[job.job_id];
      if (!detail) {
        setLoadingDetail(job.job_id);
        try {
          const { data } = await api.get(`/linkedin/job/${job.job_id}`);
          setJobDetails(prev => ({ ...prev, [job.job_id]: data }));
          detail = data;
        } catch (err: any) {
          const msg = `Failed to load: ${job.title} — ${err.response?.data?.error || err.message || 'Unknown'}`;
          setAutoLog(prev => [...prev, msg]);
          addChat('system', msg);
          setLoadingDetail(null);
          continue;
        } finally {
          setLoadingDetail(null);
        }
      }

      if (!detail.is_easy_apply) {
        const msg = `Skipped ${job.title} @ ${job.company} (not Easy Apply)`;
        setAutoLog(prev => [...prev, msg]);
        addChat('system', msg);
        continue;
      }

      if (autoStopRef.current) { addChat('system', '**AUTO MODE STOPPED** by user.'); break; }

      // Generate cover letter
      addChat('system', `Generating for **${job.title}** @ **${job.company}**...`);
      try {
        await api.post('/ai/generate', {
          jobTitle: detail.title,
          company: detail.company,
          jobUrl: `https://www.linkedin.com/jobs/view/${job.job_id}`,
          jobDescription: detail.description,
          generateType: 'cover_letter',
        });
      } catch (err: any) {
        const msg = `Generation warning: ${job.title} — ${err.response?.data?.error || err.message || 'Unknown'} (continuing...)`;
        setAutoLog(prev => [...prev, msg]);
        addChat('system', msg);
      }

      if (autoStopRef.current) { addChat('system', '**AUTO MODE STOPPED** by user.'); break; }

      // Easy Apply
      addChat('system', `Applying to **${job.title}**...`);
      try {
        const applyRes = await api.post(`/linkedin/apply/${job.job_id}`, { answers: {} });
        const msg = applyRes.data.ok
          ? `Applied: ${job.title} @ ${job.company}`
          : `Failed: ${job.title} — ${applyRes.data.error}`;
        setAutoLog(prev => [...prev, msg]);
        addChat('system', msg);
      } catch (err: any) {
        const msg = `Apply error: ${job.title} — ${err.response?.data?.error || err.message || 'Unknown'}`;
        setAutoLog(prev => [...prev, msg]);
        addChat('system', msg);
      }
    }

    if (!autoStopRef.current) {
      addChat('system', '**AUTO MODE COMPLETE.** Check Dashboard for all applications.');
    }
    setAutoRunning(false);
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput('');
    addChat('user', msg);
    setChatLoading(true);

    // Build context from selected job
    let context = '';
    if (selectedJob && jobDetails[selectedJob]) {
      const d = jobDetails[selectedJob];
      context = `Selected job: ${d.title} at ${d.company}\nLocation: ${d.location}\nDescription: ${d.description?.slice(0, 2000)}`;
    }

    try {
      const { data } = await api.post('/chat', { message: msg, context });
      addChat('assistant', data.reply);
    } catch {
      addChat('system', 'Chat error — is Claude proxy running?');
    } finally { setChatLoading(false); }
  };

  const timeAgo = (ts: number) => {
    if (!ts) return '';
    const diff = Date.now() - ts;
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  if (checkingSession) {
    return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" /></div>;
  }

  if (!session.authenticated) {
    return (
      <div className="flex items-center justify-center h-full animate-fade-in-up">
        <div className="glass border border-zinc-800/50 rounded-2xl p-12 text-center max-w-md animate-glow-pulse">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 mb-6 animate-float shadow-[0_0_40px_rgba(59,130,246,0.2)]">
            <Briefcase size={32} className="text-white" />
          </div>
          <h2 className="text-xl font-bold mb-2">Connect LinkedIn</h2>
          <p className="text-zinc-500 text-sm mb-6 leading-relaxed">
            Sign in with your LinkedIn credentials to get started.
          </p>
          <div className="space-y-3 mb-6 text-left">
            <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="LinkedIn email"
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-600" />
            <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="Password"
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-600" />
          </div>
          <button onClick={handleLogin} disabled={loggingIn}
            className="group w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 py-3 rounded-xl text-sm font-medium transition-all duration-300 disabled:opacity-50 shadow-[0_0_20px_rgba(59,130,246,0.2)] hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]">
            {loggingIn ? <><Loader2 size={16} className="animate-spin" /> Signing in...</> : <><LogIn size={16} /> Sign in</>}
          </button>
          {error && <p className="text-red-400 text-xs mt-4">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 -my-8 -mr-8 animate-fade-in">
      {/* Left: Jobs panel */}
      <div className="flex-1 flex flex-col min-w-0 py-8 pl-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pr-2">
          <div>
            <h1 className="text-xl font-bold"><span className="text-gradient">LinkedIn</span> Jobs</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <Wifi size={10} className="animate-pulse" /> {session.name}
              </span>
              <button onClick={handleLogout} className="text-[10px] text-zinc-600 hover:text-red-400 transition-colors flex items-center gap-1"><LogOut size={10} /></button>
            </div>
          </div>
          {/* Mode buttons */}
          <div className="flex items-center gap-2">
            <button onClick={() => {
              if (autoRunning) {
                stopAutoMode();
              } else {
                setMode('auto');
                if (jobs.length > 0) runAutoMode();
              }
            }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-300 ${
                autoRunning
                  ? 'bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.15)]'
                  : mode === 'auto'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                    : 'bg-zinc-800/50 border-zinc-700/30 text-zinc-400 hover:border-amber-500/30 hover:text-amber-400'
              }`}>
              {autoRunning ? <><Square size={12} /> Stop Auto</> : <><Rocket size={12} /> Auto Apply</>}
            </button>
            <button onClick={() => {
              if (autoRunning) stopAutoMode();
              setMode('advanced');
            }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-300 ${
                mode === 'advanced' && !autoRunning
                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                  : 'bg-zinc-800/50 border-zinc-700/30 text-zinc-400 hover:border-indigo-500/30 hover:text-indigo-400'
              }`}>
              <Zap size={12} /> Advanced
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="glass border border-zinc-800/50 rounded-2xl p-4 mb-4">
          <div className="flex gap-2 mb-3">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input value={keywords} onChange={e => setKeywords(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Job title, keywords..." className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-200 placeholder:text-zinc-700" />
            </div>
            <div className="flex-1 relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input value={location} onChange={e => setLocation(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Location..." className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-200 placeholder:text-zinc-700" />
            </div>
            <button onClick={handleSearch} disabled={searching}
              className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 disabled:opacity-50">
              {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Search
            </button>
          </div>
          <div className="flex gap-4 text-[10px]">
            <div className="flex items-center gap-1.5">
              <Globe size={10} className="text-zinc-600" />
              {[{ val: '1', label: 'On-site' }, { val: '2', label: 'Remote' }, { val: '3', label: 'Hybrid' }].map(opt => (
                <button key={opt.val} onClick={() => setRemote(prev => prev.includes(opt.val) ? prev.filter(v => v !== opt.val) : [...prev, opt.val])}
                  className={`px-2 py-0.5 rounded-lg border transition-all duration-200 ${remote.includes(opt.val) ? 'border-indigo-500/50 text-indigo-400 bg-indigo-500/10' : 'border-zinc-800 text-zinc-600 hover:border-zinc-600'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <Zap size={10} className="text-zinc-600" />
              {[{ val: '2', label: 'Entry' }, { val: '3', label: 'Associate' }, { val: '4', label: 'Mid-Senior' }, { val: '5', label: 'Director' }].map(opt => (
                <button key={opt.val} onClick={() => setExperience(prev => prev.includes(opt.val) ? prev.filter(v => v !== opt.val) : [...prev, opt.val])}
                  className={`px-2 py-0.5 rounded-lg border transition-all duration-200 ${experience.includes(opt.val) ? 'border-indigo-500/50 text-indigo-400 bg-indigo-500/10' : 'border-zinc-800 text-zinc-600 hover:border-zinc-600'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Job list */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-2">
          {searching ? (
            <div className="space-y-2 pt-4">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="glass border border-zinc-800/50 rounded-xl p-3 animate-shimmer" style={{ animationDelay: `${i*100}ms` }}>
                  <div className="h-4 bg-zinc-800/50 rounded w-2/5 mb-1.5" /><div className="h-3 bg-zinc-800/30 rounded w-1/4" />
                </div>
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-16 text-zinc-700 text-xs">Search for jobs to get started</div>
          ) : (
            jobs.map((job, i) => {
              const detail = jobDetails[job.job_id];
              const isSelected = selectedJob === job.job_id;
              return (
                <div key={job.job_id} className={`glass border rounded-xl overflow-hidden animate-fade-in transition-all duration-200 cursor-pointer ${isSelected ? 'border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'border-zinc-800/50 hover:border-zinc-700/50'}`}
                  style={{ animationDelay: `${i*30}ms` }}>
                  <div className="flex items-center justify-between p-3" onClick={() => loadJobDetail(job.job_id)}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-sm text-zinc-100 truncate">{job.title}</h3>
                        {detail?.is_easy_apply && <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 shrink-0">Easy Apply</span>}
                        {detail && !detail.is_easy_apply && <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20 shrink-0">External</span>}
                        {detail?.employment_type && <span className="text-[9px] px-1.5 py-0.5 bg-zinc-800/50 text-zinc-400 rounded border border-zinc-700/30 shrink-0">{detail.employment_type}</span>}
                        {detail?.experience_level && <span className="text-[9px] px-1.5 py-0.5 bg-zinc-800/50 text-zinc-400 rounded border border-zinc-700/30 shrink-0">{detail.experience_level}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-500">
                        <span className="font-medium text-zinc-400">{job.company || 'Unknown'}</span>
                        <span className="flex items-center gap-0.5"><MapPin size={9} />{job.location || 'N/A'}</span>
                        {job.listed_at && <span>{timeAgo(job.listed_at)}</span>}
                        {job.work_remote_allowed && <span className="text-emerald-400/70">Remote</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {mode === 'advanced' && detail && (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); generateForJob(job.job_id); }} disabled={generating === job.job_id}
                            className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-all disabled:opacity-50" title="Generate application">
                            {generating === job.job_id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                          </button>
                          {detail.is_easy_apply ? (
                            <button onClick={(e) => { e.stopPropagation(); applyToJob(job.job_id); }} disabled={applying === job.job_id}
                              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-50" title="Easy Apply">
                              {applying === job.job_id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                            </button>
                          ) : detail.apply_url ? (
                            <a href={detail.apply_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all" title="Apply on website">
                              <ExternalLink size={12} />
                            </a>
                          ) : null}
                        </>
                      )}
                      {isSelected ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="border-t border-zinc-800/50 p-3 animate-fade-in">
                      {loadingDetail === job.job_id ? (
                        <div className="py-6 text-center"><Loader2 size={16} className="animate-spin mx-auto text-indigo-400" /></div>
                      ) : detail ? (
                        <div className="space-y-3">
                          <div className="flex gap-1.5 flex-wrap items-center">
                            <a href={`https://www.linkedin.com/jobs/view/${job.job_id}`} target="_blank" rel="noreferrer"
                              className="flex items-center gap-1 text-[10px] bg-zinc-800/50 text-zinc-400 px-2 py-1 rounded-lg border border-zinc-700/30 hover:border-zinc-600/50 transition-colors">
                              <ExternalLink size={10} /> LinkedIn
                            </a>
                            {detail.apply_url && (
                              <a href={detail.apply_url} target="_blank" rel="noreferrer"
                                className="flex items-center gap-1 text-[10px] bg-zinc-800/50 text-zinc-400 px-2 py-1 rounded-lg border border-zinc-700/30 hover:border-zinc-600/50 transition-colors">
                                <ExternalLink size={10} /> Apply on Website
                              </a>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); toggleSummary(job.job_id); }}
                              className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border transition-all ml-auto ${
                                showSummary[job.job_id]
                                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                                  : 'bg-zinc-800/50 text-zinc-400 border-zinc-700/30 hover:border-indigo-500/30 hover:text-indigo-400'
                              }`}>
                              {summarizing === job.job_id ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                              AI Summary
                            </button>
                          </div>
                          {showSummary[job.job_id] && (
                            <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-3 text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed animate-fade-in">
                              {summarizing === job.job_id ? (
                                <div className="flex items-center gap-2 text-indigo-400"><Loader2 size={12} className="animate-spin" /> Summarizing with AI...</div>
                              ) : summaries[job.job_id] || 'No summary available'}
                            </div>
                          )}
                          <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-3 text-xs text-zinc-400 whitespace-pre-wrap max-h-[250px] overflow-y-auto leading-relaxed">
                            {detail.description || 'No description'}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right: Chat panel */}
      <div className="w-[380px] flex flex-col glass border-l border-zinc-800/50 py-8 pr-8 pl-4 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Bot size={14} className="text-indigo-400" /> AI Assistant
          </h2>
          <span className={`text-[9px] px-2 py-0.5 rounded-full border ${mode === 'auto' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'}`}>
            {mode === 'auto' ? 'Auto' : 'Advanced'}
          </span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1">
          {chatMessages.map((msg, i) => (
            <div key={i} className={`animate-fade-in ${msg.role === 'user' ? 'flex justify-end' : ''}`}>
              {msg.role === 'system' ? (
                <div className="text-[11px] text-zinc-500 bg-zinc-900/50 px-3 py-2 rounded-xl border border-zinc-800/30 leading-relaxed">
                  <span dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong class="text-zinc-300">$1</strong>') }} />
                </div>
              ) : msg.role === 'user' ? (
                <div className="max-w-[85%] text-xs bg-indigo-500/10 text-indigo-200 px-3 py-2 rounded-xl border border-indigo-500/20">
                  {msg.content}
                </div>
              ) : (
                <div className="text-xs text-zinc-300 bg-zinc-800/30 px-3 py-2 rounded-xl border border-zinc-700/20 leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </div>
              )}
            </div>
          ))}
          {chatLoading && (
            <div className="flex gap-1 px-3 py-2">
              {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" style={{ animationDelay: `${i*150}ms` }} />)}
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input value={chatInput} onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendChat()}
            placeholder="Ask AI to edit, improve, or strategize..."
            className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-700" />
          <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-2.5 rounded-xl transition-all disabled:opacity-30 hover:shadow-[0_0_12px_rgba(99,102,241,0.3)]">
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
