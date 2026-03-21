import { useCallback, useRef, useState } from 'react';
import ModuleSelector from './components/ModuleSelector';
import LessonPlayer from './components/LessonPlayer';
import SettingsPanel from './components/SettingsPanel';
import useSettings from './hooks/useSettings';
import modulesManifest from './data/modules-manifest.json';
import './App.css';

const moduleLoaders = import.meta.glob('./data/modules/*.json');

function App() {
  const [view, setView] = useState('modules'); // 'modules' | 'settings' | 'lesson'
  const [activeModuleIndex, setActiveModuleIndex] = useState(null);
  const [activeModule, setActiveModule] = useState(null);
  const [isModuleLoading, setIsModuleLoading] = useState(false);
  const [practiceMode, setPracticeMode] = useState('guided');
  const loadRequestRef = useRef(0);
  const { settings, updateSetting, resetSettings } = useSettings();

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

  const handleBackToModules = useCallback(() => {
    loadRequestRef.current += 1;
    setActiveModuleIndex(null);
    setActiveModule(null);
    setIsModuleLoading(false);
    setView('modules');
  }, []);

  const handleNextModule = useCallback(() => {
    const nextIdx = activeModuleIndex + 1;
    if (nextIdx < modulesManifest.length) {
      void loadModuleAtIndex(nextIdx);
    } else {
      handleBackToModules();
    }
  }, [activeModuleIndex, handleBackToModules, loadModuleAtIndex]);

  return (
    <div className="app-container animate-fade-in">
      <header className="app-header">
        <div className="app-logo" onClick={handleBackToModules} style={{ cursor: 'pointer' }}>
          GemLang
        </div>
        <button
          className="btn-settings"
          onClick={() => setView(view === 'settings' ? 'modules' : 'settings')}
          title="Settings"
          aria-label="Settings"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </header>

      <main className="main-content">
        {view === 'settings' ? (
          <SettingsPanel
            settings={settings}
            onUpdate={updateSetting}
            onReset={resetSettings}
            onBack={handleBackToModules}
          />
        ) : view === 'modules' ? (
          <ModuleSelector
            modules={modulesManifest}
            onSelect={handleSelectModule}
            practiceMode={practiceMode}
            onPracticeModeChange={setPracticeMode}
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
            onBack={handleBackToModules}
            onNextModule={handleNextModule}
          />
        )}
      </main>
    </div>
  );
}

export default App;
