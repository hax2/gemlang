import { useCallback, useRef, useState, useMemo, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import ModuleSelector from './components/ModuleSelector';
import LessonPlayer from './components/LessonPlayer';
import SettingsPanel from './components/SettingsPanel';
import Onboarding from './components/Onboarding';
import Auth from './components/Auth';
import { supabase } from './supabaseClient';
import useSettings from './hooks/useSettings';
import useProgress from './hooks/useProgress';
import modulesManifest from './data/modules-manifest.json';
import './App.css';

const moduleLoaders = import.meta.glob('./data/modules/*.json');

function App() {
  const [session, setSession] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'modules' | 'settings' | 'lesson'
  const [activeModuleIndex, setActiveModuleIndex] = useState(null);
  const [activeModule, setActiveModule] = useState(null);
  const [isModuleLoading, setIsModuleLoading] = useState(false);
  const [practiceMode, setPracticeMode] = useState(() => {
    try {
      const prog = JSON.parse(localStorage.getItem('gemlang-progress') || '{}');
      return prog.lastPracticeMode || 'guided';
    } catch { return 'guided'; }
  });
  const loadRequestRef = useRef(0);
  const { settings, updateSetting, resetSettings } = useSettings();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsInitializing(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const {
    progress,
    saveModuleProgress,
    completeModule,
    getModuleStatus,
    getModuleProgress,
    getNextSuggestedModule,
    getRefreshModules,
    stats,
    resetProgress,
    setStartingLevel,
  } = useProgress(modulesManifest);

  const loadModuleAtIndex = useCallback(async (index) => {
    const manifestModule = modulesManifest[index];
    if (!manifestModule) return;

    const loader = moduleLoaders[`./data/modules/${manifestModule.file}`];
    if (!loader) {
      throw new Error(`Missing module loader for ${manifestModule.file}`);
    }

    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    setActiveModuleIndex(index);
    setActiveModule(null);
    setIsModuleLoading(true);
    setView('lesson');

    try {
      const loadedModule = await loader();
      if (loadRequestRef.current !== requestId) return;
      setActiveModule(loadedModule.default);
    } finally {
      if (loadRequestRef.current === requestId) {
        setIsModuleLoading(false);
      }
    }
  }, []);

  const handleSelectModule = useCallback((module) => {
    const idx = modulesManifest.findIndex((item) => item.id === module.id);
    if (idx >= 0) {
      void loadModuleAtIndex(idx);
    }
  }, [loadModuleAtIndex]);

  const handleBackToDashboard = useCallback(() => {
    loadRequestRef.current += 1;
    setActiveModuleIndex(null);
    setActiveModule(null);
    setIsModuleLoading(false);
    setView('dashboard');
  }, []);

  const handleBackToModules = useCallback(() => {
    loadRequestRef.current += 1;
    setActiveModuleIndex(null);
    setActiveModule(null);
    setIsModuleLoading(false);
    setView('modules');
  }, []);

  const handleNextModule = useCallback(() => {
    // Use suggested next module instead of just index+1
    const suggested = getNextSuggestedModule();
    if (suggested) {
      const idx = modulesManifest.findIndex((item) => item.id === suggested.id);
      if (idx >= 0) {
        void loadModuleAtIndex(idx);
        return;
      }
    }
    // Fallback: next in order
    const nextIdx = activeModuleIndex + 1;
    if (nextIdx < modulesManifest.length) {
      void loadModuleAtIndex(nextIdx);
    } else {
      handleBackToDashboard();
    }
  }, [activeModuleIndex, getNextSuggestedModule, handleBackToDashboard, loadModuleAtIndex]);

  /** Get the saved merged-items index for a module to support resume */
  const getSavedIndex = useCallback((moduleId, mode) => {
    const mod = progress.modules[moduleId];
    if (!mod || !mod.currentIndex) return 0;
    // If the module was completed, start from the beginning (reviewing)
    if (mod.completedAt) return 0;
    // Return saved sentence-level progress — the LessonPlayer will convert this
    // to a merged-items index by counting sentence items
    return mod.currentIndex || 0;
  }, [progress]);

  /** Convert a sentence-level index to a merged-items index.
   *  This is passed to the LessonPlayer to calculate resume position. */
  const getSavedMergedIndex = useCallback((moduleId, mode) => {
    const sentenceIndex = getSavedIndex(moduleId, mode);
    if (sentenceIndex <= 0) return 0;
    // We can't easily pre-compute the merged index here since we don't have
    // the module data loaded yet. Instead, we just pass the sentence index
    // and let the LessonPlayer handle it.
    return sentenceIndex;
  }, [getSavedIndex]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <div className="app-container animate-fade-in">
      <header className="app-header">
        <div className="app-logo" onClick={handleBackToDashboard} style={{ cursor: 'pointer' }}>
          GemLang
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          {session && (
            <button
              className="btn-settings"
              onClick={handleLogout}
              title="Sign Out"
              aria-label="Sign Out"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          )}
          <button
            className="btn-settings"
            onClick={() => setView(view === 'settings' ? 'dashboard' : 'settings')}
            title="Settings"
            aria-label="Settings"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      <main className="main-content">
        {isInitializing ? (
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
            <p>Loading...</p>
          </div>
        ) : !session ? (
          <Auth />
        ) : !progress.hasChosenLevel ? (
          <Onboarding 
            modules={modulesManifest} 
            onComplete={(levelType, moduleId) => {
              setStartingLevel(levelType, moduleId);
            }} 
          />
        ) : view === 'settings' ? (
          <SettingsPanel
            settings={settings}
            onUpdate={updateSetting}
            onReset={resetSettings}
            onResetProgress={resetProgress}
            onBack={handleBackToDashboard}
          />
        ) : view === 'dashboard' ? (
          <Dashboard
            modules={modulesManifest}
            stats={stats}
            progress={progress}
            getModuleStatus={getModuleStatus}
            getModuleProgress={getModuleProgress}
            getNextSuggestedModule={getNextSuggestedModule}
            getRefreshModules={getRefreshModules}
            onSelectModule={handleSelectModule}
            onBrowseAll={() => setView('modules')}
            practiceMode={practiceMode}
          />
        ) : view === 'modules' ? (
          <ModuleSelector
            modules={modulesManifest}
            onSelect={handleSelectModule}
            practiceMode={practiceMode}
            onPracticeModeChange={setPracticeMode}
            getModuleStatus={getModuleStatus}
            getModuleProgress={getModuleProgress}
            onBack={() => setView('dashboard')}
          />
        ) : isModuleLoading || !activeModule ? (
          <div className="lesson-finished glass-panel">
            <h2 className="finished-title">Loading lesson...</h2>
            <p className="finished-subtitle">
              Preparing {modulesManifest[activeModuleIndex]?.title}.
            </p>
          </div>
        ) : (
          <LessonPlayer
            key={`${activeModule.id}-${practiceMode}`}
            module={activeModule}
            modules={modulesManifest}
            moduleIndex={activeModuleIndex}
            practiceMode={practiceMode}
            settings={settings}
            onBack={handleBackToDashboard}
            onNextModule={handleNextModule}
            saveModuleProgress={saveModuleProgress}
            completeModule={completeModule}
            getSavedIndex={getSavedMergedIndex}
          />
        )}
      </main>
    </div>
  );
}

export default App;
