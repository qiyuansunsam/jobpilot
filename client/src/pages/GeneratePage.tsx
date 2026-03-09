import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Sparkles, Copy, Check, ArrowRight, Wand2 } from 'lucide-react';

export default function GeneratePage() {
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [generateType, setGenerateType] = useState<'cover_letter' | 'screening_answers' | 'both'>('both');
  const [screeningQuestions, setScreeningQuestions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    coverLetter: string | null;
    screeningAnswers: string | null;
    rawResponse: string;
  } | null>(null);
  const [copied, setCopied] = useState('');
  const navigate = useNavigate();

  const handleGenerate = async () => {
    if (jobDescription.length < 10) {
      setError('Job description must be at least 10 characters');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const questions = screeningQuestions.split('\n').map(q => q.trim()).filter(Boolean);
      const { data } = await api.post('/ai/generate', {
        jobTitle: jobTitle || undefined,
        company: company || undefined,
        jobUrl: jobUrl || undefined,
        jobDescription,
        generateType,
        screeningQuestions: questions.length > 0 ? questions : undefined,
      });
      setResult(data.generated);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Generation failed. Check your Claude proxy.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-2xl font-bold">
          <span className="text-gradient">Generate</span> <span className="text-zinc-100">Application</span>
        </h1>
        <p className="text-zinc-600 text-sm mt-1">Paste a job description, let Claude craft your application</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Input */}
        <div className="animate-fade-in-up">
          <div className="glass border border-zinc-800/50 rounded-2xl p-6 space-y-4 transition-all duration-300 hover:border-zinc-700/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/10">
                <Wand2 size={14} className="text-indigo-400" />
              </div>
              <h2 className="text-base font-semibold">Job Details</h2>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl animate-scale-in">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-600 mb-1">Job Title</label>
                <input
                  value={jobTitle}
                  onChange={e => setJobTitle(e.target.value)}
                  placeholder="Software Engineer"
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-200 placeholder:text-zinc-700"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-600 mb-1">Company</label>
                <input
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  placeholder="Acme Corp"
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-200 placeholder:text-zinc-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-600 mb-1">Job URL (optional)</label>
              <input
                value={jobUrl}
                onChange={e => setJobUrl(e.target.value)}
                placeholder="https://linkedin.com/jobs/..."
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-200 placeholder:text-zinc-700"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-600 mb-1">Job Description *</label>
              <textarea
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                rows={8}
                placeholder="Paste the full job description here..."
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-200 resize-y placeholder:text-zinc-700"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-600 mb-2">Generate Type</label>
              <div className="flex gap-2">
                {[
                  { val: 'both' as const, label: 'Both' },
                  { val: 'cover_letter' as const, label: 'Cover Letter' },
                  { val: 'screening_answers' as const, label: 'Screening' },
                ].map(opt => (
                  <button
                    key={opt.val}
                    onClick={() => setGenerateType(opt.val)}
                    className={`px-3 py-2 rounded-xl text-xs border transition-all duration-200 ${
                      generateType === opt.val
                        ? 'border-indigo-500/50 text-indigo-400 bg-indigo-500/10'
                        : 'border-zinc-800 text-zinc-600 hover:border-zinc-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {(generateType === 'screening_answers' || generateType === 'both') && (
              <div className="animate-fade-in">
                <label className="block text-xs text-zinc-600 mb-1">Screening Questions (one per line)</label>
                <textarea
                  value={screeningQuestions}
                  onChange={e => setScreeningQuestions(e.target.value)}
                  rows={3}
                  placeholder={"Why do you want to work here?\nDescribe a challenging project."}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-200 resize-y placeholder:text-zinc-700"
                />
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="group w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-3 rounded-xl text-sm font-medium transition-all duration-300 disabled:opacity-50 shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles size={16} className="group-hover:animate-spin" style={{ animationDuration: '1s' }} />
                  Generate Application
                </>
              )}
            </button>
          </div>
        </div>

        {/* Output */}
        <div className="animate-slide-in-right">
          {loading && (
            <div className="glass border border-zinc-800/50 rounded-2xl p-16 text-center animate-glow-pulse">
              <div className="animate-float">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 mb-4 border border-indigo-500/10">
                  <Sparkles className="text-indigo-400 animate-pulse" size={24} />
                </div>
              </div>
              <p className="text-zinc-400 font-medium">Claude is crafting your application...</p>
              <p className="text-zinc-600 text-xs mt-2">Using your CV, additional info & preferences</p>
              <div className="mt-6 flex justify-center gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                ))}
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-4 stagger-children">
              {result.coverLetter && (
                <div className="glass border border-zinc-800/50 rounded-2xl p-6 animate-fade-in-up transition-all duration-300 hover:border-zinc-700/50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-zinc-100 flex items-center gap-2">
                      <Sparkles size={14} className="text-indigo-400" />
                      Cover Letter
                    </h3>
                    <button
                      onClick={() => copyToClipboard(result.coverLetter!, 'cover')}
                      className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-indigo-400 transition-all duration-200 bg-zinc-800/50 px-3 py-1.5 rounded-lg border border-zinc-700/30 hover:border-indigo-500/30"
                    >
                      {copied === 'cover' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      {copied === 'cover' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                    {result.coverLetter}
                  </div>
                </div>
              )}

              {result.screeningAnswers && (
                <div className="glass border border-zinc-800/50 rounded-2xl p-6 animate-fade-in-up transition-all duration-300 hover:border-zinc-700/50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-zinc-100 flex items-center gap-2">
                      <Sparkles size={14} className="text-purple-400" />
                      Screening Answers
                    </h3>
                    <button
                      onClick={() => copyToClipboard(result.screeningAnswers!, 'answers')}
                      className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-indigo-400 transition-all duration-200 bg-zinc-800/50 px-3 py-1.5 rounded-lg border border-zinc-700/30 hover:border-indigo-500/30"
                    >
                      {copied === 'answers' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      {copied === 'answers' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                    {result.screeningAnswers}
                  </div>
                </div>
              )}

              <button
                onClick={() => navigate('/')}
                className="group w-full flex items-center justify-center gap-2 bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-300 py-3 rounded-xl text-sm font-medium border border-zinc-700/30 transition-all duration-200 hover:border-zinc-600/50"
              >
                View in Dashboard
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-200" />
              </button>
            </div>
          )}

          {!loading && !result && (
            <div className="glass border border-zinc-800/50 rounded-2xl p-16 text-center">
              <div className="animate-float">
                <Sparkles className="mx-auto text-zinc-800 mb-4" size={40} />
              </div>
              <p className="text-zinc-600 text-sm">Fill in the job details and click Generate</p>
              <p className="text-zinc-700 text-xs mt-2">Uses your CV + additional info + preferences</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
