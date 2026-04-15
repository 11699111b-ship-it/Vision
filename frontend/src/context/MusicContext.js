import React, { createContext, useContext, useState, useCallback } from 'react';
import { initAudio, pauseBgTrack, resumeBgTrack, isMusicPlaying } from '../utils/audioEngine';

const MusicContext = createContext(null);

export function MusicProvider({ children }) {
  const [musicOn, setMusicOn] = useState(false);

  const syncMusic = useCallback(() => {
    setMusicOn(isMusicPlaying());
  }, []);

  const toggleMusic = useCallback(() => {
    if (!musicOn) {
      initAudio();
      resumeBgTrack();
      setMusicOn(true);
    } else {
      pauseBgTrack();
      setMusicOn(false);
    }
  }, [musicOn]);

  return (
    <MusicContext.Provider value={{ musicOn, toggleMusic, syncMusic }}>
      {children}
    </MusicContext.Provider>
  );
}

export const useMusicContext = () => useContext(MusicContext);
