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
// Shows the SPECIFIC ACTIVITY (quest.text) grouped under each goal heading
function SelectedTasksReceipt() {
  const { activeSprint, questLookup } = useAppContext();
  const { selectedQuestIds } = activeSprint;

  if (selectedQuestIds.length === 0) return null;

  // Group quests by parent goal
  const goalMap = new Map();
  for (const id of selectedQuestIds) {
    const entry = questLookup[id];
    if (!entry) continue;
    const { goal, quest } = entry;
    if (!goalMap.has(goal.id)) goalMap.set(goal.id, { name: goal.name, quests: [] });
    goalMap.get(goal.id).quests.push(quest.text);
  }

  return (
    <div
      data-testid="selected-tasks-receipt"
      style={{ marginTop: 10, padding: '8px 10px', borderTop: '1px dashed rgba(0,229,255,0.1)' }}
    >
      <p style={{
        fontSize: 9, color: 'rgba(255,255,255,0.18)',
        fontFamily: 'Space Mono, monospace', letterSpacing: '0.18em', marginBottom: 8,
      }}>
        SELECTED — {selectedQuestIds.length}
      </p>
      <div style={{ overflowY: 'auto', maxHeight: 160 }}>
        {[...goalMap.entries()].map(([goalId, { name, quests }]) => (
          <div key={goalId} style={{ marginBottom: 8 }}>
            {/* Goal name as dim label */}
            <p style={{
              fontSize: 9, color: 'rgba(255,255,255,0.22)',
              fontFamily: 'Space Mono, monospace', letterSpacing: '0.08em',
              marginBottom: 3, textTransform: 'uppercase',
            }}>
              {name}
            </p>
            {/* Each specific activity */}
            {quests.map((text, i) => (
              <p key={i} style={{
                fontSize: 11, color: 'rgba(255,255,255,0.55)',
                fontFamily: 'system-ui, sans-serif', marginBottom: 3,
                lineHeight: 1.4, paddingLeft: 6,
                borderLeft: '2px solid rgba(57,255,20,0.3)',
              }}>
                {text}
              </p>
            ))}
          </div>
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
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(0,229,255,0.12)', background: 'rgba(0,229,255,0.018)' }}
      >
        <div className="flex items-center gap-2">
          <Building2 size={16} color="#39FF14" />
          <h1
            className="font-orbitron"
            style={{ fontSize: 13, color: '#39FF14', letterSpacing: '0.18em', margin: 0 }}
          >
            SUPERHERO HQ
          </h1>
          <span
            className="hidden sm:inline font-orbitron"
            style={{ fontSize: 10, color: 'rgba(0,229,255,0.55)', letterSpacing: '0.12em' }}
          >
            — PLANNING
          </span>
        </div>
        <div className="flex items-center gap-2">
          <p style={{ fontSize: 11, color: '#8B8B8D', fontFamily: 'Space Mono, monospace', margin: 0 }}>
            <span className="hidden sm:inline">BUILD YOUR WEEK · </span>20 EP
          </p>
          <MusicBtn />
        </div>
      </div>

      {/* Main Content — desktop: side-by-side | mobile: stacked */}
      <div className="flex-1 flex flex-col sm:flex-row overflow-hidden min-h-0">

        {/* Building panel — compact on mobile, side column on desktop */}
        <div
          data-testid="building-panel"
          className="flex flex-col overflow-y-auto building-scroll flex-shrink-0"
          style={{
            /* Desktop: fixed side column */
            width: '100%',
            maxHeight: '38%',

            /* Responsive overrides via style tag below */
            padding: '10px 10px 10px 12px',
            background: 'rgba(0,229,255,0.012)',
            borderBottom: '1px solid rgba(0,229,255,0.055)',
          }}
        >
          <Building />
          <SelectedTasksReceipt />
        </div>

        {/* Command Center — fills remaining space */}
        <div
          className="flex flex-col flex-1 min-w-0 min-h-0"
          style={{ background: '#050505', overflow: 'hidden' }}
        >
          <CommandCenter />
        </div>
      </div>

      {/* Responsive layout override for sm+ screens */}
      <style>{`
        @media (min-width: 640px) {
          [data-testid="building-panel"] {
            max-height: 100% !important;
            height: 100% !important;
            width: 34% !important;
            max-width: 300px !important;
            min-width: 170px !important;
            border-bottom: none !important;
            border-right: 1px solid rgba(0,229,255,0.055) !important;
          }
        }
      `}</style>
    </motion.div>
  );
}
