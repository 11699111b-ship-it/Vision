import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, ChevronRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

function getVoltData(appView, floor01EP, upkeepMin, selectedCount) {
  if (appView === 'planning') {
    return {
      text: `Good morning, Anurag! Allocate your 20 EP and build your week.`,
      urgent: false,
    };
  }
  if (appView === 'tracking') {
    return { text: `Stay frosty, Anurag. Let's close these rings.`, urgent: false };
  }
  if (appView === 'hq-visit') {
    return { text: `Looking good, Anurag. Base integrity is holding.`, urgent: false };
  }
  return { text: `Welcome to Superhero HQ, Anurag. Ready to build?`, urgent: false };
}

export default function VoltMascot() {
  const { appView, floor01EP, UPKEEP_MIN_EP, activeSprint } = useAppContext();
  const [expanded, setExpanded] = useState(false);

  const voltData = getVoltData(
    appView,
    floor01EP,
    UPKEEP_MIN_EP,
    activeSprint.selectedQuestIds.length
  );

  return (
    <motion.div
      data-testid="volt-mascot"
      className="fixed right-5 z-50 flex flex-col items-end gap-2"
      style={{ maxWidth: 260, bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))' }}
    >
      {/* Chat bubble */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ duration: 0.2 }}
            className="relative p-3"
            style={{
              background: '#111111',
              border: `1px solid ${voltData.urgent ? '#FF3B30' : '#00E5FF'}`,
              boxShadow: voltData.urgent ? '0 0 20px rgba(255,59,48,0.3)' : '0 0 20px rgba(0,229,255,0.2)',
              maxWidth: 240,
            }}
          >
            <div style={{
              position: 'absolute', bottom: -8, right: 16,
              width: 0, height: 0,
              borderLeft: '7px solid transparent', borderRight: '7px solid transparent',
              borderTop: `8px solid ${voltData.urgent ? '#FF3B30' : '#00E5FF'}`,
            }} />
            <p style={{
              fontSize: 12,
              color: '#ffffff',
              fontFamily: 'Space Mono, monospace',
              lineHeight: 1.5,
              margin: 0,
            }}>
              <span style={{ color: '#39FF14', marginRight: 4 }}>VOLT:</span>
              {voltData.text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Volt bot icon */}
      <motion.button
        onClick={() => setExpanded(e => !e)}
        className="flex items-center justify-center cursor-pointer"
        style={{
          width: 52, height: 52,
          background: '#111111',
          border: `2px solid ${voltData.urgent ? '#FF3B30' : '#00E5FF'}`,
          boxShadow: voltData.urgent ? '0 0 20px rgba(255,59,48,0.4)' : '0 0 20px rgba(0,229,255,0.3)',
          borderRadius: 0,
        }}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
        whileTap={{ scale: 0.9 }}
      >
        <Bot size={22} color={voltData.urgent ? '#FF3B30' : '#00E5FF'} />
      </motion.button>
    </motion.div>
  );
}
