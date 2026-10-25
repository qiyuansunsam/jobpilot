import { createContext, useCallback, useContext, useMemo, useRef, useState, ReactNode } from 'react';
import api from '../../api/client';

export type ConsoleRole = 'user' | 'assistant' | 'system' | 'tool';
export interface ConsoleMessage { role: ConsoleRole; content: string; timestamp: number; ok?: boolean }
export interface ConsoleEvent { tool: string; input: any; summary: string; ok: boolean; data?: any }
type EventHandler = (e: ConsoleEvent) => void;
type ContextProvider = () => string | undefined;

interface ConsoleCtx {
  messages: ConsoleMessage[];
  loading: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
  addLocal: (role: ConsoleRole, content: string, ok?: boolean) => void;
  send: (text: string) => Promise<void>;
  clear: () => void;
  onEvent: (h: EventHandler) => () => void;
  setContextProvider: (p: ContextProvider | null) => void;
}

const WELCOME: ConsoleMessage = {
  role: 'system',
  content: 'JobPilot admin console. I can read and edit your profile and preferences, manage saved applications, search LinkedIn, fetch jobs, generate cover letters and apply. Just tell me what to do.',
  timestamp: Date.now(),
};

const Ctx = createContext<ConsoleCtx | null>(null);

export function ConsoleProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ConsoleMessage[]>([WELCOME]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const handlers = useRef(new Set<EventHandler>());
  const contextProvider = useRef<ContextProvider | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const addLocal = useCallback((role: ConsoleRole, content: string, ok?: boolean) => {
    setMessages(prev => [...prev, { role, content, timestamp: Date.now(), ok }]);
  }, []);

  const send = useCallback(async (text: string) => {
    const msg = text.trim();
    if (!msg) return;
    addLocal('user', msg);
    setLoading(true);
    try {
      const history = [...messagesRef.current, { role: 'user' as const, content: msg, timestamp: 0 }]
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }));
      const context = contextProvider.current?.();
      const { data } = await api.post('/chat', { messages: history, context });
      for (const e of (data.events || []) as ConsoleEvent[]) {
        addLocal('tool', e.summary, e.ok);
        handlers.current.forEach(h => { try { h(e); } catch {} });
      }
      if (data.reply) addLocal('assistant', data.reply);
    } catch (err: any) {
      addLocal('system', `Console error: ${err.response?.data?.error || err.message}`, false);
    } finally {
      setLoading(false);
    }
  }, [addLocal]);

  const clear = useCallback(() => setMessages([{ ...WELCOME, timestamp: Date.now() }]), []);
  const onEvent = useCallback((h: EventHandler) => { handlers.current.add(h); return () => { handlers.current.delete(h); }; }, []);
  const setContextProvider = useCallback((p: ContextProvider | null) => { contextProvider.current = p; }, []);

  const value = useMemo(() => ({ messages, loading, open, setOpen, addLocal, send, clear, onEvent, setContextProvider }),
    [messages, loading, open, addLocal, send, clear, onEvent, setContextProvider]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConsole(): ConsoleCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useConsole must be used inside ConsoleProvider');
  return v;
}
