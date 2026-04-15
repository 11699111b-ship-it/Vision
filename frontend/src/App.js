import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { AppProvider, useAppContext } from './context/AppContext';
import WelcomeScreen from './components/WelcomeScreen';
import PlanningMode from './components/PlanningMode';
import TrackingMode from './components/TrackingMode';
import HQVisitMode from './components/HQVisitMode';
import VoltMascot from './components/VoltMascot';
import { initAudio, startBgTrack, pauseBgTrack, resumeBgTrack, isMusicPlaying } from './utils/audioEngine';
import './App.css';

function MusicToggle({ musicOn, onToggle }) {
  return (
    <motion.button
      data-testid="music-toggle-btn"
      onClick={onToggle}
      title={musicOn ? 'Pause music' : 'Play music'}
      style={{
        position: 'fixed',
        top: 10,
        right: 14,
        zIndex: 60,
        width: 34,
        height: 34,
        borderRadius: '50%',
        background: '#161616',
        border: `1px solid ${musicOn ? 'rgba(57,255,20,0.3)' : 'rgba(255,255,255,0.1)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
      whileTap={{ scale: 0.88 }}
      whileHover={{ borderColor: musicOn ? 'rgba(57,255,20,0.6)' : 'rgba(255,255,255,0.25)' }}
    >
      {musicOn
        ? <Volume2 size={14} color="#39FF14" />
        : <VolumeX size={14} color="#555" />}
    </motion.button>
  );
}

function AppContent() {
  const { appView } = useAppContext();
  const [musicOn, setMusicOn] = useState(false);

  // Sync with audio engine when entering the app (after ENTER HQ or on load)
  useEffect(() => {
    if (appView !== 'welcome') {
      setMusicOn(isMusicPlaying());
    }
  }, [appView]);

  const handleMusicToggle = () => {
    if (!musicOn) {
      initAudio();
      resumeBgTrack();
      setMusicOn(true);
    } else {
      pauseBgTrack();
      setMusicOn(false);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#050505', overflow: 'hidden' }}>
      <AnimatePresence mode="wait">
        {appView === 'welcome' && <WelcomeScreen key="welcome" />}
        {appView === 'planning' && <PlanningMode key="planning" />}
        {appView === 'tracking' && <TrackingMode key="tracking" />}
        {appView === 'hq-visit' && <HQVisitMode key="hq-visit" />}
      </AnimatePresence>

      {appView !== 'welcome' && <VoltMascot />}
      {appView !== 'welcome' && (
        <MusicToggle musicOn={musicOn} onToggle={handleMusicToggle} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
