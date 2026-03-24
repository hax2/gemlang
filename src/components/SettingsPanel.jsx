import React, { useState } from 'react';
import { DEFAULT_SETTINGS } from '../hooks/useSettings';
import './SettingsPanel.css';

const CHALLENGE_OPTIONS = [
  { value: 3, label: 'Every 3' },
  { value: 5, label: 'Every 5' },
  { value: 8, label: 'Every 8' },
  { value: 10, label: 'Every 10' },
  { value: 0, label: 'Off' },
];

const SPEECH_RATE_OPTIONS = [
  { value: 0.7, label: 'Slow' },
  { value: 0.85, label: 'Normal' },
  { value: 1.0, label: 'Fast' },
];

const SettingsPanel = ({ settings, onUpdate, onReset, onResetProgress, onBack }) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  return (
    <div className="settings-panel animate-fade-in">
      <div className="settings-header">
        <button className="btn-secondary btn-sm" onClick={onBack}>
          ← Back
        </button>
        <h1 className="settings-title">Settings</h1>
        <button className="btn-reset" onClick={onReset}>
          Reset
        </button>
      </div>

      <div className="settings-list">
        {/* Challenge Frequency */}
        <div className="setting-card glass-panel">
          <div className="setting-info">
            <div className="setting-icon">🧪</div>
            <div>
              <h3 className="setting-name">Challenge Frequency</h3>
              <p className="setting-desc">
                How many sentences between translation challenges in guided mode.
              </p>
            </div>
          </div>
          <div className="setting-options">
            {CHALLENGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`setting-option-btn ${
                  settings.challengeInterval === opt.value ? 'active' : ''
                }`}
                onClick={() => onUpdate('challengeInterval', opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Speech Rate */}
        <div className="setting-card glass-panel">
          <div className="setting-info">
            <div className="setting-icon">🗣️</div>
            <div>
              <h3 className="setting-name">Speech Rate</h3>
              <p className="setting-desc">
                How fast the Spanish audio is spoken.
              </p>
            </div>
          </div>
          <div className="setting-options">
            {SPEECH_RATE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`setting-option-btn ${
                  settings.speechRate === opt.value ? 'active' : ''
                }`}
                onClick={() => onUpdate('speechRate', opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Auto-Play Audio */}
        <div className="setting-card glass-panel">
          <div className="setting-info">
            <div className="setting-icon">🔊</div>
            <div>
              <h3 className="setting-name">Auto-Play Audio</h3>
              <p className="setting-desc">
                Automatically play the Spanish audio when a new sentence appears.
              </p>
            </div>
          </div>
          <div className="setting-options">
            <button
              className={`setting-option-btn ${settings.autoPlayAudio ? 'active' : ''}`}
              onClick={() => onUpdate('autoPlayAudio', true)}
            >
              On
            </button>
            <button
              className={`setting-option-btn ${!settings.autoPlayAudio ? 'active' : ''}`}
              onClick={() => onUpdate('autoPlayAudio', false)}
            >
              Off
            </button>
          </div>
        </div>

        {/* Auto-Reveal Spanish */}
        <div className="setting-card glass-panel">
          <div className="setting-info">
            <div className="setting-icon">👁️</div>
            <div>
              <h3 className="setting-name">Auto-Reveal Spanish</h3>
              <p className="setting-desc">
                Show the Spanish text immediately instead of requiring a reveal step.
              </p>
            </div>
          </div>
          <div className="setting-options">
            <button
              className={`setting-option-btn ${settings.autoRevealSpanish ? 'active' : ''}`}
              onClick={() => onUpdate('autoRevealSpanish', true)}
            >
              On
            </button>
            <button
              className={`setting-option-btn ${!settings.autoRevealSpanish ? 'active' : ''}`}
              onClick={() => onUpdate('autoRevealSpanish', false)}
            >
              Off
            </button>
          </div>
        </div>

        {/* Reset Progress */}
        {onResetProgress && (
          <div className="setting-card glass-panel reset-progress-card">
            <div className="setting-info">
              <div className="setting-icon">🗑️</div>
              <div>
                <h3 className="setting-name">Reset All Progress</h3>
                <p className="setting-desc">
                  Clear all module progress, completion data, and resume positions. This cannot be undone.
                </p>
              </div>
            </div>
            {!showResetConfirm ? (
              <div className="setting-options">
                <button
                  className="setting-option-btn reset-progress-btn"
                  onClick={() => setShowResetConfirm(true)}
                >
                  Reset Progress
                </button>
              </div>
            ) : (
              <div className="reset-confirm">
                <p className="reset-confirm-text">Are you sure? This will erase all your progress.</p>
                <div className="reset-confirm-actions">
                  <button
                    className="setting-option-btn reset-confirm-yes"
                    onClick={() => {
                      onResetProgress();
                      setShowResetConfirm(false);
                    }}
                  >
                    Yes, Reset Everything
                  </button>
                  <button
                    className="setting-option-btn"
                    onClick={() => setShowResetConfirm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPanel;
