import React from 'react';
import { motion } from 'framer-motion';
import { Building2, RotateCcw } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import Building from './Building';

export default function HQVisitMode() {
  const { dispatch } = useAppContext();

  return (
    <motion.div
      data-testid="hq-visit-mode"
      className="w-full h-screen flex flex-col lg:flex-row"
      style={{ background: '#050505' }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
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
          Your base is holding, Boss Anurag.<br />
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
    </motion.div>
  );
}
