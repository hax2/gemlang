import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import './Tutorial.css';

const TUTORIAL_SEEN_KEY = 'gemlang-tutorial-seen';

const STEPS = [
  {
    icon: '🔊',
    title: 'Listen to the Sentence',
    body: 'Tap the play button to hear the sentence in Spanish. Listen as many times as you want!',
    accent: 'listen',
    targetSelector: '.btn-play',
    pointerPosition: 'bottom', // tooltip appears below
  },
  {
    icon: '🗣️',
    title: 'Repeat It Out Loud',
    body: "Say the sentence out loud yourself — speaking is the fastest way to build fluency.",
    accent: 'speak',
    targetSelector: '.btn-play',
    pointerPosition: 'bottom',
  },
  {
    icon: '📝',
    title: 'Reveal the Spanish Text',
    body: "Didn't catch something? Tap this to see the written Spanish.",
    accent: 'text',
    targetSelector: '.btn-reveal',
    pointerPosition: 'top',
  },
  {
    icon: '👆',
    title: 'Tap a Word for Its Meaning',
    body: 'Once the text is visible, tap any underlined word to see its English meaning and memory aids.',
    accent: 'word',
    targetSelector: '.spanish-area',
    pointerPosition: 'top',
  },
  {
    icon: '🌐',
    title: 'Reveal the Full Translation',
    body: 'Need more context? Reveal the full English translation of the sentence.',
    accent: 'translate',
    targetSelector: '.btn-text-reveal',
    pointerPosition: 'top',
  },
  {
    icon: '✨',
    title: 'The Ideal Flow',
    body: "If you understood it on the first listen, just repeat it and move on! The reveals are safety nets — you won't always need them.",
    accent: 'flow',
    targetSelector: null, // centered card
    pointerPosition: 'center',
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

/* ── Sparkle particles ──────────────────── */
const Sparkles = () => (
  <div className="tutorial-sparkles" aria-hidden="true">
    {[...Array(6)].map((_, i) => (
      <span key={i} className="tutorial-sparkle" style={{ '--i': i }} />
    ))}
  </div>
);

const Tutorial = ({ onClose }) => {
  const [step, setStep] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [spotlightRect, setSpotlightRect] = useState(null);
  const cardRef = useRef(null);
  const isLastStep = step === STEPS.length - 1;
  const current = STEPS[step];

  /* ── Measure target element ──────────── */
  const measureTarget = useCallback(() => {
    if (!current.targetSelector) {
      setSpotlightRect(null);
      return;
    }
    const el = document.querySelector(current.targetSelector);
    if (!el) {
      setSpotlightRect(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    const padding = 12;
    setSpotlightRect({
      x: rect.left - padding,
      y: rect.top - padding,
      w: rect.width + padding * 2,
      h: rect.height + padding * 2,
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
      elRect: rect,
    });
  }, [current.targetSelector]);

  useLayoutEffect(() => {
    measureTarget();
  }, [measureTarget, step]);

  useEffect(() => {
    const handle = () => measureTarget();
    window.addEventListener('resize', handle);
    window.addEventListener('scroll', handle, true);
    return () => {
      window.removeEventListener('resize', handle);
      window.removeEventListener('scroll', handle, true);
    };
  }, [measureTarget]);

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
    }, 250);
  }, [isLastStep, onClose]);

  const goPrev = useCallback(() => {
    if (step === 0) return;
    setAnimating(true);
    setTimeout(() => {
      setStep((s) => s - 1);
      setAnimating(false);
    }, 250);
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

  /* ── Card positioning ──────────────── */
  const getCardStyle = () => {
    if (!spotlightRect) return {}; // centered via CSS

    const cardWidth = 360;
    const cardHeight = 260;
    const gap = 20;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top, left;

    if (current.pointerPosition === 'bottom') {
      // Card below the target
      top = spotlightRect.y + spotlightRect.h + gap;
      left = spotlightRect.cx - cardWidth / 2;
    } else {
      // Card above the target
      top = spotlightRect.y - cardHeight - gap;
      left = spotlightRect.cx - cardWidth / 2;
    }

    // Clamp to viewport
    left = Math.max(16, Math.min(left, vw - cardWidth - 16));
    top = Math.max(16, Math.min(top, vh - cardHeight - 16));

    // If card would overlap the spotlight, push it down/up
    if (current.pointerPosition === 'top' && top + cardHeight > spotlightRect.y - 8) {
      top = spotlightRect.y + spotlightRect.h + gap;
    }

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${cardWidth}px`,
    };
  };

  /* ── Pointer arrow position ──────── */
  const getPointerStyle = () => {
    if (!spotlightRect) return { display: 'none' };

    const arrowSize = 40;
    let top, left;

    if (current.pointerPosition === 'bottom') {
      // Arrow sits between target and card below
      top = spotlightRect.y + spotlightRect.h + 2;
      left = spotlightRect.cx - arrowSize / 2;
    } else {
      // Arrow sits between card above and target
      top = spotlightRect.y - arrowSize - 2;
      left = spotlightRect.cx - arrowSize / 2;
    }

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
    };
  };

  const isCentered = !spotlightRect;

  return (
    <div className={`tutorial-overlay ${spotlightRect ? 'has-spotlight' : ''}`} onClick={handleSkip}>
      {/* SVG spotlight mask */}
      {spotlightRect && (
        <svg className="tutorial-spotlight-svg" width="100%" height="100%">
          <defs>
            <mask id="tutorial-spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={spotlightRect.x}
                y={spotlightRect.y}
                width={spotlightRect.w}
                height={spotlightRect.h}
                rx="16"
                ry="16"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.75)"
            mask="url(#tutorial-spotlight-mask)"
          />
          {/* Glowing ring around the target */}
          <rect
            className="tutorial-spotlight-ring"
            x={spotlightRect.x - 2}
            y={spotlightRect.y - 2}
            width={spotlightRect.w + 4}
            height={spotlightRect.h + 4}
            rx="18"
            ry="18"
            fill="none"
            strokeWidth="2"
          />
        </svg>
      )}

      {/* Animated pointer arrow */}
      {spotlightRect && (
        <div
          className={`tutorial-pointer ${current.pointerPosition === 'bottom' ? 'points-down' : 'points-up'}`}
          style={getPointerStyle()}
          aria-hidden="true"
        >
          <svg viewBox="0 0 40 40" width="40" height="40" className="tutorial-pointer-svg">
            <path d="M20 8 L12 28 L20 24 L28 28 Z" fill="currentColor" />
          </svg>
        </div>
      )}

      {/* Tooltip card */}
      <div
        ref={cardRef}
        className={`tutorial-card ${isCentered ? 'tutorial-card-centered' : 'tutorial-card-anchored'}`}
        style={isCentered ? {} : getCardStyle()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated gradient border */}
        <div className="tutorial-card-border" />

        {/* Close / Skip button */}
        <button className="tutorial-skip" onClick={handleSkip} title="Skip tutorial">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Step progress bar */}
        <div className="tutorial-progress-track">
          <div
            className="tutorial-progress-fill"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Step content */}
        <div className={`tutorial-step ${animating ? 'tutorial-step-exit' : 'tutorial-step-enter'}`}>
          <div className={`tutorial-icon-wrapper tutorial-accent-${current.accent}`}>
            <span className="tutorial-icon">{current.icon}</span>
            {current.accent === 'flow' && <Sparkles />}
          </div>
          <div className="tutorial-step-text">
            <h2 className="tutorial-title">{current.title}</h2>
            <p className="tutorial-body">{current.body}</p>
          </div>
        </div>

        {/* Step dots */}
        <div className="tutorial-dots">
          {STEPS.map((_, i) => (
            <button
              key={i}
              className={`tutorial-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
              onClick={() => { setAnimating(true); setTimeout(() => { setStep(i); setAnimating(false); }, 250); }}
              aria-label={`Step ${i + 1}`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="tutorial-nav">
          {step > 0 ? (
            <button className="tutorial-btn-prev" onClick={goPrev}>
              ← Back
            </button>
          ) : (
            <button className="tutorial-btn-skip-text" onClick={handleSkip}>
              Skip
            </button>
          )}
          <button className="tutorial-btn-next" onClick={goNext}>
            {isLastStep ? "Got it — let's go!" : 'Next →'}
          </button>
        </div>

        {/* Step counter */}
        <span className="tutorial-counter">{step + 1} of {STEPS.length}</span>
      </div>
    </div>
  );
};

export default Tutorial;
