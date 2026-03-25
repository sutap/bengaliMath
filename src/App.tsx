import { useState, useEffect } from 'react';
import ClassSelection from './components/ClassSelection';
import Sidebar from './components/Sidebar';
import Syllabus from './components/Syllabus';
import Practice from './components/Practice';
import DoubtSolver from './components/DoubtSolver';
import Progress from './components/Progress';
import History from './components/History';
import { getSelectedClass, setSelectedClass, getTheme, setTheme } from './utils/storage';
import { loadCurriculum } from './services/db';
import type { NavSection } from './types';

export default function App() {
  const [selectedClass, setSelectedClassState] = useState<number | null>(getSelectedClass);
  const [activeSection, setActiveSection] = useState<NavSection>('syllabus');
  const [darkMode, setDarkMode] = useState(getTheme() === 'dark');
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    loadCurriculum()
      .then(() => setDbReady(true))
      .catch((err: Error) => setDbError(err.message));
  }, []);

  function handleClassSelect(classId: number) {
    setSelectedClass(classId);
    setSelectedClassState(classId);
  }

  function handleChangeClass() {
    setSelectedClassState(null);
  }

  function handleToggleDarkMode() {
    const newMode = !darkMode;
    setDarkMode(newMode);
    setTheme(newMode ? 'dark' : 'light');
  }

  if (dbError) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: "'Hind Siliguri', sans-serif", padding: '2rem', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
          <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>ডেটাবেস সংযোগ ব্যর্থ হয়েছে</p>
          <p style={{ fontSize: '0.85rem', color: '#666' }}>{dbError}</p>
        </div>
      </div>
    );
  }

  if (!dbReady) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: "'Hind Siliguri', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📚</div>
          <p>পাঠ্যক্রম লোড হচ্ছে…</p>
        </div>
      </div>
    );
  }

  if (!selectedClass) {
    return <ClassSelection onSelect={handleClassSelect} darkMode={darkMode} />;
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'syllabus': return <Syllabus classId={selectedClass} darkMode={darkMode} />;
      case 'practice': return <Practice classId={selectedClass} darkMode={darkMode} />;
      case 'doubt': return <DoubtSolver classId={selectedClass} darkMode={darkMode} />;
      case 'progress': return <Progress classId={selectedClass} darkMode={darkMode} />;
      case 'history': return <History classId={selectedClass} darkMode={darkMode} />;
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif",
    }}>
      <Sidebar
        selectedClass={selectedClass}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onChangeClass={handleChangeClass}
        darkMode={darkMode}
        onToggleDarkMode={handleToggleDarkMode}
      />
      <main style={{ flex: 1, overflowY: 'auto', minHeight: '100vh' }}>
        {renderSection()}
      </main>
    </div>
  );
}
