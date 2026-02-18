
import React, { useState, useEffect } from 'react';

interface GuideTooltipProps {
  id: string; // Unique identifier to track dismissal
  title: string;
  description: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const GuideTooltip: React.FC<GuideTooltipProps> = ({ id, title, description, children, position = 'bottom' }) => {
  // Use lazy initializer to sync state with localStorage immediately on first render
  const [isDismissed, setIsDismissed] = useState(() => {
    return !!localStorage.getItem(`guide_protocol_${id}`);
  });
  const [isOpen, setIsOpen] = useState(false);

  // Still use useEffect to handle id changes if the component is reused
  useEffect(() => {
    const dismissed = localStorage.getItem(`guide_protocol_${id}`);
    setIsDismissed(!!dismissed);
  }, [id]);

  const handleAcknowledge = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    localStorage.setItem(`guide_protocol_${id}`, 'true');
    setIsDismissed(true);
    setIsOpen(false);
  };

  const handleMouseEnter = () => {
    if (!isDismissed) {
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    setIsOpen(false);
  };

  // We remove the margins (mb-4, mt-4, etc.) to close the physical gap
  // We use padding on the absolute container instead to act as a "hitbox bridge"
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 pb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 pt-2',
    left: 'right-full top-1/2 -translate-y-1/2 pr-2',
    right: 'left-full top-1/2 -translate-y-1/2 pl-2',
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      
      {isOpen && !isDismissed && (
        <div className={`absolute ${positionClasses[position]} z-[100] animate-in fade-in zoom-in-95 duration-200 pointer-events-auto`}>
          <div className="w-72 glass-dark p-6 rounded-[2rem] border border-[#13c8ec]/40 shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-8 h-8 rounded-xl bg-[#13c8ec]/10 flex items-center justify-center text-[#13c8ec] text-xs border border-[#13c8ec]/20">
                <i className="fas fa-microchip"></i>
              </div>
              <div>
                <h4 className="text-[12px] font-extrabold uppercase tracking-widest text-white leading-none">{title}</h4>
                <p className="text-[8px] font-bold text-[#13c8ec]/60 uppercase tracking-[0.2em] mt-1.5">Intelligence Guide</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-medium mb-6">
              {description}
            </p>
            <div className="flex gap-2">
              <button 
                onClick={handleAcknowledge}
                className="flex-1 py-3 bg-[#13c8ec] hover:bg-white text-[#0b1619] rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-premium shadow-lg active:scale-95"
              >
                Understand
              </button>
            </div>
            {/* Arrow */}
            <div className={`absolute w-3 h-3 bg-[#111e21] border-[#13c8ec]/40 rotate-45 transform 
              ${position === 'bottom' ? '-top-1.5 left-1/2 -translate-x-1/2 border-t border-l' : ''}
              ${position === 'top' ? '-bottom-1.5 left-1/2 -translate-x-1/2 border-b border-r' : ''}
              ${position === 'left' ? '-right-1.5 top-1/2 -translate-y-1/2 border-t border-r' : ''}
              ${position === 'right' ? '-left-1.5 top-1/2 -translate-y-1/2 border-b border-l' : ''}
            `}></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuideTooltip;
