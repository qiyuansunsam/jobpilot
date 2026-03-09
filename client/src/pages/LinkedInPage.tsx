import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Search, Briefcase, MapPin, Clock, Sparkles, Wifi, WifiOff, LogIn, LogOut, ChevronDown, ChevronUp, ExternalLink, Zap, Globe } from 'lucide-react';

interface LinkedInSession {
  authenticated: boolean;
  name?: string;
  headline?: string;
}

interface Job {
  job_id: string;
  title: string;
  company: string;
  location: string;
  listed_at: number;
  work_remote_allowed: boolean;
}

interface JobDetail {
  job_id: string;
  title: string;
  description: string;
  company: string;
  location: string;
  employment_type: string;
  experience_level: string;
  apply_url: string;
}

export default function LinkedInPage() {
  const [session, setSession] = useState<LinkedInSession>({ authenticated: false });
  const [checkingSession, setCheckingSession] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [keywords, setKeywords] = useState('');
  const [location, setLocation] = useState('');
  const [remote, setRemote] = useState<string[]>([]);
  const [experience, setExperience] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [jobDetails, setJobDetails] = useState<Record<string, JobDetail>>({});
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/linkedin/session').then(({ data }) => {
      setSession(data);
      setCheckingSession(false);
    }).catch(() => setCheckingSession(false));
  }, []);

  const handleLogin = async () => {
    setLoggingIn(true);
    setError('');
    try {
      const { data } = await api.post('/linkedin/login');
      if (data.ok) {
        setSession({ authenticated: true, name: data.name, headline: data.headline });
      } else {
        setError(data.error || 'LinkedIn login failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'LinkedIn login failed');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await api.post('/linkedin/logout');
    setSession({ authenticated: false });
  };

  const handleSearch = async () => {
    if (!keywords && !location) return;
    setSearching(true);
    setError('');
    setJobs([]);
    try {
      const { data } = await api.post('/linkedin/search', {
        keywords: keywords || undefined,
        location_name: location || undefined,
        remote: remote.length > 0 ? remote : undefined,
        experience: experience.length > 0 ? experience : undefined,
        limit: 25,
      });
      setJobs(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const loadJobDetail = async (jobId: string) => {
    if (jobDetails[jobId]) {
      setExpandedJob(expandedJob === jobId ? null : jobId);
      return;
    }
    setExpandedJob(jobId);
    setLoadingDetail(jobId);
    try {
      const { data } = await api.get(`/linkedin/job/${jobId}`);
      setJobDetails(prev => ({ ...prev, [jobId]: data }));
    } catch {
      setError('Failed to load job details');
    } finally {
      setLoadingDetail(null);
    }
  };

  const generateForJob = async (jobId: string) => {
    const detail = jobDetails[jobId];
    if (!detail) return;
    setGenerating(jobId);
    try {
      await api.post('/ai/generate', {
        jobTitle: detail.title,
        company: detail.company,
        jobUrl: `https://www.linkedin.com/jobs/view/${jobId}`,
        jobDescription: detail.description,
        generateType: 'both',
      });
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Generation failed');
      setGenerating(null);
    }
  };

  const timeAgo = (ts: number) => {
    if (!ts) return '';
    const diff = Date.now() - ts;
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  if (checkingSession) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">
            <span className="text-gradient">LinkedIn</span> <span className="text-zinc-100">Jobs</span>
          </h1>
          <p className="text-zinc-600 text-sm mt-1">Search and generate applications</p>
        </div>
        <div className="flex items-center gap-3">
          {session.authenticated ? (
            <>
              <span className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                <Wifi size={12} className="animate-pulse" /> {session.name}
              </span>
              <button onClick={handleLogout} className="flex items-center gap-1 text-xs text-zinc-600 hover:text-red-400 transition-all duration-200 hover:scale-105">
                <LogOut size={14} /> Disconnect
              </button>
            </>
          ) : (
            <span className="flex items-center gap-2 text-sm text-zinc-600">
              <WifiOff size={14} /> Not connected
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl animate-scale-in">
          {error}
          <button onClick={() => setError('')} className="ml-2 text-red-400/50 hover:text-red-400 underline transition-colors">dismiss</button>
        </div>
      )}

      {!session.authenticated ? (
        <div className="flex items-center justify-center py-24 animate-fade-in-up">
          <div className="glass border border-zinc-800/50 rounded-2xl p-12 text-center max-w-md animate-glow-pulse">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 mb-6 animate-float shadow-[0_0_40px_rgba(59,130,246,0.2)]">
              <Briefcase size={32} className="text-white" />
            </div>
            <h2 className="text-xl font-bold mb-2">Connect LinkedIn</h2>
            <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
              Save your LinkedIn credentials in{' '}
              <button onClick={() => navigate('/profile')} className="text-indigo-400 hover:text-indigo-300 underline transition-colors">
                Profile & CV
              </button>{' '}
              first, then connect here to search jobs.
            </p>
            <button
              onClick={handleLogin}
              disabled={loggingIn}
              className="group inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 py-3 rounded-xl text-sm font-medium transition-all duration-300 disabled:opacity-50 shadow-[0_0_20px_rgba(59,130,246,0.2)] hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]"
            >
              {loggingIn ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={16} />
                  Connect to LinkedIn
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="glass border border-zinc-800/50 rounded-2xl p-5 mb-6 animate-fade-in-up">
            <div className="flex gap-3 mb-4">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input
                  value={keywords}
                  onChange={e => setKeywords(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Job title, keywords..."
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-200 placeholder:text-zinc-700"
                />
              </div>
              <div className="flex-1 relative">
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Location (e.g. Sydney, Australia)"
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-200 placeholder:text-zinc-700"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={searching}
                className="group flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 disabled:opacity-50 shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_25px_rgba(99,102,241,0.3)]"
              >
                {searching ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Search size={16} />
                )}
                Search
              </button>
            </div>
            <div className="flex gap-6 text-xs">
              <div className="flex items-center gap-2">
                <Globe size={12} className="text-zinc-600" />
                <span className="text-zinc-600">Workplace:</span>
                {[{ val: '1', label: 'On-site' }, { val: '2', label: 'Remote' }, { val: '3', label: 'Hybrid' }].map(opt => (
                  <button
                    key={opt.val}
                    onClick={() => setRemote(prev => prev.includes(opt.val) ? prev.filter(v => v !== opt.val) : [...prev, opt.val])}
                    className={`px-2.5 py-1 rounded-lg border transition-all duration-200 ${
                      remote.includes(opt.val)
                        ? 'border-indigo-500/50 text-indigo-400 bg-indigo-500/10 shadow-[0_0_8px_rgba(99,102,241,0.15)]'
                        : 'border-zinc-800 text-zinc-600 hover:border-zinc-600 hover:text-zinc-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Zap size={12} className="text-zinc-600" />
                <span className="text-zinc-600">Level:</span>
                {[{ val: '1', label: 'Intern' }, { val: '2', label: 'Entry' }, { val: '3', label: 'Associate' }, { val: '4', label: 'Mid-Senior' }, { val: '5', label: 'Director' }].map(opt => (
                  <button
                    key={opt.val}
                    onClick={() => setExperience(prev => prev.includes(opt.val) ? prev.filter(v => v !== opt.val) : [...prev, opt.val])}
                    className={`px-2.5 py-1 rounded-lg border transition-all duration-200 ${
                      experience.includes(opt.val)
                        ? 'border-indigo-500/50 text-indigo-400 bg-indigo-500/10 shadow-[0_0_8px_rgba(99,102,241,0.15)]'
                        : 'border-zinc-800 text-zinc-600 hover:border-zinc-600 hover:text-zinc-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results */}
          {searching ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-500/10 mb-4">
                <Search className="text-indigo-400 animate-pulse" size={20} />
              </div>
              <p className="text-zinc-500 text-sm">Searching LinkedIn...</p>
              <div className="mt-6 space-y-2 max-w-2xl mx-auto">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="glass border border-zinc-800/50 rounded-xl p-4 animate-shimmer" style={{ animationDelay: `${i * 150}ms` }}>
                    <div className="h-4 bg-zinc-800/50 rounded w-2/5 mb-2" />
                    <div className="h-3 bg-zinc-800/30 rounded w-1/4" />
                  </div>
                ))}
              </div>
            </div>
          ) : jobs.length === 0 && !error ? (
            <div className="text-center py-16 text-zinc-700 text-sm animate-fade-in">
              <Search size={32} className="mx-auto mb-3 text-zinc-800" />
              Search for jobs to get started
            </div>
          ) : (
            <div className="space-y-2 stagger-children">
              <p className="text-xs text-zinc-600 mb-3">{jobs.length} jobs found</p>
              {jobs.map((job, i) => (
                <div key={job.job_id} className="glass border border-zinc-800/50 rounded-2xl overflow-hidden animate-fade-in-up transition-all duration-300 hover:border-zinc-700/50" style={{ animationDelay: `${i * 50}ms` }}>
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-800/20 transition-all duration-200"
                    onClick={() => loadJobDetail(job.job_id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center border border-blue-500/10">
                        <Briefcase size={16} className="text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-zinc-100">{job.title}</h3>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-500">
                          <span>{job.company || 'Unknown'}</span>
                          <span className="flex items-center gap-1"><MapPin size={10} /> {job.location}</span>
                          {job.listed_at && <span className="flex items-center gap-1"><Clock size={10} /> {timeAgo(job.listed_at)}</span>}
                          {job.work_remote_allowed && <span className="text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/10">Remote</span>}
                        </div>
                      </div>
                    </div>
                    <div className="transition-transform duration-200">
                      {expandedJob === job.job_id ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
                    </div>
                  </div>

                  {expandedJob === job.job_id && (
                    <div className="border-t border-zinc-800/50 p-5 animate-fade-in">
                      {loadingDetail === job.job_id ? (
                        <div className="py-8 text-center">
                          <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />
                          <p className="text-zinc-600 text-xs">Loading job details...</p>
                        </div>
                      ) : jobDetails[job.job_id] ? (
                        <div className="space-y-4">
                          <div className="flex gap-2">
                            {jobDetails[job.job_id].apply_url && (
                              <a
                                href={jobDetails[job.job_id].apply_url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1.5 text-xs bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-300 px-3 py-2 rounded-xl border border-zinc-700/30 transition-all duration-200 hover:border-zinc-600/50"
                              >
                                <ExternalLink size={12} /> Apply on site
                              </a>
                            )}
                            <a
                              href={`https://www.linkedin.com/jobs/view/${job.job_id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 text-xs bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-300 px-3 py-2 rounded-xl border border-zinc-700/30 transition-all duration-200 hover:border-zinc-600/50"
                            >
                              <ExternalLink size={12} /> View on LinkedIn
                            </a>
                            <button
                              onClick={() => generateForJob(job.job_id)}
                              disabled={generating === job.job_id}
                              className="group flex items-center gap-1.5 text-xs bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-4 py-2 rounded-xl transition-all duration-300 disabled:opacity-50 shadow-[0_0_12px_rgba(99,102,241,0.2)]"
                            >
                              {generating === job.job_id ? (
                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <Sparkles size={12} className="group-hover:animate-spin" style={{ animationDuration: '1s' }} />
                              )}
                              {generating === job.job_id ? 'Generating...' : 'Generate Application'}
                            </button>
                          </div>
                          <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-5 text-sm text-zinc-300 whitespace-pre-wrap max-h-[400px] overflow-y-auto leading-relaxed">
                            {jobDetails[job.job_id].description || 'No description available'}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
