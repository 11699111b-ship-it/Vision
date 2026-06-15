import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Flame, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useMusicContext } from '../context/MusicContext';
import Building from './Building';

function MusicBtn() {
  const { musicOn, toggleMusic } = useMusicContext();
  return (
    <motion.button
      onClick={toggleMusic}
      title={musicOn ? 'Pause music' : 'Play music'}
      style={{
        background: 'none',
        border: `1px solid ${musicOn ? 'rgba(57,255,20,0.3)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: '50%',
        width: 30,
        height: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0,
      }}
      whileTap={{ scale: 0.88 }}
      whileHover={{ borderColor: musicOn ? 'rgba(57,255,20,0.6)' : 'rgba(255,255,255,0.25)' }}
    >
      {musicOn ? <Volume2 size={13} color="#39FF14" /> : <VolumeX size={13} color="#555" />}
    </motion.button>
  );
}

function StreakBadge() {
  const { streak } = useAppContext();
  return (
    <div
      className="flex items-center gap-1"
      style={{
        padding: '4px 8px',
        borderRadius: 14,
        background: streak > 0 ? 'rgba(255,165,0,0.1)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${streak > 0 ? 'rgba(255,165,0,0.3)' : 'rgba(255,255,255,0.08)'}`,
        flexShrink: 0,
      }}
    >
      <Flame size={12} color={streak > 0 ? '#FFA500' : '#555'} />
      <span style={{
        fontSize: 11,
        fontWeight: 700,
        fontFamily: 'Space Mono, monospace',
        color: streak > 0 ? '#FFA500' : '#555',
      }}>
        {streak}
      </span>
    </div>
  );
}

export default function HQVisitMode() {
  const { dispatch } = useAppContext();

  return (
    <motion.div
      data-testid="hq-visit-mode"
      className="w-full flex flex-col"
      style={{ background: '#050505', height: '100dvh' }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      {/* Top Bar */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0 safe-top"
        style={{ borderBottom: '1px solid rgba(0,229,255,0.12)' }}
      >
        <h1 className="font-orbitron" style={{ fontSize: 11, color: '#00E5FF', letterSpacing: '0.18em', margin: 0 }}>
          BASE INSPECTION
        </h1>
        <div className="flex items-center gap-2">
          <StreakBadge />
          <MusicBtn />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
      {/* Left: Building */}
      <div
        className="flex-1 flex flex-col items-center justify-center overflow-y-auto p-6 building-scroll"
        style={{ borderRight: '1px solid rgba(0,229,255,0.2)' }}
      >
        <motion.p
          className="font-orbitron text-center mb-4 flex-shrink-0"
          style={{ fontSize: 10, color: '#00E5FF', letterSpacing: '0.3em' }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          PROJECT HIGHRISE — LIVE STATUS
        </motion.p>

        <div style={{ maxWidth: 480, width: '100%' }}>
          <Building />
        </div>

        <div className="mt-6 text-center">
          <p style={{ fontSize: 9, color: '#8B8B8D', fontFamily: 'Space Mono, monospace', letterSpacing: '0.1em' }}>
            ROOMS GLOWING = ACTIVE SPRINT QUESTS
          </p>
        </div>
      </div>

      {/* Right: Return Panel */}
      <div
        className="flex flex-col items-center justify-center p-8 flex-shrink-0"
        style={{ width: '40%', minWidth: 280, background: 'rgba(0,229,255,0.02)' }}
      >
        <Building2 size={48} color="#00E5FF" style={{ marginBottom: 24, opacity: 0.8 }} />

        <h2 className="font-orbitron text-center mb-2" style={{ fontSize: 14, color: '#ffffff', letterSpacing: '0.15em' }}>
          BASE INSPECTION
        </h2>
        <p className="text-center mb-8" style={{ fontSize: 10, color: '#8B8B8D', fontFamily: 'Space Mono, monospace', lineHeight: 1.7 }}>
          Your base is holding, Anurag.<br />
          The mission continues.
        </p>

        <motion.button
          data-testid="return-to-protocol-btn"
          onClick={() => dispatch({ type: 'SET_VIEW', view: 'tracking' })}
          className="w-full py-5 flex items-center justify-center gap-3 font-orbitron font-black"
          style={{
            background: 'transparent',
            border: '2px solid #39FF14',
            color: '#39FF14',
            fontSize: 13,
            letterSpacing: '0.2em',
            cursor: 'pointer',
            boxShadow: '0 0 30px rgba(57,255,20,0.3)',
          }}
          whileHover={{ background: 'rgba(57,255,20,0.1)', boxShadow: '0 0 50px rgba(57,255,20,0.5)', scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          animate={{ boxShadow: ['0 0 20px rgba(57,255,20,0.2)', '0 0 40px rgba(57,255,20,0.5)', '0 0 20px rgba(57,255,20,0.2)'] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <RotateCcw size={16} />
          RETURN TO PROTOCOL
        </motion.button>
      </div>
      </div>
    </motion.div>
  );
}
