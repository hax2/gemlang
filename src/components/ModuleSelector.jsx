import React from 'react';
import './ModuleSelector.css';

const STATUS_BADGES = {
  'completed': { icon: '✓', label: 'Completed', className: 'status-completed' },
  'needs-refresh': { icon: '↻', label: 'Refresh', className: 'status-refresh' },
  'in-progress': { icon: '▶', label: 'In Progress', className: 'status-in-progress' },
};

const ModuleSelector = ({
  modules,
  onSelect,
  practiceMode,
  onPracticeModeChange,
  getModuleStatus,
  getModuleProgress,
  onBack,
}) => {
  const isPureTesting = practiceMode === 'testing';

  const getButtonLabel = (status) => {
    if (isPureTesting) return 'Start Testing';
    switch (status) {
      case 'in-progress': return 'Continue';
      case 'completed': return 'Review';
      case 'needs-refresh': return 'Refresh';
      default: return 'Start Learning';
    }
  };

  return (
    <div className="module-selector">
      <div className="module-header">
        <div className="module-header-top">
          {onBack && (
            <button className="btn-secondary btn-sm" onClick={onBack}>
              ← Dashboard
            </button>
          )}
        </div>
        <h1 className="module-main-title">All Modules</h1>
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
        {modules.map((mod, index) => {
          const status = getModuleStatus ? getModuleStatus(mod.id) : 'not-started';
          const prog = getModuleProgress ? getModuleProgress(mod.id) : null;
          const badge = STATUS_BADGES[status];
          const isStory = mod.type === 'story';
          const isReview = mod.type === 'review';

          return (
            <div 
              key={mod.id} 
              className={`module-card glass-panel ${status !== 'not-started' ? 'has-progress' : ''} ${isStory ? 'story-card' : ''} ${isReview ? 'review-card' : ''}`}
              onClick={() => onSelect(mod)}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="module-card-content">
                <div className="module-card-top-row">
                  <span className="module-level">{mod.level}</span>
                  <div className="module-badges-row">
                    {isStory && (
                      <span className="module-status-badge status-story">
                        📖 Story
                      </span>
                    )}
                    {isReview && (
                      <span className="module-status-badge status-review">
                        🔄 Review
                      </span>
                    )}
                    {badge && (
                      <span className={`module-status-badge ${badge.className}`}>
                        {badge.icon} {badge.label}
                      </span>
                    )}
                  </div>
                </div>
                <h2 className="module-title">{mod.title}</h2>
                <p className="module-description">{mod.description}</p>
                
                {/* Progress bar for modules with progress */}
                {prog && prog.percentage > 0 && (
                  <div className="module-progress-bar-wrapper">
                    <div className="module-progress-bar">
                      <div
                        className={`module-progress-fill ${status === 'completed' ? 'fill-complete' : status === 'needs-refresh' ? 'fill-refresh' : ''}`}
                        style={{ width: `${prog.percentage}%` }}
                      />
                    </div>
                    <span className="module-progress-label">{prog.percentage}%</span>
                  </div>
                )}

                <div className="module-meta">
                  <span className="sentence-count">
                    {mod.sentenceCount} {isPureTesting ? 'Prompts' : 'Sentences'}
                  </span>
                  <button className="btn-primary btn-sm" onClick={(e) => {
                    e.stopPropagation();
                    onSelect(mod);
                  }}>
                    {getButtonLabel(status)}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ModuleSelector;
