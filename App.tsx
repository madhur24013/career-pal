import React, { useState, useEffect } from 'react';
import { AppMode } from './types.ts';
import Sidebar from './components/Sidebar.tsx';
import ChatView from './components/ChatView.tsx';
import ImageView from './components/ImageView.tsx';
import LiveView from './components/LiveView.tsx';
import OnboardingTutorial from './components/OnboardingTutorial.tsx';

const App: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<AppMode>(() => {
    const saved = localStorage.getItem('smart_resume_mode');
    if (saved && Object.values(AppMode).includes(saved as AppMode)) {
      return saved as AppMode;
    }
    return AppMode.RESUME;
  });

  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('smart_pro_onboarded');
  });

  useEffect(() => {
    localStorage.setItem('smart_resume_mode', currentMode);
  }, [currentMode]);

  const handleCompleteOnboarding = () => {
    localStorage.setItem('smart_pro_onboarded', 'true');
    setShowOnboarding(false);
  };

  const renderContent = () => {
    switch (currentMode) {
      case AppMode.RESUME:
        return <ChatView />;
      case AppMode.PORTFOLIO:
        return <ImageView />;
      case AppMode.INTERVIEW:
        return <LiveView />;
      default:
        return <ChatView />;
    }
  };

  return (
    <div className="flex h-screen bg-[#0b1619] text-slate-200 overflow-hidden selection:bg-[#13c8ec]/30">
      <Sidebar activeMode={currentMode} onModeChange={setCurrentMode} />
      <main className="flex-1 flex flex-col relative overflow-hidden transition-all duration-500 ease-in-out">
        {renderContent()}
      </main>
      {showOnboarding && <OnboardingTutorial onComplete={handleCompleteOnboarding} onSelectMode={setCurrentMode} />}
    </div>
  );
};

export default App;
