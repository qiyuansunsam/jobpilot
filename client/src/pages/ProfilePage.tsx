import { useState, useEffect } from 'react';
import api from '../api/client';
import { Upload, Save, Shield, Check, FileText, Pencil, ChevronDown, ChevronUp } from 'lucide-react';

export default function ProfilePage() {
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [cvFilename, setCvFilename] = useState<string | null>(null);
  const [linkedinEmail, setLinkedinEmail] = useState('');
  const [linkedinPass, setLinkedinPass] = useState('');
  const [linkedinConfigured, setLinkedinConfigured] = useState(false);
  const [showCredForm, setShowCredForm] = useState(false);
  const [saving, setSaving] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/profile'),
      api.get('/credentials/linkedin'),
    ]).then(([profileRes, credsRes]) => {
      const p = profileRes.data;
      if (p) {
        setAdditionalInfo(p.additional_info || '');
        setCvFilename(p.cv_filename);
      }
      if (credsRes.data.configured) {
        setLinkedinConfigured(true);
        setLinkedinEmail(credsRes.data.email || '');
      }
    });
  }, []);

  const flash = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const saveInfo = async () => {
    setSaving('info');
    await api.put('/profile', { additional_info: additionalInfo });
    flash('Additional info saved');
    setSaving('');
  };

  const uploadCV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving('cv');
    const form = new FormData();
    form.append('cv', file);
    const { data } = await api.post('/profile/cv', form);
    setCvFilename(data.filename);
    flash(`CV uploaded (${data.textLength} chars extracted)`);
    setSaving('');
  };

  const saveLinkedIn = async () => {
    if (!linkedinEmail || !linkedinPass) return;
    setSaving('linkedin');
    await api.put('/credentials/linkedin', { email: linkedinEmail, password: linkedinPass });
    setLinkedinConfigured(true);
    setLinkedinPass('');
    flash('LinkedIn credentials saved');
    setSaving('');
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-2xl font-bold">
          <span className="text-gradient">Profile</span> <span className="text-zinc-100">& CV</span>
        </h1>
        <p className="text-zinc-600 text-sm mt-1">Your info powers the AI</p>
      </div>

      {message && (
        <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm px-4 py-3 rounded-xl flex items-center gap-2 animate-scale-in">
          <Check size={16} /> {message}
        </div>
      )}

      {/* CV Upload */}
      <section className="glass border border-zinc-800/50 rounded-2xl p-6 mb-4 animate-fade-in-up transition-all duration-300 hover:border-zinc-700/50">
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/10">
            <FileText size={14} className="text-indigo-400" />
          </div>
          CV / Resume
        </h2>
        {cvFilename && (
          <div className="flex items-center gap-2 text-sm text-zinc-400 mb-3 bg-zinc-900/50 px-3 py-2 rounded-xl border border-zinc-800/50">
            <FileText size={14} className="text-indigo-400" />
            <span className="text-zinc-200">{cvFilename}</span>
            <Check size={14} className="text-emerald-400 ml-auto" />
          </div>
        )}
        <label className="block">
          <span className="inline-flex items-center gap-2 bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-300 px-4 py-2.5 rounded-xl text-sm cursor-pointer transition-all duration-200 border border-zinc-700/30 hover:border-zinc-600/50 hover:shadow-[0_0_12px_rgba(99,102,241,0.1)]">
            <Upload size={14} />
            {saving === 'cv' ? 'Uploading...' : 'Upload CV (PDF or TXT)'}
          </span>
          <input type="file" accept=".pdf,.txt" onChange={uploadCV} className="hidden" />
        </label>
      </section>

      {/* Additional Info */}
      <section className="glass border border-zinc-800/50 rounded-2xl p-6 mb-4 animate-fade-in-up transition-all duration-300 hover:border-zinc-700/50" style={{ animationDelay: '100ms' }}>
        <h2 className="text-base font-semibold mb-2 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border border-purple-500/10">
            <Pencil size={14} className="text-purple-400" />
          </div>
          Additional Information
        </h2>
        <p className="text-xs text-zinc-600 mb-4 ml-10">
          Anything extra the AI should know — strengths, tone preferences, what you're looking for.
        </p>
        <textarea
          value={additionalInfo}
          onChange={(e) => setAdditionalInfo(e.target.value)}
          rows={6}
          className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-200 resize-y placeholder:text-zinc-700"
          placeholder="e.g., I'm passionate about AI/ML. I prefer a collaborative team environment. I have 5 years of experience but my CV doesn't highlight my leadership work at..."
        />
        <button
          onClick={saveInfo}
          disabled={saving === 'info'}
          className="mt-3 flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 disabled:opacity-50 shadow-[0_0_12px_rgba(99,102,241,0.15)]"
        >
          <Save size={14} />
          {saving === 'info' ? 'Saving...' : 'Save Info'}
        </button>
      </section>

      {/* LinkedIn Credentials */}
      <section className="glass border border-zinc-800/50 rounded-2xl p-6 animate-fade-in-up transition-all duration-300 hover:border-zinc-700/50" style={{ animationDelay: '200ms' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center border border-blue-500/10">
              <Shield size={14} className="text-blue-400" />
            </div>
            LinkedIn Credentials
            {linkedinConfigured && (
              <span className="ml-2 flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <Check size={10} /> Connected
              </span>
            )}
          </h2>
          {linkedinConfigured && (
            <button
              onClick={() => setShowCredForm(!showCredForm)}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {showCredForm ? <><ChevronUp size={12} /> Hide</> : <><ChevronDown size={12} /> Change Credentials</>}
            </button>
          )}
        </div>

        {(!linkedinConfigured || showCredForm) && (
          <div className="mt-4 animate-fade-in">
            <p className="text-xs text-zinc-600 mb-4 ml-10">
              Encrypted with AES-256-GCM. Used for LinkedIn job search & automation.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1">Email</label>
                <input
                  type="email"
                  value={linkedinEmail}
                  onChange={(e) => setLinkedinEmail(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-200 placeholder:text-zinc-700"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1">Password</label>
                <input
                  type="password"
                  value={linkedinPass}
                  onChange={(e) => setLinkedinPass(e.target.value)}
                  placeholder={linkedinConfigured ? 'Enter new password to update' : 'LinkedIn password'}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-200 placeholder:text-zinc-700"
                />
              </div>
              <button
                onClick={saveLinkedIn}
                disabled={saving === 'linkedin'}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 disabled:opacity-50 shadow-[0_0_12px_rgba(59,130,246,0.15)]"
              >
                <Save size={14} />
                {saving === 'linkedin' ? 'Saving...' : linkedinConfigured ? 'Update Credentials' : 'Save Credentials'}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
