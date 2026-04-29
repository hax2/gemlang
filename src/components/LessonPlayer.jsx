import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Tutorial, { hasSeenTutorial, markTutorialSeen } from './Tutorial';
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
      const seed = `${moduleId}-challenge-${items.length}`;
      const pick = seededRandom(seed) % interval;
      const chosenSentence = sentences[batchStart + pick];

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
  const [showGrammarIntro, setShowGrammarIntro] = useState(
    () => !!((module.grammarExplanation || module.storyIntro) && practiceMode !== 'testing')
  );
  const [showSelfAssessment, setShowSelfAssessment] = useState(false);
  const [hasAssessed, setHasAssessed] = useState(false);
  const needsTutorial = !hasSeenTutorial();
  const [showTutorial, setShowTutorial] = useState(() => needsTutorial && !showGrammarIntro);
  const [showResumeToast, setShowResumeToast] = useState(() => resumeIndex > 0);

  // Show tutorial after grammar intro is dismissed (first time only)
  useEffect(() => {
    if (!showGrammarIntro && needsTutorial && !hasSeenTutorial()) {
      setShowTutorial(true);
    }
  }, [showGrammarIntro, needsTutorial]);

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

  // Show self-assessment when finished (if not already assessed)
  useEffect(() => {
    if (isFinished && !hasAssessed) {
      setShowSelfAssessment(true);
    }
  }, [isFinished, hasAssessed]);

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

  const handleNext = useCallback(() => {
    resetRevealState();
    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);

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

  const handlePrev = useCallback(() => {
    resetRevealState();
    setCurrentIndex((p) => Math.max(0, p - 1));
  }, [resetRevealState]);

  const handleMarkForLater = useCallback(() => {
    if (!sentence) return;
    setExtraItems((prev) => [
      ...prev,
      { type: 'sentence', data: sentence, originalIndex: currentOriginalIndex, isRepeat: true },
    ]);
  }, [currentOriginalIndex, sentence]);

  const handleSelfAssessment = useCallback((confidence) => {
    if (completeModule) {
      completeModule(module.id, confidence, totalSentences);
    }
    setShowSelfAssessment(false);
    setHasAssessed(true);
  }, [completeModule, module.id, totalSentences]);

  useEffect(() => {
    const handleGlobalClick = () => setActiveWordIndex(null);
    if (activeWordIndex !== null) {
      window.addEventListener('click', handleGlobalClick);
    }
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [activeWordIndex]);

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
          setShowGrammarIntro(false);
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
          <div className="progress-wrapper">
            <div className="progress-container">
              <div className="progress-bar-fill" style={{ width: '0%' }} />
            </div>
          </div>
          <span className="progress-text">0 / {totalSentences}</span>
        </div>

        <div className={`lesson-content glass-panel grammar-intro-panel ${isStoryModule ? 'story-intro-panel' : ''}`}>
          <div className={`grammar-intro-badge ${isStoryModule ? 'story-intro-badge' : ''}`}>
            <span className="grammar-intro-icon">{isStoryModule ? '📖' : '📖'}</span>
            <span>{isStoryModule ? 'Story Time' : 'Grammar'}</span>
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
            onClick={() => setShowGrammarIntro(false)}
          >
            {isStoryModule ? 'Begin Story →' : 'Begin Lesson →'} <KbdHint show={isDesktop}>Enter</KbdHint>
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
    const progressPercentage = (progressItemsSoFar / totalSentences) * 100;

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
          <div className="progress-wrapper">
            <div className="progress-container">
              <div className="progress-bar-fill" style={{ width: `${progressPercentage}%` }} />
            </div>
          </div>
          <span className="progress-text">
            {progressItemsSoFar} / {totalSentences}
          </span>
        </div>

        <div className="lesson-content glass-panel challenge-panel">
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
        </div>

        <div className="lesson-nav-bar">
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
  const progressPercentage = (progressItemsSoFar / totalSentences) * 100;

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
        <div className="progress-wrapper">
          <div className="progress-container">
            <div className="progress-bar-fill" style={{ width: `${progressPercentage}%` }} />
          </div>
        </div>
        <span className="progress-text">
          {progressItemsSoFar} / {totalSentences}
        </span>
      </div>

      <div className="lesson-content glass-panel">
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
      </div>

      <div className="lesson-nav-bar">
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
