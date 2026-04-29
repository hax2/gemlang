import React, { useState, useEffect, useCallback } from 'react';
import './Tutorial.css';

const TUTORIAL_SEEN_KEY = 'gemlang-tutorial-seen';

const STEPS = [
  {
    icon: '🔊',
    title: 'Listen to the Sentence',
    body: 'Tap the play button to hear the sentence in Spanish. You can listen as many times as you want. See if you can understand the sentence.',
    accent: 'listen',
  },
  {
    icon: '🗣️',
    title: 'Repeat It Out Loud',
    body: "Say the sentence out loud yourself. Don't skip this step. Producing the sounds of the language comfortably takes practice.",
    accent: 'speak',
  },
  {
    icon: '📝',
    title: 'Reveal the Spanish Text',
    body: 'If you want to confirm what you heard or if there\'s a part you didn\'t catch, you can reveal the written Spanish text.',
    accent: 'text',
  },
  {
    icon: '👆',
    title: 'Tap a Word for Its Meaning',
    body: 'Once the Spanish text is visible, tap any underlined word to see its English meaning, along with memory aids when available.',
    accent: 'word',
  },
  {
    icon: '🌐',
    title: 'Reveal the Full Translation',
    body: 'If you need more context, you can also reveal the full English translation of the sentence.',
    accent: 'translate',
  },
  {
    icon: '✨',
    title: 'The Ideal Flow',
    body: 'If you understood the sentence on the first listen, just repeat it out loud and move on to the next one. The reveals are there as safety nets — you won\'t always need them!',
    accent: 'flow',
  },
];

/** Check if user has already seen the tutorial */
export const hasSeenTutorial = () => {
  try {
    return localStorage.getItem(TUTORIAL_SEEN_KEY) === 'true';
  } catch {
    return false;
  }
};

/** Mark the tutorial as seen */
export const markTutorialSeen = () => {
  try {
    localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
  } catch {
    // localStorage unavailable
  }
};

const Tutorial = ({ onClose }) => {
  const [step, setStep] = useState(0);
  const [animating, setAnimating] = useState(false);
  const isLastStep = step === STEPS.length - 1;
  const current = STEPS[step];

  const goNext = useCallback(() => {
    if (isLastStep) {
      markTutorialSeen();
      onClose();
      return;
    }
    setAnimating(true);
    setTimeout(() => {
      setStep((s) => s + 1);
      setAnimating(false);
    }, 200);
  }, [isLastStep, onClose]);

  const goPrev = useCallback(() => {
    if (step === 0) return;
    setAnimating(true);
    setTimeout(() => {
      setStep((s) => s - 1);
      setAnimating(false);
    }, 200);
  }, [step]);

  const handleSkip = useCallback(() => {
    markTutorialSeen();
    onClose();
  }, [onClose]);

  /* keyboard support */
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') { handleSkip(); return; }
      if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        goNext();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev, handleSkip]);

  return (
    <div className="tutorial-overlay" onClick={handleSkip}>
      <div
        className="tutorial-card glass-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close / Skip button */}
        <button className="tutorial-skip" onClick={handleSkip} title="Skip tutorial">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Progress dots */}
        <div className="tutorial-dots">
          {STEPS.map((_, i) => (
            <button
              key={i}
              className={`tutorial-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
              onClick={() => { setAnimating(true); setTimeout(() => { setStep(i); setAnimating(false); }, 200); }}
              aria-label={`Step ${i + 1}`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className={`tutorial-step ${animating ? 'tutorial-step-exit' : 'tutorial-step-enter'}`}>
          <div className={`tutorial-icon-wrapper tutorial-accent-${current.accent}`}>
            <span className="tutorial-icon">{current.icon}</span>
          </div>
          <h2 className="tutorial-title">{current.title}</h2>
          <p className="tutorial-body">{current.body}</p>
        </div>

        {/* Step counter */}
        <span className="tutorial-counter">{step + 1} / {STEPS.length}</span>

        {/* Navigation */}
        <div className="tutorial-nav">
          {step > 0 ? (
            <button className="btn-secondary tutorial-btn-prev" onClick={goPrev}>
              ← Back
            </button>
          ) : (
            <button className="tutorial-btn-skip-text" onClick={handleSkip}>
              Skip
            </button>
          )}
          <button className="btn-primary tutorial-btn-next" onClick={goNext}>
            {isLastStep ? 'Got it — let\'s go!' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Tutorial;
