import { useCallback, useRef, useState } from 'react';
import ModuleSelector from './components/ModuleSelector';
import LessonPlayer from './components/LessonPlayer';
import modulesManifest from './data/modules-manifest.json';
import './App.css';

const moduleLoaders = import.meta.glob('./data/modules/*.json');

function App() {
  const [activeModuleIndex, setActiveModuleIndex] = useState(null);
  const [activeModule, setActiveModule] = useState(null);
  const [isModuleLoading, setIsModuleLoading] = useState(false);
  const [practiceMode, setPracticeMode] = useState('guided');
  const loadRequestRef = useRef(0);

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
      </header>

      <main className="main-content">
        {activeModuleIndex === null ? (
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
            onBack={handleBackToModules}
            onNextModule={handleNextModule}
          />
        )}
      </main>
    </div>
  );
}

export default App;
