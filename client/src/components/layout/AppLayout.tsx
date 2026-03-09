import { ReactNode } from 'react';
import Sidebar from './Sidebar';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
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
    </div>
  );
}
