import React from 'react';
import './ModuleSelector.css';

const ModuleSelector = ({ modules, onSelect, practiceMode, onPracticeModeChange }) => {
  const isPureTesting = practiceMode === 'testing';

  return (
    <div className="module-selector">
      <div className="module-header">
        <h1 className="module-main-title">Select a Lesson</h1>
        <p className="module-subtitle">
          {isPureTesting
            ? 'Choose a module to run pure translation testing (English to Spanish only).'
            : 'Choose a module to start guided listening and translation practice.'}
        </p>
        <div className="practice-mode-panel glass-panel">
          <p className="practice-mode-title">Practice Mode</p>
          <div className="practice-mode-toggle">
            <button
              className={`practice-mode-btn ${practiceMode === 'guided' ? 'active' : ''}`}
              onClick={() => onPracticeModeChange('guided')}
            >
              Guided Learning
            </button>
            <button
              className={`practice-mode-btn ${isPureTesting ? 'active' : ''}`}
              onClick={() => onPracticeModeChange('testing')}
            >
              Pure Testing
            </button>
          </div>
        </div>
      </div>

      <div className="module-grid">
        {modules.map((mod, index) => (
          <div 
            key={mod.id} 
            className="module-card glass-panel"
            onClick={() => onSelect(mod)}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="module-card-content">
              <span className="module-level">{mod.level}</span>
              <h2 className="module-title">{mod.title}</h2>
              <p className="module-description">{mod.description}</p>
              
              <div className="module-meta">
                <span className="sentence-count">
                  {mod.sentences.length} {isPureTesting ? 'Prompts' : 'Sentences'}
                </span>
                <button className="btn-primary btn-sm" onClick={(e) => {
                  e.stopPropagation();
                  onSelect(mod);
                }}>
                  {isPureTesting ? 'Start Testing' : 'Start Learning'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ModuleSelector;
