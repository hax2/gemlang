import React, { useState } from 'react';
import './Onboarding.css';

const Onboarding = ({ modules, onComplete }) => {
  const [selectedLevel, setSelectedLevel] = useState('Beginner');
  const [showModuleList, setShowModuleList] = useState(false);
  const [selectedModule, setSelectedModule] = useState(modules[0]?.id);

  const handleStart = () => {
    if (showModuleList) {
      onComplete('granular', selectedModule);
    } else {
      onComplete(selectedLevel);
    }
  };

  return (
    <div className="onboarding-container animate-fade-in">
      <div className="onboarding-content glass-panel">
        <div className="onboarding-intro">
          <h1 className="onboarding-title">Choose your level</h1>
        </div>

        {!showModuleList ? (
          <div className="onboarding-selection">
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
              <div className="divider"><span>OR</span></div>
              <button
                className="level-btn choose-module-btn"
                onClick={() => setShowModuleList(true)}
              >
                Choose specific module...
              </button>
            </div>
            <button className="btn-primary start-journey-btn" onClick={handleStart}>
              Start Learning
            </button>
          </div>
        ) : (
          <div className="onboarding-selection">
            <button className="btn-back" onClick={() => setShowModuleList(false)}>← Back</button>
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
