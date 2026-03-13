import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './LessonPlayer.css';

/* helpers */
const cleanWord = (w) => w.replace(/[.,¿?¡!]/g, '');

/** Collect every unique word->meaning pair from all sentences in a module */
const buildVocabTable = (sentences) => {
  const map = new Map();
  sentences.forEach((s) => {
    const meanings = s.wordMeanings || {};
    Object.entries(meanings).forEach(([word, meaning]) => {
      const key = word.toLowerCase();
      if (!map.has(key)) map.set(key, { word, meaning });
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
 * A challenge is inserted after every CHALLENGE_INTERVAL sentences.
 * Each challenge picks one sentence from the preceding batch.
 */
const CHALLENGE_INTERVAL = 5;

const buildMergedItems = (sentences, moduleId) => {
  const items = [];
  let sentenceCount = 0;

  for (let i = 0; i < sentences.length; i++) {
    items.push({ type: 'sentence', data: sentences[i], originalIndex: i });
    sentenceCount++;

    if (sentenceCount === CHALLENGE_INTERVAL && i < sentences.length - 1) {
      const batchStart = i - (CHALLENGE_INTERVAL - 1);
      const seed = `${moduleId}-challenge-${items.length}`;
      const pick = seededRandom(seed) % CHALLENGE_INTERVAL;
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
const speakSpanish = (text) => {
  if (!text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'es-ES';
  u.rate = 0.85;
  window.speechSynthesis.speak(u);
};

const KbdHint = ({ show, children }) => {
  if (!show) return null;
  return <kbd className="kbd-hint">{children}</kbd>;
};

const LessonPlayer = ({ module, modules, moduleIndex, practiceMode, onBack, onNextModule }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [spanishRevealed, setSpanishRevealed] = useState(false);
  const [englishRevealed, setEnglishRevealed] = useState(false);
  const [activeWordIndex, setActiveWordIndex] = useState(null);
  const [challengeAnswerRevealed, setChallengeAnswerRevealed] = useState(false);
  const [extraItems, setExtraItems] = useState([]);
  const [isDesktop, setIsDesktop] = useState(false);
  const [showGrammarIntro, setShowGrammarIntro] = useState(
    () => !!(module.grammarExplanation && practiceMode !== 'testing')
  );

  const isPureTestingMode = practiceMode === 'testing';

  const resetRevealState = useCallback(() => {
    setSpanishRevealed(false);
    setEnglishRevealed(false);
    setActiveWordIndex(null);
    setChallengeAnswerRevealed(false);
  }, []);

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
    const base = buildMergedItems(module.sentences, module.id);
    return [...base, ...extraItems];
  }, [module, extraItems, isPureTestingMode]);

  const currentItem = mergedItems[currentIndex];
  const currentOriginalIndex = currentItem?.originalIndex;
  const isChallenge = currentItem?.type === 'challenge';
  const sentence = isChallenge ? null : currentItem?.data;
  const isFinished = currentIndex >= mergedItems.length;
  const hasNextModule = moduleIndex < modules.length - 1;
  const vocabTable = isFinished ? buildVocabTable(module.sentences) : [];

  const totalSentences = module.sentences.length;
  const progressItemsSoFar = isFinished
    ? totalSentences
    : mergedItems.slice(0, currentIndex + 1).filter((item) => {
      if (isPureTestingMode) return item.type === 'challenge';
      return item.type === 'sentence';
    }).length;

  useEffect(() => {
    if (!showGrammarIntro && !isChallenge && sentence?.spanish) speakSpanish(sentence.spanish);
  }, [isChallenge, sentence, showGrammarIntro]);

  const playAudio = useCallback(() => {
    if (isChallenge) {
      if (currentItem?.data?.spanish) speakSpanish(currentItem.data.spanish);
      return;
    }
    if (sentence?.spanish) speakSpanish(sentence.spanish);
  }, [currentItem, isChallenge, sentence]);

  const handleNext = useCallback(() => {
    resetRevealState();
    setCurrentIndex((p) => p + 1);
  }, [resetRevealState]);

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
        onBack();
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
    hasNextModule,
    isChallenge,
    isFinished,
    onBack,
    onNextModule,
    playAudio,
    showGrammarIntro,
  ]);

  const getMeaning = (word) => {
    const cw = cleanWord(word);
    const meanings = sentence?.wordMeanings || {};
    return meanings[cw] ?? meanings[cw.toLowerCase()] ?? meanings[cw.replace(/s$/, '')] ?? null;
  };

  if (showGrammarIntro) {
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

        <div className="lesson-content glass-panel grammar-intro-panel">
          <div className="grammar-intro-badge">
            <span className="grammar-intro-icon">📖</span>
            <span>Grammar</span>
          </div>
          <h2 className="grammar-intro-title">{module.title}</h2>
          <div className="grammar-intro-body">
            {module.grammarExplanation.split('\n').map((line, i) => {
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
            Begin Lesson → <KbdHint show={isDesktop}>Enter</KbdHint>
          </button>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="lesson-finished animate-fade-in glass-panel">
        <div className="finished-icon">🎉</div>
        <h2 className="finished-title">Module Completed!</h2>
        <p className="finished-subtitle">
          {isPureTestingMode
            ? <>You&apos;ve completed all translation prompts in <strong>{module.title}</strong>.</>
            : <>You&apos;ve successfully finished all sentences in <strong>{module.title}</strong>.</>}
        </p>

        {!isPureTestingMode && (
          <div className="vocab-section">
            <h3 className="vocab-heading">Words You&apos;ve Learned</h3>
            <div className="vocab-table-wrapper">
              <table className="vocab-table">
                <thead>
                  <tr>
                    <th>Spanish</th>
                    <th>Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  {vocabTable.map(({ word, meaning }) => (
                    <tr key={word}>
                      <td
                        className="vocab-word"
                        onClick={() => speakSpanish(word)}
                        title={`Play "${word}"`}
                      >
                        {word}
                      </td>
                      <td className="vocab-meaning">{meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
      </div>
    );
  }

  if (isChallenge) {
    const challengeSentence = currentItem.data;
    const progressPercentage = (progressItemsSoFar / totalSentences) * 100;

    return (
      <div className="lesson-player animate-fade-in">
        <div className="lesson-header">
          <button className="btn-secondary btn-sm" onClick={onBack}>
            ← Back <KbdHint show={isDesktop}>Esc</KbdHint>
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
                  speakSpanish(challengeSentence.spanish);
                }}
              >
                Reveal Answer <KbdHint show={isDesktop}>Space</KbdHint>
              </button>
            ) : (
              <div className="challenge-answer animate-fade-in">
                <p className="challenge-spanish">{challengeSentence.spanish}</p>
                <button
                  className="btn-play-answer"
                  onClick={() => speakSpanish(challengeSentence.spanish)}
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
      <div className="lesson-header">
        <button className="btn-secondary btn-sm" onClick={onBack}>
          ← Back <KbdHint show={isDesktop}>Esc</KbdHint>
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
                          speakSpanish(cleanWord(word));
                        }
                      }}
                    >
                      {word}
                    </span>
                    {isActive && meaning && (
                      <div 
                        className="word-tooltip animate-fade-in"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {meaning}
                      </div>
                    )}
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
