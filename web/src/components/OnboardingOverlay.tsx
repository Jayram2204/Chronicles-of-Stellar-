import React, { useState } from 'react';

const STEPS = [
  {
    step: 1,
    title: 'CONNECT YOUR WALLET',
    body: 'Install the Freighter browser extension and connect your Stellar wallet. This lets you sign on-chain transactions for PvP battles and NPC interactions.',
    icon: '🔑',
  },
  {
    step: 2,
    title: 'TALK TO NPCS',
    body: 'Approach an NPC in the game and press the attack key to open a terminal. Type natural language — the AI responds in-character and can approve on-chain actions.',
    icon: '🤖',
  },
  {
    step: 3,
    title: 'FIGHT ON-CHAIN',
    body: 'Enter the PvP Arena to create or accept XLM wagers. Your score is submitted to the Soroban smart contract and the winner gets paid automatically.',
    icon: '⚔️',
  },
];

interface OnboardingOverlayProps {
  onComplete: () => void;
}

export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const step = STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-[#0a1a0a] border-2 border-[#306230] rounded-xl overflow-hidden shadow-[0_0_40px_rgba(15,38,15,0.8)]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#0f260f] border-b border-[#2a4a1a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{step.icon}</span>
            <span className="text-[#8bac0f] font-bold text-sm tracking-wider uppercase">
              Step {step.step} of {STEPS.length}
            </span>
          </div>
          <button
            onClick={handleSkip}
            className="text-[10px] text-[#306230] hover:text-[#8bac0f] transition cursor-pointer uppercase"
          >
            Skip Tutorial
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-[#060c06]">
          <div
            className="h-full bg-[#8bac0f] transition-all duration-500"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="px-6 py-8">
          <h2 className="text-lg font-bold text-[#e0f8d0] mb-4 tracking-wide">
            {step.title}
          </h2>
          <p className="text-sm text-[#8bac0f] leading-relaxed">
            {step.body}
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#2a4a1a] flex justify-between items-center">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentStep ? 'bg-[#8bac0f]' : 'bg-[#1a3a1a]'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="px-6 py-2 bg-[#306230] hover:bg-[#3a7a3a] text-[#e0f8d0] font-bold text-sm rounded transition cursor-pointer uppercase tracking-wider"
          >
            {currentStep < STEPS.length - 1 ? 'Next' : 'Start Playing'}
          </button>
        </div>
      </div>
    </div>
  );
};
