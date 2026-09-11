import React, { useRef, useState } from 'react';
import { parseProgressBackup } from '../utils/progressStorage';
import { FREE_ACCESS_MODE } from '../config/monetization';
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

const formatBillingDate = (value) => {
  if (!value) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
};

const SettingsPanel = ({
  progress,
  onRestoreProgress,
  settings,
  onUpdate,
  onReset,
  onResetProgress,
  onBack,
  session,
  subscription,
  subscriptionError,
  onManageBilling,
  onUpgrade,
}) => {
  const importRef = useRef(null);
  const [backupMessage, setBackupMessage] = useState('');
  const [backupError, setBackupError] = useState('');
  const [pendingBackup, setPendingBackup] = useState(null);

  const exportProgress = () => {
    const blob = new Blob([JSON.stringify({ app: 'gemlang', version: 1, exportedAt: new Date().toISOString(), progress }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gemlang-progress-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setBackupError('');
    setBackupMessage('Backup downloaded. Keep it somewhere safe.');
  };

  const readBackup = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBackupError('');
    setBackupMessage('');
    setPendingBackup(null);
    try {
      if (file.size > 1024 * 1024) throw new Error('This file is too large. Choose a GemLang progress backup under 1 MB.');
      setPendingBackup(parseProgressBackup(await file.text()));
    } catch (error) {
      setBackupError(error instanceof SyntaxError ? 'This file is not valid JSON. Choose a GemLang progress backup.' : error.message);
    }
  };

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState(null);

  const manageBilling = async () => {
    setBillingLoading(true);
    setBillingError(null);
    try {
      await onManageBilling();
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : 'Unable to open billing.');
    } finally {
      setBillingLoading(false);
    }
  };

  return (
    <div className="settings-panel animate-fade-in">
      <div className="settings-header">
        <button className="btn-secondary btn-sm" onClick={onBack}>
          ← Back
        </button>
        <h1 className="settings-title">Settings</h1>
        <button className="btn-reset" onClick={onReset}>
          Reset settings
        </button>
      </div>

      <div className="settings-list">
        {session && (!FREE_ACCESS_MODE || subscription) && (
          <div className="setting-card glass-panel billing-card">
            <div className="setting-info">
              <div className="setting-icon" aria-hidden="true">✦</div>
              <div>
                <h3 className="setting-name">
                  {subscription ? 'GemLang Pro' : 'GemLang Free'}
                </h3>
                <p className="setting-desc">
                  {subscription?.status === 'cancelled'
                    ? `Your Pro access continues until ${formatBillingDate(subscription.ends_at)}.`
                    : subscription
                      ? `Your plan is ${subscription.status.replaceAll('_', ' ')}${subscription.renews_at ? ` and renews ${formatBillingDate(subscription.renews_at)}` : ''}.`
                      : 'Upgrade to unlock every lesson, story, review, and future module.'}
                </p>
                {(subscriptionError || billingError) && (
                  <p className="billing-error" role="alert">{billingError || subscriptionError}</p>
                )}
              </div>
            </div>
            <div className="setting-options">
              {subscription ? (
                <button
                  className="setting-option-btn billing-manage-btn"
                  onClick={manageBilling}
                  disabled={billingLoading}
                >
                  {billingLoading ? 'Opening…' : 'Manage billing'}
                </button>
              ) : (
                <button className="setting-option-btn billing-upgrade-btn" onClick={onUpgrade}>
                  View Pro plans
                </button>
              )}
            </div>
          </div>
        )}

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
                aria-pressed={settings.challengeInterval === opt.value}
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
                aria-pressed={settings.speechRate === opt.value}
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
              aria-pressed={settings.autoPlayAudio}
              onClick={() => onUpdate('autoPlayAudio', true)}
            >
              On
            </button>
            <button
              className={`setting-option-btn ${!settings.autoPlayAudio ? 'active' : ''}`}
              aria-pressed={!settings.autoPlayAudio}
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
              aria-pressed={settings.autoRevealSpanish}
              onClick={() => onUpdate('autoRevealSpanish', true)}
            >
              On
            </button>
            <button
              className={`setting-option-btn ${!settings.autoRevealSpanish ? 'active' : ''}`}
              aria-pressed={!settings.autoRevealSpanish}
              onClick={() => onUpdate('autoRevealSpanish', false)}
            >
              Off
            </button>
          </div>
        </div>

        {/* Swipe to Navigate */}
        <div className="setting-card glass-panel">
          <div className="setting-info">
            <div className="setting-icon">👆</div>
            <div>
              <h3 className="setting-name">Swipe to Navigate</h3>
              <p className="setting-desc">
                Swipe left/right to go to the next/previous sentence. When off, use buttons instead.
              </p>
            </div>
          </div>
          <div className="setting-options">
            <button
              className={`setting-option-btn ${settings.swipeToNext ? 'active' : ''}`}
              aria-pressed={settings.swipeToNext}
              onClick={() => onUpdate('swipeToNext', true)}
            >
              On
            </button>
            <button
              className={`setting-option-btn ${!settings.swipeToNext ? 'active' : ''}`}
              aria-pressed={!settings.swipeToNext}
              onClick={() => onUpdate('swipeToNext', false)}
            >
              Off
            </button>
          </div>
        </div>

        <section className="setting-card glass-panel" aria-labelledby="backup-title">
          <div className="setting-info">
            <div className="setting-icon" aria-hidden="true">↓</div>
            <div>
              <h3 className="setting-name" id="backup-title">Progress backup</h3>
              <p className="setting-desc">Your progress is saved in this browser, including when signed in. Download a backup to keep it or move it to another device.</p>
            </div>
          </div>
          <div className="setting-options">
            <button className="setting-option-btn" onClick={exportProgress}>Download backup</button>
            <button className="setting-option-btn" onClick={() => importRef.current?.click()}>Restore backup</button>
            <input ref={importRef} type="file" accept=".json,application/json" onChange={readBackup} hidden aria-label="Choose progress backup" />
          </div>
          {pendingBackup && (
            <div className="reset-confirm">
              <p>Restore progress for {Object.keys(pendingBackup.modules).length} modules? Your completed lessons and further progress will be kept.</p>
              <div className="setting-options">
                <button className="setting-option-btn active" onClick={() => {
                  onRestoreProgress(pendingBackup);
                  setPendingBackup(null);
                  setBackupMessage('Progress restored. Your existing progress has been kept.');
                }}>Restore progress</button>
                <button className="setting-option-btn" onClick={() => setPendingBackup(null)}>Cancel</button>
              </div>
            </div>
          )}
          {backupMessage && <p role="status" className="setting-desc">{backupMessage}</p>}
          {backupError && <p role="alert" className="billing-error">{backupError}</p>}
        </section>

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
