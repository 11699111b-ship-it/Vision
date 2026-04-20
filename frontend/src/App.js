import React, { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { AppProvider, useAppContext } from './context/AppContext';
import { MusicProvider, useMusicContext } from './context/MusicContext';
import { usePWA } from './hooks/usePWA';
import WelcomeScreen from './components/WelcomeScreen';
import PlanningMode from './components/PlanningMode';
import TrackingMode from './components/TrackingMode';
import HQVisitMode from './components/HQVisitMode';
import VoltMascot from './components/VoltMascot';
import { Toaster } from './components/ui/sonner';
import './App.css';

function AppContent() {
  const { appView, autoSubmittedMessage, dispatch } = useAppContext();
  const { syncMusic } = useMusicContext();
  usePWA();

  // Sync music state when entering the app after welcome screen
  useEffect(() => {
    if (appView !== 'welcome') {
      syncMusic();
    }
  }, [appView, syncMusic]);

  // Show auto-submit toast once, then clear it from state
  useEffect(() => {
    if (!autoSubmittedMessage) return;
    toast(autoSubmittedMessage, {
      duration: 10000,
      style: {
        background: '#0a0a0a',
        border: '1px solid #39FF14',
        color: '#39FF14',
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '0.75rem',
      },
    });
    dispatch({ type: 'CLEAR_AUTO_SUBMIT' });
  }, [autoSubmittedMessage, dispatch]);

  return (
    <div style={{ width: '100vw', height: '100dvh', background: '#050505', overflow: 'hidden' }}>
      <AnimatePresence mode="wait">
        {appView === 'welcome' && <WelcomeScreen key="welcome" />}
        {appView === 'planning' && <PlanningMode key="planning" />}
        {appView === 'tracking' && <TrackingMode key="tracking" />}
        {appView === 'hq-visit' && <HQVisitMode key="hq-visit" />}
      </AnimatePresence>
      {appView !== 'welcome' && <VoltMascot />}
      <Toaster position="top-center" />
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
