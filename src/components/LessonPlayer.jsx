import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Tutorial from './Tutorial';
import { hasSeenTutorial, markTutorialSeen } from '../utils/tutorialStorage';
import './LessonPlayer.css';

/* helpers */
const cleanWord = (w) => w.replace(/[.,¿?¡!]/g, '');

/** Collect every unique word->meaning pair from all sentences in a module,
 *  and merge in any mnemonic / explanation from the module-level vocabulary. */
const buildVocabTable = (sentences, vocabulary = {}) => {
  const map = new Map();
  sentences.forEach((s) => {
    const meanings = s.wordMeanings || {};
    Object.entries(meanings).forEach(([word, meaning]) => {
      const key = word.toLowerCase();
      if (!map.has(key)) {
        const vocabEntry = vocabulary[key] || {};
        map.set(key, {
          word,
          meaning,
          mnemonic: vocabEntry.mnemonic || null,
          explanation: vocabEntry.explanation || null,
        });
      }
    });
  });
  return Array.from(map.values());
};

/** Deterministic pseudo-random from a seed string */
const seededRandom = (seed) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return Math.abs(h);
};

/**
 * Build a merged list of regular sentence items + translation-challenge items.
 * A challenge is inserted after every `interval` sentences.
 * Each challenge picks one sentence from the preceding batch.
 */
const buildMergedItems = (sentences, moduleId, interval) => {
  const items = [];
  let sentenceCount = 0;

  for (let i = 0; i < sentences.length; i++) {
    items.push({ type: 'sentence', data: sentences[i], originalIndex: i });
    sentenceCount++;

    if (interval > 0 && sentenceCount === interval && i < sentences.length - 1) {
      const batchStart = i - (interval - 1);
      let candidateIndexes = [];
      for (let idx = batchStart; idx < i; idx++) {
        candidateIndexes.push(idx);
      }

      if (candidateIndexes.length === 0 && i > 0) {
        candidateIndexes = Array.from({ length: i }, (_, idx) => idx);
      }

      if (candidateIndexes.length === 0) {
        sentenceCount = 0;
        continue;
      }

      const seed = `${moduleId}-challenge-${items.length}`;
      const pick = seededRandom(seed) % candidateIndexes.length;
      const chosenSentence = sentences[candidateIndexes[pick]];

      items.push({
        type: 'challenge',
        data: chosenSentence,
        batchStart,
        batchEnd: i,
      });
      sentenceCount = 0;
    }
  }
  return items;
};

/** Build challenge-only items for pure testing mode */
const buildTestingItems = (sentences) =>
  sentences.map((sentence, index) => ({
    type: 'challenge',
    data: sentence,
    batchStart: index,
    batchEnd: index,
  }));

