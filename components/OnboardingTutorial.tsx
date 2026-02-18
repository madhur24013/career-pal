
import React, { useState } from 'react';
import { AppMode } from '../types.ts';

interface OnboardingTutorialProps {
  onComplete: () => void;
  onSelectMode: (mode: AppMode) => void;
}

const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({ onComplete, onSelectMode }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { title: "Welcome to CareerPal!", description: "I'm so glad you're here! Let's work together to land you that dream job. I'm your friendly sidekick for all things career.", icon: "fa-hand-peace", mode: null },
    { title: "Your Resume Helper", description: "Let's chat about your career! I'll help you find the best way to tell your story and make that resume look amazing.", icon: "fa-magic", mode: AppMode.RESUME },
    { title: "Your Picture Pal", description: "Need a professional photo but don't want a boring headshot? I can help you create a cool, professional look for your profile.", icon: "fa-camera-retro", mode: AppMode.PORTFOLIO },
    { title: "Friendly Practice", description: "Want to practice for an interview? We can have a relaxed chat where I'll give you friendly tips to help you feel confident.", icon: "fa-mug-hot", mode: AppMode.INTERVIEW },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      if (steps[nextStep].mode) onSelectMode(steps[nextStep].mode as AppMode);
    } else onComplete();
  };

  const current = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-[#0b1619]/80 backdrop-blur-2xl animate-in fade-in duration-700">
      <div className="max-w-4xl w-full glass-dark rounded-[3rem] border border-[#13c8ec]/10 shadow-[0_30px_120px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col md:flex-row h-[550px] animate-in zoom-in-95 duration-700">
        <div className="w-full md:w-2/5 bg-[#13c8ec]/5 border-r border-white/5 flex flex-col justify-center items-center text-center p-12">
          <div className="w-28 h-28 bg-[#13c8ec]/10 rounded-3xl flex items-center justify-center text-6xl text-[#13c8ec] border border-[#13c8ec]/20 shadow-[0_0_40px_rgba(19,200,236,0.3)] mb-8 animate-float">
            <i className={`fas ${current.icon}`}></i>
          </div>
          <p className="text-[11px] font-black uppercase tracking-[0.6em] text-slate-500">Step {currentStep + 1} of {steps.length}</p>
        </div>
        <div className="flex-1 p-12 md:p-20 flex flex-col justify-between bg-black/20">
          <div className="space-y-12">
            <div className="flex items-center justify-between">
               <h3 className="text-4xl font-black text-white tracking-tighter uppercase">{current.title}</h3>
               <button onClick={onComplete} className="text-[11px] font-bold text-slate-600 hover:text-white transition-premium uppercase tracking-[0.2em]">Skip the intro</button>
            </div>
            <p className="text-xl text-slate-400 font-medium leading-relaxed max-w-md">{current.description}</p>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-2.5">
              {steps.map((_, idx) => (
                <div key={idx} className={`h-1.5 rounded-full transition-premium ${idx === currentStep ? 'w-12 bg-[#13c8ec]' : 'w-2 bg-white/10'}`}></div>
              ))}
            </div>
            <button 
              onClick={handleNext}
              className="bg-[#13c8ec] hover:bg-white text-[#0b1619] px-12 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-premium active:scale-95 shadow-2xl"
            >
              {currentStep === steps.length - 1 ? "Let's get started!" : "Next step"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTutorial;
