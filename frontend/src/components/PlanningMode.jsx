import React from 'react';
import { motion } from 'framer-motion';
import { Building2 } from 'lucide-react';
import Building from './Building';
import CommandCenter from './CommandCenter';

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
      {/* Unified Top Bar — single heading for the whole screen */}
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
        <p
          style={{ fontSize: 11, color: '#8B8B8D', fontFamily: 'Space Mono, monospace', margin: 0 }}
        >
          <span className="hidden sm:inline">BUILD YOUR WEEK · </span>20 EP MAX
        </p>
      </div>

      {/* Main Content — Building + Command Center always visible side by side */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* Left: Building — always visible, constrained width */}
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
          {/* Sub-label removed — unified heading in top bar is sufficient */}
          <div className="flex-1">
            <Building />
          </div>
        </div>

        {/* Right: Command Center — fills remaining space, no heading needed */}
        <div className="flex flex-col flex-1 min-w-0" style={{ background: '#050505' }}>
          <CommandCenter />
        </div>
      </div>
    </motion.div>
  );
}
