import React from 'react';
import { AppMode } from '../types.ts';
import GuideTooltip from './GuideTooltip.tsx';
import * as db from '../lib/db.ts';

interface SidebarProps {
  activeMode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeMode, onModeChange }) => {
  const navItems = [
    { id: 'nav_resume', mode: AppMode.RESUME, icon: 'fa-hand-holding-heart', label: 'Resume Helper', desc: 'Let\'s chat about your experience and make your resume shine.' },
    { id: 'nav_portfolio', mode: AppMode.PORTFOLIO, icon: 'fa-camera-retro', label: 'Picture Pal', desc: 'Need a cool professional photo? Let\'s make one together!' },
    { id: 'nav_interview', mode: AppMode.INTERVIEW, icon: 'fa-comments', label: 'Interview Practice', desc: 'Let\'s practice for your big day in a totally relaxed way.' },
  ];

  const handleSecureWipe = async () => {
    if (window.confirm("CRITICAL: This will permanently delete all resumes, interview logs, and portfolio photos from this computer. Continue?")) {
      localStorage.clear();
      await db.nukeDatabase();
      window.location.reload();
    }
  };

  return (
    <aside className="w-20 md:w-72 glass border-r border-white/5 flex flex-col z-50 transition-premium">
      <div className="p-8 md:p-10 mb-4">
        <div className="flex items-center gap-4 group cursor-pointer" onClick={() => window.location.reload()}>
          <div className="w-10 h-10 bg-[#13c8ec] rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(19,200,236,0.3)] transition-premium">
            <i className="fas fa-heart text-[#0b1619] text-lg"></i>
          </div>
          <div className="hidden md:block">
            <h1 className="text-xl font-bold text-white tracking-tight">
              CAREER<span className="text-[#13c8ec]">PAL</span>
            </h1>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-0.5 opacity-40">Your Career Sidekick</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-3">
        {navItems.map((item) => (
          <GuideTooltip 
            key={item.mode} 
            id={item.id} 
            title={item.label} 
            description={item.desc} 
            position="right"
          >
            <button
              onClick={() => onModeChange(item.mode)}
              className={`w-full group relative flex items-center justify-center md:justify-start gap-4 px-5 py-4 rounded-xl transition-premium ${
                activeMode === item.mode
                  ? 'bg-[#13c8ec]/5 text-white border border-[#13c8ec]/10'
                  : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <i className={`fas ${item.icon} text-lg transition-premium ${activeMode === item.mode ? 'text-[#13c8ec]' : 'opacity-40 group-hover:opacity-100'}`}></i>
              <span className={`hidden md:block font-semibold text-sm tracking-tight ${activeMode === item.mode ? 'opacity-100' : 'opacity-60'}`}>
                {item.label}
              </span>
            </button>
          </GuideTooltip>
        ))}
      </nav>

      <div className="p-8 space-y-4">
        <button 
          onClick={handleSecureWipe}
          className="w-full flex items-center justify-center md:justify-start gap-4 px-5 py-3 rounded-xl text-slate-600 hover:text-red-400 hover:bg-red-500/5 transition-premium group"
        >
          <i className="fas fa-user-secret text-sm opacity-40 group-hover:opacity-100"></i>
          <span className="hidden md:block text-[10px] font-bold uppercase tracking-widest">Secure Wipe</span>
        </button>

        <div className="hidden md:block p-5 rounded-2xl bg-white/[0.02] border border-white/5 relative group">
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse-soft shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Signal Status</p>
              <p className="text-[9px] text-emerald-500/80 font-bold uppercase mt-0.5">Ready to help!</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
