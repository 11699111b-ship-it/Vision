import React from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import { initAudio, startBgTrack } from '../utils/audioEngine';

const WELCOME_BG = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80';

export default function WelcomeScreen() {
  const { dispatch, isLoading } = useAppContext();

  const handleEnter = () => {
    localStorage.setItem('hq_entered', '1');
    initAudio();
    startBgTrack();
    dispatch({ type: 'SET_VIEW', view: 'planning' });
  };

  return (
    <motion.div
      className="relative w-full flex flex-col items-center justify-center overflow-hidden cyber-grid"
      style={{ background: '#050505', height: '100dvh' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      {/* Background image */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${WELCOME_BG})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.18,
          filter: 'saturate(0.3)',
        }}
      />

      {/* Scan line effect */}
      <motion.div
        className="absolute left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.6), transparent)', top: '20%' }}
        animate={{ top: ['10%', '90%'] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
      />

      <div className="relative z-10 text-center px-6">
        <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
          <p className="font-orbitron text-xs tracking-[0.4em] uppercase mb-6" style={{ color: '#00E5FF' }}>
            SYSTEM ONLINE — WELCOME BACK, BOSS ANURAG
          </p>
        </motion.div>

        <motion.h1
          className="font-orbitron font-black uppercase leading-none"
          style={{ fontSize: 'clamp(3rem, 10vw, 7rem)', color: '#39FF14', textShadow: '0 0 60px rgba(57,255,20,0.5), 0 0 120px rgba(57,255,20,0.2)' }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.6, type: 'spring', stiffness: 100 }}
        >
          SUPERHERO
        </motion.h1>
        <motion.h1
          className="font-orbitron font-black uppercase leading-none mb-8"
          style={{ fontSize: 'clamp(3rem, 12vw, 9rem)', color: '#00E5FF', textShadow: '0 0 60px rgba(0,229,255,0.5)' }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.8, type: 'spring', stiffness: 100 }}
        >
          HQ
        </motion.h1>

        <motion.p
          className="text-sm mb-12 font-orbitron tracking-widest"
          style={{ color: '#8B8B8D' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
        >
          THE 6-FLOOR MASTER BLUEPRINT FOR <span style={{ color: '#39FF14' }}>ANURAG</span>
        </motion.p>

        {isLoading ? (
          <motion.div
            className="flex flex-col items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3 }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                border: '3px solid rgba(57,255,20,0.2)',
                borderTopColor: '#39FF14',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <p className="font-orbitron text-xs tracking-[0.3em] uppercase" style={{ color: '#39FF14' }}>
              SYNCING DATA...
            </p>
          </motion.div>
        ) : (
          <motion.button
            data-testid="enter-hq-button"
            onClick={handleEnter}
            className="font-orbitron font-black text-base tracking-[0.3em] uppercase px-14 py-5 relative overflow-hidden"
            style={{
              background: 'transparent',
              border: '2px solid #39FF14',
              color: '#39FF14',
              cursor: 'pointer',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            whileHover={{
              boxShadow: '0 0 50px rgba(57,255,20,0.6), inset 0 0 20px rgba(57,255,20,0.1)',
              scale: 1.02,
            }}
            whileTap={{ scale: 0.96 }}
          >
            ENTER HQ
          </motion.button>
        )}

        <motion.div className="flex items-center justify-center gap-6 mt-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}>
          {['6 FLOORS', '20 EP BUDGET', '100+ QUESTS'].map((label) => (
            <div key={label} className="text-center">
              <div className="text-xs font-orbitron tracking-widest" style={{ color: '#8B8B8D' }}>{label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
