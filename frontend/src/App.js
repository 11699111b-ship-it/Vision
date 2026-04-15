import React, { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AppProvider, useAppContext } from './context/AppContext';
import { MusicProvider, useMusicContext } from './context/MusicContext';
import { usePWA } from './hooks/usePWA';
import WelcomeScreen from './components/WelcomeScreen';
import PlanningMode from './components/PlanningMode';
import TrackingMode from './components/TrackingMode';
import HQVisitMode from './components/HQVisitMode';
import VoltMascot from './components/VoltMascot';
import './App.css';

function AppContent() {
  const { appView } = useAppContext();
  const { syncMusic } = useMusicContext();
  usePWA();

  // Sync music state when entering the app after welcome screen
  useEffect(() => {
    if (appView !== 'welcome') {
      syncMusic();
    }
  }, [appView, syncMusic]);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#050505', overflow: 'hidden' }}>
      <AnimatePresence mode="wait">
        {appView === 'welcome' && <WelcomeScreen key="welcome" />}
        {appView === 'planning' && <PlanningMode key="planning" />}
        {appView === 'tracking' && <TrackingMode key="tracking" />}
        {appView === 'hq-visit' && <HQVisitMode key="hq-visit" />}
      </AnimatePresence>
      {appView !== 'welcome' && <VoltMascot />}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MusicProvider>
        <AppContent />
      </MusicProvider>
    </AppProvider>
  );
}
