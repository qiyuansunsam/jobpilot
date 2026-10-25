import { useEffect, useRef, useState } from 'react';
import { Bot, Send, Loader2, Trash2, Wrench, CheckCircle, XCircle, X } from 'lucide-react';
import { useConsole } from './ConsoleContext';

const bold = (s: string) => s.replace(/\*\*(.*?)\*\*/g, '<strong class="text-zinc-200">$1</strong>');

export default function AssistantConsole({ className = '', onClose }: { className?: string; onClose?: () => void }) {
  const { messages, loading, send, clear } = useConsole();
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const submit = () => {
    if (!input.trim() || loading) return;
    const text = input;
    setInput('');
    send(text);
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Bot size={14} className="text-indigo-400" /> Admin Console
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={clear} title="Clear conversation" className="text-zinc-600 hover:text-zinc-300 transition-colors"><Trash2 size={12} /></button>
          {onClose && <button onClick={onClose} title="Close" className="text-zinc-600 hover:text-zinc-300 transition-colors"><X size={14} /></button>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1">
        {messages.map((m, i) => {
          if (m.role === 'tool') return (
            <div key={i} className={`animate-fade-in flex items-start gap-2 text-[11px] px-3 py-1.5 rounded-lg border ${m.ok === false ? 'text-red-300 bg-red-500/5 border-red-500/20' : 'text-zinc-400 bg-zinc-900/40 border-zinc-800/40'}`}>
              <Wrench size={10} className="mt-0.5 shrink-0 text-indigo-400" />
              <span className="flex-1 leading-relaxed">{m.content}</span>
              {m.ok === false ? <XCircle size={10} className="mt-0.5 shrink-0 text-red-400" /> : <CheckCircle size={10} className="mt-0.5 shrink-0 text-emerald-400" />}
            </div>
          );
          if (m.role === 'system') return (
            <div key={i} className={`animate-fade-in text-[11px] px-3 py-2 rounded-xl border leading-relaxed ${m.ok === false ? 'text-red-300 bg-red-500/5 border-red-500/20' : 'text-zinc-500 bg-zinc-900/50 border-zinc-800/30'}`}>
              <span dangerouslySetInnerHTML={{ __html: bold(m.content) }} />
            </div>
          );
          if (m.role === 'user') return (
            <div key={i} className="animate-fade-in flex justify-end">
              <div className="max-w-[85%] text-xs bg-indigo-500/10 text-indigo-200 px-3 py-2 rounded-xl border border-indigo-500/20 whitespace-pre-wrap">{m.content}</div>
            </div>
          );
          return (
            <div key={i} className="animate-fade-in text-xs text-zinc-300 bg-zinc-800/30 px-3 py-2 rounded-xl border border-zinc-700/20 leading-relaxed whitespace-pre-wrap">
              <span dangerouslySetInnerHTML={{ __html: bold(m.content) }} />
            </div>
          );
        })}
        {loading && (
          <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-zinc-500">
            <Loader2 size={12} className="animate-spin text-indigo-400" /> Working...
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Search jobs, edit a cover letter, update preferences..."
          className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-700" />
        <button onClick={submit} disabled={loading || !input.trim()}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-2.5 rounded-xl transition-all disabled:opacity-30 hover:shadow-[0_0_12px_rgba(99,102,241,0.3)]">
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
