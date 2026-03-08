import { useState } from 'react';
import ModuleSelector from './components/ModuleSelector';
import LessonPlayer from './components/LessonPlayer';
import modulesData from './data/modules.json';
import './App.css';

function App() {
  const [activeModuleIndex, setActiveModuleIndex] = useState(null);

  const handleSelectModule = (module) => {
    const idx = modulesData.findIndex(m => m.id === module.id);
    setActiveModuleIndex(idx >= 0 ? idx : 0);
  };

  const handleBackToModules = () => {
    setActiveModuleIndex(null);
  };

  const handleNextModule = () => {
    const nextIdx = activeModuleIndex + 1;
    if (nextIdx < modulesData.length) {
      setActiveModuleIndex(nextIdx);
    } else {
      setActiveModuleIndex(null); // all modules done – go back to selector
    }
  };

  return (
    <div className="app-container animate-fade-in">
      <header className="app-header">
        <div className="app-logo" onClick={handleBackToModules} style={{ cursor: 'pointer' }}>
          GemLang
        </div>
      </header>
      
      <main className="main-content">
        {activeModuleIndex === null ? (
          <ModuleSelector modules={modulesData} onSelect={handleSelectModule} />
        ) : (
          <LessonPlayer
            module={modulesData[activeModuleIndex]}
            modules={modulesData}
            moduleIndex={activeModuleIndex}
            onBack={handleBackToModules}
            onNextModule={handleNextModule}
          />
        )}
      </main>
    </div>
  );
}

export default App;
