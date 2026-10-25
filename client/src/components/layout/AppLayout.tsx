import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Bot } from 'lucide-react';
import Sidebar from './Sidebar';
import { ConsoleProvider, useConsole } from '../console/ConsoleContext';
import AssistantConsole from '../console/AssistantConsole';

function ConsoleDrawer() {
  const { pathname } = useLocation();
  const { open, setOpen, loading } = useConsole();
  if (pathname === '/linkedin') return null; // that page embeds the console itself
  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} title="Open admin console"
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-2xl text-xs font-medium shadow-[0_0_24px_rgba(99,102,241,0.35)] hover:shadow-[0_0_32px_rgba(99,102,241,0.5)] transition-all">
          <Bot size={14} className={loading ? 'animate-pulse' : ''} /> Console
        </button>
      )}
      {open && (
        <div className="fixed top-0 right-0 bottom-0 z-40 w-[400px] max-w-full glass border-l border-zinc-800/50 p-6 animate-fade-in">
          <AssistantConsole className="h-full" onClose={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ConsoleProvider>
      <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
        {/* Ambient background glow */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/[0.03] rounded-full blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-purple-500/[0.03] rounded-full blur-[120px]" />
        </div>
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-8 relative">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
        <ConsoleDrawer />
      </div>
    </ConsoleProvider>
  );
}