/** Speak a Spanish word/phrase */
const speakSpanish = (text, rate = 0.85) => {
  if (!text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'es-ES';
  u.rate = rate;
  window.speechSynthesis.speak(u);
};

const KbdHint = ({ show, children }) => {
  if (!show) return null;
  return <kbd className="kbd-hint">{children}</kbd>;
};

const LessonProgress = ({ current, total, label = 'Sentence' }) => {
  const safeTotal = Math.max(total || 0, 1);
  const safeCurrent = Math.min(Math.max(current || 0, 0), safeTotal);
  const percentage = Math.round((safeCurrent / safeTotal) * 100);
  const pipCount = Math.min(safeTotal, 24);
  const pips = Array.from({ length: pipCount }, (_, index) => {
    const threshold = Math.ceil(((index + 1) / pipCount) * safeTotal);
    return {
      id: index,
      isFilled: safeCurrent >= threshold,
    };
  });

  return (
    <div
      className="lesson-progress"
      style={{ '--lesson-progress': `${percentage}%` }}
      aria-label={`${label} ${safeCurrent} of ${safeTotal}`}
    >
      <div className="lesson-progress-copy">
        <span className="lesson-progress-step">{label}</span>
        <span className="lesson-progress-count">{safeCurrent} / {safeTotal}</span>
      </div>
      <div className="lesson-progress-track" aria-hidden="true">
        <div className="lesson-progress-fill" />
        <div className="lesson-progress-marker" />
        <div className="lesson-progress-pips">
          {pips.map((pip) => (
            <span
              key={pip.id}
              className={`lesson-progress-pip ${pip.isFilled ? 'is-filled' : ''}`}
            />
          ))}
        </div>
      </div>
      <span className="lesson-progress-percent">{percentage}%</span>
    </div>
  );
};

const LessonPlayer = ({
  module,
  modules,
  moduleIndex,
  practiceMode,
  settings,
  onBack,
  onNextModule,
  saveModuleProgress,
  completeModule,
  getSavedIndex,
}) => {
  const isPureTestingMode = practiceMode === 'testing';
  const challengeInterval = settings?.challengeInterval ?? 5;
  const swipeEnabled = settings?.swipeToNext ?? true;

  // Build merged items once for initial index calculation
  const initialMergedItems = useMemo(() => {
    if (isPureTestingMode) return buildTestingItems(module.sentences);
    return buildMergedItems(module.sentences, module.id, challengeInterval);
  }, [module, isPureTestingMode, challengeInterval]);

  // Convert sentence-level progress to merged-items index
  const savedSentenceCount = getSavedIndex ? getSavedIndex(module.id, practiceMode) : 0;
  const resumeIndex = useMemo(() => {
    if (savedSentenceCount <= 0) return 0;
    let sentencesSeen = 0;
    for (let i = 0; i < initialMergedItems.length; i++) {
      const item = initialMergedItems[i];
      if (isPureTestingMode ? item.type === 'challenge' : item.type === 'sentence') {
        sentencesSeen++;
      }
      if (sentencesSeen >= savedSentenceCount) {
        return Math.min(i + 1, initialMergedItems.length - 1);
      }
    }
    return 0;
  }, [savedSentenceCount, initialMergedItems, isPureTestingMode]);

  const [currentIndex, setCurrentIndex] = useState(resumeIndex);
  const [spanishRevealed, setSpanishRevealed] = useState(() => !!settings?.autoRevealSpanish);
  const [englishRevealed, setEnglishRevealed] = useState(false);
  const [activeWordIndex, setActiveWordIndex] = useState(null);
  const [challengeAnswerRevealed, setChallengeAnswerRevealed] = useState(false);
  const [extraItems, setExtraItems] = useState([]);
  const [isDesktop, setIsDesktop] = useState(false);
  const isStoryModule = !!module.type && module.type === 'story';
  const isReviewModule = !!module.type && module.type === 'review';
  const [showGrammarIntro, setShowGrammarIntro] = useState(
    () => !!((module.grammarExplanation || module.storyIntro) && practiceMode !== 'testing')
  );
  const [hasAssessed, setHasAssessed] = useState(false);
  const needsTutorial = !hasSeenTutorial();
  const [showTutorial, setShowTutorial] = useState(() => needsTutorial && !showGrammarIntro);
  const [showResumeToast, setShowResumeToast] = useState(() => resumeIndex > 0);

  // ── Swipe gesture state ──
  const swipeRef = useRef(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swipeOffsetY, setSwipeOffsetY] = useState(0);
  const [swipeAnimating, setSwipeAnimating] = useState(false); // 'left' | 'right' | 'down' | false
  const [slideInDir, setSlideInDir] = useState(null); // 'from-left' | 'from-right' | 'from-below' | null
  const swipeStartRef = useRef({ x: 0, y: 0, time: 0, swiping: false, swipeDir: null, scrollLocked: false });
  const SWIPE_THRESHOLD = 60; // px to trigger navigation
  const SWIPE_DOWN_THRESHOLD = 80; // px to trigger mark-for-later
  const SWIPE_VELOCITY_THRESHOLD = 0.3; // px/ms for fast flick

  // Dismiss resume toast after a moment
  useEffect(() => {
    if (showResumeToast) {
      const timer = setTimeout(() => setShowResumeToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showResumeToast]);

  const resetRevealState = useCallback(() => {
    setSpanishRevealed(!!settings?.autoRevealSpanish);
    setEnglishRevealed(false);
    setActiveWordIndex(null);
    setChallengeAnswerRevealed(false);
  }, [settings?.autoRevealSpanish]);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.matchMedia('(min-width: 1024px)').matches);
    };

    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  const mergedItems = useMemo(() => {
    if (isPureTestingMode) {
      return buildTestingItems(module.sentences);
    }
    const base = buildMergedItems(module.sentences, module.id, challengeInterval);
    return [...base, ...extraItems];
  }, [module, extraItems, isPureTestingMode, challengeInterval]);

  const currentItem = mergedItems[currentIndex];
  const currentOriginalIndex = currentItem?.originalIndex;
  const isChallenge = currentItem?.type === 'challenge';
  const sentence = isChallenge ? null : currentItem?.data;
  const isFinished = currentIndex >= mergedItems.length;
  const showSelfAssessment = isFinished && !hasAssessed;
  const hasNextModule = moduleIndex < modules.length - 1;
  const vocabulary = module.vocabulary || {};
  const vocabTable = isFinished ? buildVocabTable(module.sentences, vocabulary) : [];

  const totalSentences = module.sentences.length;
  const progressItemsSoFar = isFinished
    ? totalSentences
    : mergedItems.slice(0, currentIndex + 1).filter((item) => {
      if (isPureTestingMode) return item.type === 'challenge';
      return item.type === 'sentence';
    }).length;

  const speechRate = settings?.speechRate ?? 0.85;
  const autoPlay = settings?.autoPlayAudio ?? true;

  useEffect(() => {
    if (autoPlay && !showGrammarIntro && !isChallenge && sentence?.spanish) {
      speakSpanish(sentence.spanish, speechRate);
    }
  }, [autoPlay, isChallenge, sentence, showGrammarIntro, speechRate]);

  const playAudio = useCallback(() => {
    if (isChallenge) {
      if (currentItem?.data?.spanish) speakSpanish(currentItem.data.spanish, speechRate);
      return;
    }
    if (sentence?.spanish) speakSpanish(sentence.spanish, speechRate);
  }, [currentItem, isChallenge, sentence, speechRate]);

  const handleNext = useCallback((swipeDir) => {
    resetRevealState();
    const newIndex = currentIndex + 1;
    if (swipeDir) {
      setSwipeAnimating('left');
      setTimeout(() => {
        setCurrentIndex(newIndex);
        setSwipeAnimating(false);
        setSwipeOffset(0);
        setSlideInDir('from-right');
        setTimeout(() => setSlideInDir(null), 350);
      }, 200);
    } else {
      setCurrentIndex(newIndex);
    }

    // Save progress
    if (saveModuleProgress) {
      // Calculate the sentence-level progress for the new index
      const sentenceProgress = mergedItems.slice(0, newIndex).filter((item) => {
        if (isPureTestingMode) return item.type === 'challenge';
        return item.type === 'sentence';
      }).length;
      saveModuleProgress(module.id, sentenceProgress, practiceMode, totalSentences);
    }
  }, [currentIndex, isPureTestingMode, mergedItems, module.id, practiceMode, resetRevealState, saveModuleProgress, totalSentences]);

  const handlePrev = useCallback((swipeDir) => {
    if (currentIndex === 0) return;
    resetRevealState();
    if (swipeDir) {
      setSwipeAnimating('right');
      setTimeout(() => {
        setCurrentIndex((p) => Math.max(0, p - 1));
        setSwipeAnimating(false);
        setSwipeOffset(0);
        setSlideInDir('from-left');
        setTimeout(() => setSlideInDir(null), 350);
      }, 200);
    } else {
      setCurrentIndex((p) => Math.max(0, p - 1));
    }
  }, [currentIndex, resetRevealState]);

  const handleMarkForLater = useCallback(() => {
    if (!sentence) return;
    setExtraItems((prev) => [
      ...prev,
      { type: 'sentence', data: sentence, originalIndex: currentOriginalIndex, isRepeat: true },
    ]);
  }, [currentOriginalIndex, sentence]);

  const handleDismissIntro = useCallback(() => {
    setShowGrammarIntro(false);
    if (needsTutorial && !hasSeenTutorial()) {
      setShowTutorial(true);
    }
  }, [needsTutorial]);

  const handleSelfAssessment = useCallback((confidence) => {
    if (completeModule) {
      completeModule(module.id, confidence, totalSentences);
    }
    setHasAssessed(true);
  }, [completeModule, module.id, totalSentences]);

  useEffect(() => {
    const handleGlobalClick = () => setActiveWordIndex(null);
    if (activeWordIndex !== null) {
      window.addEventListener('click', handleGlobalClick);
    }
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [activeWordIndex]);

  // ── Swipe touch handlers ──
  const canSwipe = swipeEnabled && !isDesktop && !showGrammarIntro && !showTutorial && !isFinished;

  const onTouchStart = useCallback((e) => {
    if (!canSwipe) return;
    const touch = e.touches[0];
    swipeStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
      swiping: false,
      swipeDir: null, // 'horizontal' | 'down' | null
      scrollLocked: false,
    };
    setSwipeOffset(0);
    setSwipeOffsetY(0);
  }, [canSwipe]);

  const onTouchMove = useCallback((e) => {
    if (!canSwipe) return;
    const s = swipeStartRef.current;
    const touch = e.touches[0];
    const dx = touch.clientX - s.x;
    const dy = touch.clientY - s.y;

    // Determine direction lock on first significant movement
    if (!s.scrollLocked && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      s.scrollLocked = true;
      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal swipe
        s.swiping = true;
        s.swipeDir = 'horizontal';
      } else if (dy > 0 && !isChallenge) {
        // Swipe down (only on sentence cards, not challenges)
        s.swiping = true;
        s.swipeDir = 'down';
      } else {
        // Vertical scroll up – bail out
        s.swiping = false;
        return;
      }
    }

    if (!s.swiping) return;
    e.preventDefault();

    if (s.swipeDir === 'horizontal') {
      let offset = dx;
      if ((currentIndex === 0 && dx > 0) || (currentIndex >= mergedItems.length - 1 && dx < 0)) {
        offset = dx * 0.25;
      }
      setSwipeOffset(offset);
    } else if (s.swipeDir === 'down') {
      // Only allow downward — clamp to >= 0
      setSwipeOffsetY(Math.max(0, dy));
    }
  }, [canSwipe, currentIndex, mergedItems.length, isChallenge]);

  const onTouchEnd = useCallback(() => {
    if (!canSwipe) return;
    const s = swipeStartRef.current;
    if (!s.swiping) {
      setSwipeOffset(0);
      setSwipeOffsetY(0);
      return;
    }

    const elapsed = Date.now() - s.time;

    if (s.swipeDir === 'down') {
      // Swipe down → mark for later
      if (swipeOffsetY > SWIPE_DOWN_THRESHOLD && sentence) {
        handleMarkForLater();
        setSwipeAnimating('down');
        setTimeout(() => {
          handleNext('swipe-silent');
          setSwipeAnimating(false);
          setSwipeOffsetY(0);
          setSlideInDir('from-below');
          setTimeout(() => setSlideInDir(null), 350);
        }, 250);
      } else {
        setSwipeOffsetY(0);
      }
      s.swiping = false;
      return;
    }

    // Horizontal swipe
    const velocity = Math.abs(swipeOffset) / elapsed;
    const isFlick = velocity > SWIPE_VELOCITY_THRESHOLD;

    if (swipeOffset < -SWIPE_THRESHOLD || (swipeOffset < -20 && isFlick)) {
      // Swipe left → next
      handleNext('swipe');
    } else if (swipeOffset > SWIPE_THRESHOLD || (swipeOffset > 20 && isFlick)) {
      // Swipe right → prev
      if (currentIndex > 0) {
        handlePrev('swipe');
      } else {
        setSwipeOffset(0);
      }
    } else {
      setSwipeOffset(0);
    }

    s.swiping = false;
  }, [canSwipe, swipeOffset, swipeOffsetY, sentence, handleNext, handlePrev, handleMarkForLater, currentIndex]);

  const swipeStyle = useMemo(() => {
    if (swipeAnimating === 'left') {
      return {
        transform: 'translateX(-120%) rotate(-6deg)',
        opacity: 0,
        transition: 'transform 200ms ease-in, opacity 150ms ease-in',
      };
    }
    if (swipeAnimating === 'right') {
      return {
        transform: 'translateX(120%) rotate(6deg)',
        opacity: 0,
        transition: 'transform 200ms ease-in, opacity 150ms ease-in',
      };
    }
    if (swipeAnimating === 'down') {
      return {
        transform: 'translateY(120%) scale(0.85)',
        opacity: 0,
        transition: 'transform 250ms ease-in, opacity 200ms ease-in',
      };
    }
    if (slideInDir === 'from-right') {
      return {
        animation: 'swipe-slide-in-right 350ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
      };
    }
    if (slideInDir === 'from-left') {
      return {
        animation: 'swipe-slide-in-left 350ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
      };
    }
    if (slideInDir === 'from-below') {
      return {
        animation: 'swipe-slide-in-below 350ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
      };
    }
    // Vertical swipe-down drag
    if (swipeOffsetY > 0) {
      const scale = 1 - Math.min(swipeOffsetY / 600, 0.1);
      const opacity = 1 - Math.min(swipeOffsetY / 300, 0.5);
      return {
        transform: `translateY(${swipeOffsetY}px) scale(${scale})`,
        opacity,
        transition: 'none',
        willChange: 'transform, opacity',
      };
    }
    // Horizontal drag
    if (swipeOffset === 0) {
      return {
        transform: 'translateX(0) rotate(0)',
        opacity: 1,
        transition: 'transform 350ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease',
      };
    }
    const rotation = (swipeOffset / 300) * 4;
    const opacity = 1 - Math.min(Math.abs(swipeOffset) / 400, 0.4);
    return {
      transform: `translateX(${swipeOffset}px) rotate(${rotation}deg)`,
      opacity,
      transition: 'none',
      willChange: 'transform, opacity',
    };
  }, [swipeOffset, swipeOffsetY, swipeAnimating, slideInDir]);

  const swipeTouchProps = canSwipe ? {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    ref: swipeRef,
  } : {};

  useEffect(() => {
    const handleKeyDown = (event) => {
      const targetTag = event.target?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA') return;

      const key = event.key.toLowerCase();

      if (key === 'escape') {
        if (showTutorial) { setShowTutorial(false); markTutorialSeen(); return; }
        onBack();
        return;
      }

      if (showTutorial) return;

      if (key === '?') {
        setShowTutorial(true);
        return;
      }

      if (showGrammarIntro) {
        if (key === 'enter' || key === ' ' || key === 'arrowright') {
          event.preventDefault();
          handleDismissIntro();
        }
        return;
      }

      if (isFinished) {
        if (showSelfAssessment) {
          if (key === '1') handleSelfAssessment('confident');
          if (key === '2') handleSelfAssessment('somewhat');
          if (key === '3') handleSelfAssessment('needsRefresh');
          return;
        }
        if (key === 'enter' && hasNextModule) onNextModule();
        if (key === 'b') onBack();
        return;
      }

      if (isChallenge) {
        if (key === ' ' || key === 's') {
          event.preventDefault();
          if (!challengeAnswerRevealed) {
            setChallengeAnswerRevealed(true);
          }
          playAudio();
        }
        if (key === 'enter' || key === 'arrowright') handleNext();
        if (key === 'arrowleft') handlePrev();
        return;
      }

      if (key === ' ') {
        event.preventDefault();
        playAudio();
      }
      if (key === 's') setSpanishRevealed(true);
      if (key === 'e' || key === 't') setEnglishRevealed(true);
      if (key === 'm' || key === 'l') handleMarkForLater();
      if (key === 'enter' || key === 'arrowright') handleNext();
      if (key === 'arrowleft') handlePrev();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    challengeAnswerRevealed,
    handleMarkForLater,
    handleDismissIntro,
    handleNext,
    handlePrev,
    handleSelfAssessment,
    hasNextModule,
    isChallenge,
    isFinished,
    onBack,
    onNextModule,
    playAudio,
    showGrammarIntro,
    showSelfAssessment,
    showTutorial,
  ]);

  // Clamp tooltip so it doesn't overflow viewport edges
  const clampTooltip = useCallback((el) => {
    if (!el) return;
    // Reset any previous adjustment
    el.style.left = '50%';
    el.style.transform = 'translateX(-50%)';
    el.style.right = 'auto';

    const rect = el.getBoundingClientRect();
    const margin = 8;

    if (rect.left < margin) {
      // Overflowing left
      const shift = margin - rect.left;
      el.style.left = `calc(50% + ${shift}px)`;
    } else if (rect.right > window.innerWidth - margin) {
      // Overflowing right
      const shift = rect.right - (window.innerWidth - margin);
      el.style.left = `calc(50% - ${shift}px)`;
    }
  }, []);

  const getMeaning = (word) => {
    const cw = cleanWord(word);
    const meanings = sentence?.wordMeanings || {};
    return meanings[cw] ?? meanings[cw.toLowerCase()] ?? meanings[cw.replace(/s$/, '')] ?? null;
  };

  const getVocabExtra = (word) => {
    const cw = cleanWord(word).toLowerCase();
    return vocabulary[cw] || null;
  };

  if (showGrammarIntro) {
    const introText = module.storyIntro || module.grammarExplanation;
    return (
      <div className="lesson-player animate-fade-in">
        <div className="lesson-header">
          <button className="btn-secondary btn-sm" onClick={onBack}>
            ← Back <KbdHint show={isDesktop}>Esc</KbdHint>
          </button>
          <LessonProgress current={0} total={totalSentences} label="Ready" />
        </div>

        <div className={`lesson-content glass-panel grammar-intro-panel ${isStoryModule ? 'story-intro-panel' : ''} ${isReviewModule ? 'review-intro-panel' : ''}`}>
          <div className={`grammar-intro-badge ${isStoryModule ? 'story-intro-badge' : ''} ${isReviewModule ? 'review-intro-badge' : ''}`}>
            <span className="grammar-intro-icon">{isReviewModule ? '🔄' : isStoryModule ? '📖' : '📖'}</span>
            <span>{isReviewModule ? 'Review' : isStoryModule ? 'Story Time' : 'Grammar'}</span>
          </div>
          <h2 className="grammar-intro-title">{module.title}</h2>
          <div className="grammar-intro-body">
            {introText.split('\n').map((line, i) => {
              if (line.trim() === '') return <br key={i} />;
              if (line.startsWith('•')) {
                return <p key={i} className="grammar-bullet">{line}</p>;
              }
              return <p key={i}>{line}</p>;
            })}
          </div>
        </div>

        <div className="lesson-nav-bar">
          <div />
          <button
            className="btn-primary btn-nav-next pulse-primary"
            onClick={handleDismissIntro}
          >
            {isReviewModule ? 'Begin Review →' : isStoryModule ? 'Begin Story →' : 'Begin Lesson →'} <KbdHint show={isDesktop}>Enter</KbdHint>
          </button>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="lesson-finished animate-fade-in glass-panel">
        {/* Resume toast (shouldn't show here but just in case) */}

        <div className="finished-icon">🎉</div>
        <h2 className="finished-title">Module Completed!</h2>
        <p className="finished-subtitle">
          {isPureTestingMode
            ? <>You&apos;ve completed all translation prompts in <strong>{module.title}</strong>.</>
            : <>You&apos;ve successfully finished all sentences in <strong>{module.title}</strong>.</>}
        </p>

        {/* Self-Assessment Prompt */}
        {showSelfAssessment && (
          <div className="self-assessment animate-fade-in">
            <h3 className="assessment-title">How did that feel?</h3>
            <p className="assessment-subtitle">Be honest — this helps us suggest what to review later.</p>
            <div className="assessment-options">
              <button
                className="assessment-btn assessment-confident"
                onClick={() => handleSelfAssessment('confident')}
              >
                <span className="assessment-emoji">😎</span>
                <span className="assessment-label">Nailed it</span>
                <KbdHint show={isDesktop}>1</KbdHint>
              </button>
              <button
                className="assessment-btn assessment-somewhat"
                onClick={() => handleSelfAssessment('somewhat')}
              >
                <span className="assessment-emoji">🤔</span>
                <span className="assessment-label">Getting there</span>
                <KbdHint show={isDesktop}>2</KbdHint>
              </button>
              <button
                className="assessment-btn assessment-needs-refresh"
                onClick={() => handleSelfAssessment('needsRefresh')}
              >
                <span className="assessment-emoji">😬</span>
                <span className="assessment-label">Need more practice</span>
                <KbdHint show={isDesktop}>3</KbdHint>
              </button>
            </div>
          </div>
        )}

        {!isPureTestingMode && !showSelfAssessment && (
          <div className="vocab-section">
            <h3 className="vocab-heading">Words You&apos;ve Learned</h3>
            <div className="vocab-table-wrapper">
              <table className="vocab-table">
                <thead>
                  <tr>
                    <th>Spanish</th>
                    <th>Meaning</th>
                    <th>Memory Aid</th>
                  </tr>
                </thead>
                <tbody>
                  {vocabTable.map(({ word, meaning, mnemonic, explanation }) => (
                    <tr key={word}>
                      <td
                        className="vocab-word"
                        onClick={() => speakSpanish(word, speechRate)}
                        title={`Play "${word}"`}
                      >
                        {word}
                      </td>
                      <td className="vocab-meaning">{meaning}</td>
                      <td className="vocab-mnemonic">
                        {mnemonic && <span className="mnemonic-text">💡 {mnemonic}</span>}
                        {explanation && <span className="explanation-text">{explanation}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!showSelfAssessment && (
          <div className="finished-actions">
            <button className="btn-secondary" onClick={onBack}>
              ← All Modules <KbdHint show={isDesktop}>B</KbdHint>
            </button>
            {hasNextModule && (
              <button className="btn-primary" onClick={onNextModule}>
                Next Module → <KbdHint show={isDesktop}>Enter</KbdHint>
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  if (isChallenge) {
    const challengeSentence = currentItem.data;
    return (
      <div className="lesson-player animate-fade-in">
        {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} />}

        {showResumeToast && (
          <div className="resume-toast animate-fade-in">
            ▶ Resuming from where you left off
          </div>
        )}

        <div className="lesson-header">
          <button className="btn-secondary btn-sm" onClick={onBack}>
            ← Back <KbdHint show={isDesktop}>Esc</KbdHint>
          </button>
          <button className="btn-help" onClick={() => setShowTutorial(true)} title="How to use">
            ?
          </button>
          <LessonProgress current={progressItemsSoFar} total={totalSentences} label="Checkpoint" />
        </div>

        <div className="lesson-content glass-panel challenge-panel" style={swipeStyle} {...swipeTouchProps}>
          <div className={`challenge-badge ${isPureTestingMode ? 'pure-testing' : ''}`}>
            <span className="challenge-icon">🗣️</span>
            <span>{isPureTestingMode ? 'Pure Testing Mode' : 'Translation Challenge'}</span>
          </div>

          <div className="challenge-prompt">
            <p className="challenge-instruction">Translate this sentence into Spanish:</p>
            <p className="challenge-english">{challengeSentence.english}</p>
          </div>

          <div className="challenge-answer-area">
            {!challengeAnswerRevealed ? (
              <button
                className="btn-primary btn-reveal-answer pulse-primary"
                onClick={() => {
                  setChallengeAnswerRevealed(true);
                  speakSpanish(challengeSentence.spanish, speechRate);
                }}
              >
                Reveal Answer <KbdHint show={isDesktop}>Space</KbdHint>
              </button>
            ) : (
              <div className="challenge-answer animate-fade-in">
                <p className="challenge-spanish">{challengeSentence.spanish}</p>
                <button
                  className="btn-play-answer"
                  onClick={() => speakSpanish(challengeSentence.spanish, speechRate)}
                  title="Listen to the answer"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span>Listen <KbdHint show={isDesktop}>Space</KbdHint></span>
                </button>
              </div>
            )}
          </div>

          {canSwipe && (
            <div className="swipe-hint" aria-hidden="true">← swipe →</div>
          )}
        </div>

        <div className={`lesson-nav-bar ${canSwipe ? 'swipe-mode' : ''}`}>
          <button
            className="btn-secondary btn-nav-secondary"
            onClick={handlePrev}
            disabled={currentIndex === 0}
          >
            ← Previous <KbdHint show={isDesktop}>←</KbdHint>
          </button>
          <button className="btn-primary btn-nav-next" onClick={handleNext}>
            {isPureTestingMode ? 'Next Prompt →' : 'Continue →'} <KbdHint show={isDesktop}>Enter</KbdHint>
          </button>
        </div>
      </div>
    );
  }

  const words = sentence.spanish.split(' ');

  return (
    <div className="lesson-player animate-fade-in">
      {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} />}

      {showResumeToast && (
        <div className="resume-toast animate-fade-in">
          ▶ Resuming from where you left off
        </div>
      )}

      <div className="lesson-header">
        <button className="btn-secondary btn-sm" onClick={onBack}>
          ← Back <KbdHint show={isDesktop}>Esc</KbdHint>
        </button>
        <button className="btn-help" onClick={() => setShowTutorial(true)} title="How to use">
          ?
        </button>
        <LessonProgress current={progressItemsSoFar} total={totalSentences} label="Sentence" />
      </div>

      <div className="lesson-content glass-panel" style={swipeStyle} {...swipeTouchProps}>
        {currentItem.isRepeat && (
          <div className="review-badge animate-fade-in">
            <span>🔄</span>
            <span>Reviewing</span>
          </div>
        )}

        <div className="audio-section">
          <button className="btn-play pulse-primary" onClick={playAudio} title="Listen to Spanish">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            <KbdHint show={isDesktop}>Space</KbdHint>
          </button>
        </div>

        <div className="spanish-area">
          {!spanishRevealed ? (
            <button className="btn-reveal" onClick={() => setSpanishRevealed(true)}>
              Reveal Spanish text <KbdHint show={isDesktop}>S</KbdHint>
            </button>
          ) : (
            <div className="spanish-sentence animate-fade-in">
              {words.map((word, idx) => {
                const meaning = getMeaning(word);
                const isActive = activeWordIndex === idx;
                return (
                  <div key={idx} className="word-container">
                    <span
                      className={`spanish-word ${meaning ? 'has-meaning' : ''} ${isActive ? 'active' : ''}`}
                      onClick={(e) => {
                        if (meaning) {
                          e.stopPropagation();
                          setActiveWordIndex(isActive ? null : idx);
                          speakSpanish(cleanWord(word), speechRate);
                        }
                      }}
                    >
                      {word}
                    </span>
                    {isActive && meaning && (() => {
                      const vocabExtra = getVocabExtra(word);
                      return (
                        <div
                          className={`word-tooltip animate-fade-in ${vocabExtra ? 'has-mnemonic' : ''}`}
                          ref={clampTooltip}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="tooltip-meaning">{meaning}</span>
                          {vocabExtra?.mnemonic && (
                            <span className="tooltip-mnemonic">💡 {vocabExtra.mnemonic}</span>
                          )}
                          {vocabExtra?.explanation && (
                            <span className="tooltip-explanation">{vocabExtra.explanation}</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="translation-area">
          {!englishRevealed ? (
            <button className="btn-text-reveal" onClick={() => setEnglishRevealed(true)}>
              Reveal Full Translation <KbdHint show={isDesktop}>E</KbdHint>
            </button>
          ) : (
            <div className="english-translation animate-fade-in">{sentence.english}</div>
          )}
        </div>

        {canSwipe && (
          <div className="swipe-hint" aria-hidden="true">← swipe →</div>
        )}

        {canSwipe && swipeOffsetY > SWIPE_DOWN_THRESHOLD && (
          <div className="swipe-bookmark-indicator">🔖 Saved for later</div>
        )}
      </div>

      <div className={`lesson-nav-bar ${canSwipe ? 'swipe-mode' : ''}`}>
        <button
          className="btn-secondary btn-nav-secondary"
          onClick={handlePrev}
          disabled={currentIndex === 0}
        >
          ← Previous <KbdHint show={isDesktop}>←</KbdHint>
        </button>
        <button
          className="btn-mark-later btn-nav-mark"
          onClick={handleMarkForLater}
          title="See this sentence again at the end"
        >
          🔖 Later <KbdHint show={isDesktop}>M</KbdHint>
        </button>
        <button className="btn-primary btn-nav-next" onClick={handleNext}>
          Next → <KbdHint show={isDesktop}>Enter</KbdHint>
        </button>
      </div>
    </div>
  );
};

export default LessonPlayer;
