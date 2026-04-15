import React from 'react';
import { motion } from 'framer-motion';
import { Building2 } from 'lucide-react';
import { Volume2, VolumeX } from 'lucide-react';
import Building from './Building';
import CommandCenter from './CommandCenter';
import { useAppContext } from '../context/AppContext';
import { useMusicContext } from '../context/MusicContext';

// ── Music toggle button ────────────────────────────────────────────────────────
function MusicBtn() {
  const { musicOn, toggleMusic } = useMusicContext();
  return (
    <motion.button
      data-testid="music-toggle-btn"
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

// ── Minimalist Selected Tasks Receipt (below building) ─────────────────────────
function SelectedTasksReceipt() {
  const { activeSprint, questLookup } = useAppContext();
  const { selectedQuestIds } = activeSprint;

  if (selectedQuestIds.length === 0) return null;

  // Deduplicate: show unique parent goal names only
  const seen = new Set();
  const goalNames = [];
  for (const id of selectedQuestIds) {
    const name = questLookup[id]?.goal.name;
    if (name && !seen.has(name)) {
      seen.add(name);
      goalNames.push(name);
    }
  }

  return (
    <div
      data-testid="selected-tasks-receipt"
      style={{
        marginTop: 10,
        padding: '8px 10px',
        borderTop: '1px dashed rgba(0,229,255,0.1)',
      }}
    >
      <p style={{
        fontSize: 9,
        color: 'rgba(255,255,255,0.18)',
        fontFamily: 'Space Mono, monospace',
        letterSpacing: '0.18em',
        marginBottom: 6,
      }}>
        SELECTED — {selectedQuestIds.length}
      </p>
      <div style={{ overflowY: 'auto', maxHeight: 130 }}>
        {goalNames.map((name, i) => (
          <p
            key={i}
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.35)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              marginBottom: 4,
              lineHeight: 1.4,
              paddingLeft: 4,
              borderLeft: '2px solid rgba(57,255,20,0.25)',
            }}
          >
            {name}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function PlanningMode() {
  return (
    <motion.div
      data-testid="planning-mode-container"
      className="w-full h-screen flex flex-col"
      style={{ background: '#050505' }}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3 }}
    >
      {/* Top Bar */}
      <div
        className="flex items-center justify-between px-5 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(0,229,255,0.12)', background: 'rgba(0,229,255,0.018)' }}
      >
        <div className="flex items-center gap-3">
          <Building2 size={17} color="#39FF14" />
          <h1
            className="font-orbitron"
            style={{ fontSize: 14, color: '#39FF14', letterSpacing: '0.2em', margin: 0 }}
          >
            SUPERHERO HQ
          </h1>
          <span
            className="hidden sm:inline font-orbitron"
            style={{ fontSize: 11, color: 'rgba(0,229,255,0.55)', letterSpacing: '0.15em' }}
          >
            — PLANNING MODE
          </span>
        </div>

        {/* Right: info + music toggle */}
        <div className="flex items-center gap-3">
          <p
            style={{ fontSize: 11, color: '#8B8B8D', fontFamily: 'Space Mono, monospace', margin: 0 }}
          >
            <span className="hidden sm:inline">BUILD YOUR WEEK · </span>20 EP MAX
          </p>
          <MusicBtn />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* Left: Building + Selected Tasks Receipt */}
        <div
          data-testid="building-panel"
          className="flex flex-col overflow-y-auto building-scroll flex-shrink-0"
          style={{
            width: '36%',
            maxWidth: 320,
            minWidth: 180,
            padding: '12px 10px 12px 12px',
            background: 'rgba(0,229,255,0.012)',
            borderRight: '1px solid rgba(0,229,255,0.055)',
          }}
        >
          <Building />
          <SelectedTasksReceipt />
        </div>

        {/* Right: Command Center */}
        <div className="flex flex-col flex-1 min-w-0" style={{ background: '#050505' }}>
          <CommandCenter />
        </div>
      </div>
    </motion.div>
  );
}
