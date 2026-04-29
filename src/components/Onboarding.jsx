import React, { useState } from 'react';
import './Onboarding.css';

const Onboarding = ({ modules, onComplete }) => {
  const [mode, setMode] = useState(null); // 'broad' | 'granular'
  const [selectedLevel, setSelectedLevel] = useState('Beginner');
  const [selectedModule, setSelectedModule] = useState(modules[0]?.id);

  const handleStart = () => {
    if (mode === 'broad') {
      onComplete(selectedLevel);
    } else if (mode === 'granular') {
      onComplete('granular', selectedModule);
    }
  };

  return (
    <div className="onboarding-container animate-fade-in">
      <div className="onboarding-content glass-panel">
        <h1 className="onboarding-title">Welcome to GemLang!</h1>
        <p className="onboarding-subtitle">How would you like to start your journey?</p>

        {!mode ? (
          <div className="onboarding-choices">
            <div className="choice-card" onClick={() => setMode('broad')}>
              <h3>Choose Broadly</h3>
              <p>Select a general skill level (Beginner, Intermediate, Advanced).</p>
            </div>
            <div className="choice-card" onClick={() => setMode('granular')}>
              <h3>High Granularity</h3>
              <p>Pick the exact module or chapter you want to start from.</p>
            </div>
          </div>
        ) : (
          <div className="onboarding-selection">
            <button className="btn-back" onClick={() => setMode(null)}>← Back</button>
            
            {mode === 'broad' ? (
              <div className="level-selection">
                <h2>Select your level</h2>
                <div className="level-options">
                  {['Beginner', 'Intermediate', 'Advanced'].map((lvl) => (
                    <button
                      key={lvl}
                      className={`level-btn ${selectedLevel === lvl ? 'active' : ''}`}
                      onClick={() => setSelectedLevel(lvl)}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="module-selection">
                <h2>Select starting point</h2>
                <div className="module-list">
                  {modules.map((m) => (
                    <button
                      key={m.id}
                      className={`module-list-btn ${selectedModule === m.id ? 'active' : ''}`}
                      onClick={() => setSelectedModule(m.id)}
                    >
                      {m.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button className="btn-primary start-journey-btn" onClick={handleStart}>
              Start Learning
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
