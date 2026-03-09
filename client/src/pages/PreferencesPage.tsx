import { useState, useEffect } from 'react';
import api from '../api/client';
import { Save, Check, X, Plus, Target } from 'lucide-react';

function TagInput({ label, tags, onChange, placeholder }: {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState('');

  const add = () => {
    const val = input.trim();
    if (val && !tags.includes(val)) {
      onChange([...tags, val]);
    }
    setInput('');
  };

  return (
    <div>
      <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
        {tags.map((tag, i) => (
          <span key={tag} className="group flex items-center gap-1 bg-indigo-500/10 text-indigo-400 text-xs px-3 py-1.5 rounded-lg border border-indigo-500/20 animate-scale-in transition-all duration-200 hover:border-indigo-500/40" style={{ animationDelay: `${i * 30}ms` }}>
            {tag}
            <button onClick={() => onChange(tags.filter(t => t !== tag))} className="text-indigo-400/50 hover:text-red-400 transition-colors">
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder={placeholder}
          className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-200 placeholder:text-zinc-700"
        />
        <button onClick={add} className="bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-400 px-3 py-2.5 rounded-xl border border-zinc-700/30 transition-all duration-200 hover:border-zinc-600/50 hover:text-zinc-200">
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

export default function PreferencesPage() {
  const [jobTitles, setJobTitles] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [experience, setExperience] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/preferences').then(({ data }) => {
      if (data) {
        setJobTitles(data.job_titles || []);
        setLocations(data.locations || []);
        setIndustries(data.industries || []);
        setSalaryMin(data.salary_min?.toString() || '');
        setSalaryMax(data.salary_max?.toString() || '');
        setExperience(data.experience || '');
      }
    });
  }, []);

  const save = async () => {
    setSaving(true);
    await api.put('/preferences', {
      job_titles: jobTitles,
      locations,
      industries,
      salary_min: salaryMin ? parseInt(salaryMin) : null,
      salary_max: salaryMax ? parseInt(salaryMax) : null,
      experience: experience || null,
    });
    setMessage('Preferences saved');
    setTimeout(() => setMessage(''), 3000);
    setSaving(false);
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-2xl font-bold">
          <span className="text-gradient">Preferences</span>
        </h1>
        <p className="text-zinc-600 text-sm mt-1">Tell the AI what you're looking for</p>
      </div>

      {message && (
        <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm px-4 py-3 rounded-xl flex items-center gap-2 animate-scale-in">
          <Check size={16} /> {message}
        </div>
      )}

      <div className="glass border border-zinc-800/50 rounded-2xl p-6 space-y-6 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-500/10">
            <Target size={14} className="text-amber-400" />
          </div>
          <h2 className="text-base font-semibold">Job Targeting</h2>
        </div>

        <TagInput label="Target Job Titles" tags={jobTitles} onChange={setJobTitles} placeholder="e.g. Software Engineer" />
        <TagInput label="Preferred Locations" tags={locations} onChange={setLocations} placeholder="e.g. Remote, Sydney, London" />
        <TagInput label="Industries" tags={industries} onChange={setIndustries} placeholder="e.g. Tech, Finance, Healthcare" />

        <div>
          <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Experience Level</label>
          <div className="flex gap-2">
            {[{ val: 'entry', label: 'Entry' }, { val: 'mid', label: 'Mid' }, { val: 'senior', label: 'Senior' }, { val: 'lead', label: 'Lead' }].map(opt => (
              <button
                key={opt.val}
                onClick={() => setExperience(experience === opt.val ? '' : opt.val)}
                className={`px-4 py-2 rounded-xl text-sm border transition-all duration-200 ${
                  experience === opt.val
                    ? 'border-indigo-500/50 text-indigo-400 bg-indigo-500/10 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                    : 'border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Salary Min ($)</label>
            <input
              type="number"
              value={salaryMin}
              onChange={e => setSalaryMin(e.target.value)}
              placeholder="60000"
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-200 placeholder:text-zinc-700"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Salary Max ($)</label>
            <input
              type="number"
              value={salaryMax}
              onChange={e => setSalaryMax(e.target.value)}
              placeholder="120000"
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-200 placeholder:text-zinc-700"
            />
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-5 py-3 rounded-xl text-sm font-medium transition-all duration-300 disabled:opacity-50 shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_25px_rgba(99,102,241,0.3)]"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save size={14} />
          )}
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}
