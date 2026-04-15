import React from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../context/AppContext';

// Single window pane in the building facade
function Pane({ lit, locked, delay = 0 }) {
  return (
    <motion.div
      style={{
        flex: 1,
        height: 11,
        background: locked
          ? 'rgba(40,40,50,0.4)'
          : lit
            ? '#39FF14'
            : 'rgba(0,229,255,0.07)',
        border: `1px solid ${
          locked
            ? 'rgba(60,60,70,0.25)'
            : lit
              ? 'rgba(57,255,20,0.7)'
              : 'rgba(0,229,255,0.13)'
        }`,
        borderRadius: 1,
        boxShadow: lit && !locked
          ? '0 0 4px rgba(57,255,20,0.55)'
          : 'none',
      }}
      animate={lit && !locked ? { opacity: [0.78, 1, 0.88, 1, 0.78] } : {}}
      transition={{ duration: 2.2, repeat: Infinity, delay, ease: 'easeInOut' }}
    />
  );
}

// A bay of windows representing one room (4 columns × 2 rows)
function RoomBay({ isActive, locked }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, padding: '5px 4px' }}>
      {[0, 1].map(row => (
        <div key={row} style={{ display: 'flex', gap: 3 }}>
          {[0, 1, 2, 3].map(col => (
            <Pane
              key={col}
              lit={isActive}
              locked={locked}
              delay={(row * 4 + col) * 0.07}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Structural column between room bays
function StructColumn() {
  return (
    <div style={{
      width: 3,
      alignSelf: 'stretch',
      background: 'linear-gradient(to bottom, rgba(0,229,255,0.35), rgba(0,229,255,0.15))',
      flexShrink: 0,
    }} />
  );
}

function FloorBand({ floor, isBasement }) {
  const { isRoomActive } = useAppContext();

  return (
    <div
      data-testid={`floor-${floor.number}-building`}
      style={{
        display: 'flex',
        borderBottom: '1px solid rgba(0,229,255,0.28)',
        background: isBasement
          ? 'linear-gradient(to bottom, rgba(5,5,8,0.95), rgba(8,8,12,0.98))'
          : 'linear-gradient(to bottom, rgba(12,12,22,0.7), rgba(9,9,18,0.85))',
        minHeight: isBasement ? 40 : 52,
        position: 'relative',
      }}
    >
      {/* Left: floor number + name */}
      <div style={{
        width: 22,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderRight: '2px solid rgba(0,229,255,0.28)',
        background: isBasement ? 'rgba(0,229,255,0.03)' : 'rgba(0,229,255,0.05)',
        padding: '2px 1px',
        gap: 2,
      }}>
        <span style={{
          fontSize: 8,
          fontFamily: 'Orbitron, sans-serif',
          color: '#00E5FF',
          fontWeight: 700,
        }}>
          {floor.number}
        </span>
        {/* Tiny floor indicator dots */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
          {floor.rooms.some(r => isRoomActive(r.id)) && (
            <motion.div
              style={{ width: 4, height: 4, borderRadius: '50%', background: '#39FF14', boxShadow: '0 0 4px #39FF14' }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </div>
      </div>

      {/* Room bays with windows */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'stretch' }}>
        {floor.rooms.map((room, ri) => (
          <React.Fragment key={room.id}>
            {ri > 0 && <StructColumn />}
            <RoomBay
              isActive={isRoomActive(room.id)}
              locked={room.locked}
            />
          </React.Fragment>
        ))}
      </div>

      {/* Right structural edge */}
      <div style={{ width: 3, flexShrink: 0, background: 'rgba(0,229,255,0.2)' }} />
    </div>
  );
}

export default function Building() {
  const { blueprint, heroInfo, totalEP, MAX_EP, activeSprint } = useAppContext();
  const aboveGround = [...blueprint.floors].filter(f => f.number >= 1).reverse(); // F5..F1
  const basement = blueprint.floors.find(f => f.number === 0);
  const activeCount = activeSprint.selectedQuestIds.length;

  return (
    <div
      data-testid="building-container"
      style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
    >
      {/* Antenna */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <motion.div
          style={{ width: 2, height: 22, background: '#00E5FF', boxShadow: '0 0 4px rgba(0,229,255,0.4)' }}
          animate={{ opacity: [0.5, 1, 0.6] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
        <div style={{ width: 30, height: 5, background: 'rgba(0,229,255,0.25)', border: '1px solid rgba(0,229,255,0.6)', borderBottom: 'none' }} />
      </div>

      {/* Main building shell */}
      <div style={{
        width: '100%',
        border: '2px solid rgba(0,229,255,0.7)',
        borderBottom: 'none',
        background: 'linear-gradient(170deg, #0d0d1c 0%, #080812 100%)',
        boxShadow: '0 0 20px rgba(0,229,255,0.08), inset 1px 0 0 rgba(0,229,255,0.1), inset -1px 0 0 rgba(0,229,255,0.1)',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Above ground floors: F5 → F1 */}
        {aboveGround.map(floor => (
          <FloorBand key={floor.id} floor={floor} isBasement={false} />
        ))}

        {/* Ground level divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 6px',
          height: 12,
          background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.2), transparent)',
          borderTop: '1.5px solid rgba(0,229,255,0.55)',
          borderBottom: '1.5px solid rgba(0,229,255,0.55)',
        }}>
          <span style={{ fontSize: 5, fontFamily: 'Orbitron, sans-serif', color: 'rgba(0,229,255,0.7)', letterSpacing: '0.3em', width: '100%', textAlign: 'center' }}>
            GROUND LEVEL
          </span>
        </div>

        {/* Basement (Floor 0) */}
        {basement && <FloorBand floor={basement} isBasement />}

        {/* Hero + EP footer */}
        <div style={{
          borderTop: '2px solid rgba(0,229,255,0.5)',
          background: 'rgba(0,229,255,0.04)',
          padding: '6px 8px',
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Hero avatar */}
            <div style={{
              border: '1px solid rgba(0,229,255,0.4)',
              background: 'rgba(0,229,255,0.06)',
              padding: '3px 7px',
              textAlign: 'center',
              flexShrink: 0,
            }}>
              <div style={{ fontSize: 16, lineHeight: 1 }}>{heroInfo.emoji}</div>
              <div style={{ fontSize: 5.5, color: '#00E5FF', fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.05em', marginTop: 2 }}>
                {heroInfo.name.toUpperCase()}
              </div>
            </div>

            {/* EP meter */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 6, color: '#8B8B8D', fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.08em' }}>EP</span>
                <span style={{ fontSize: 7, fontFamily: 'Space Mono, monospace', fontWeight: 700, color: totalEP > 16 ? '#FFA500' : '#39FF14' }}>
                  {totalEP}/{MAX_EP}
                </span>
              </div>
              <div style={{ background: 'rgba(0,229,255,0.08)', height: 7, border: '1px solid rgba(0,229,255,0.25)', overflow: 'hidden' }}>
                <motion.div
                  className="ep-bar-fill"
                  style={{ height: '100%' }}
                  animate={{ width: `${Math.min((totalEP / MAX_EP) * 100, 100)}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <div style={{ fontSize: 5, color: '#555', marginTop: 2, fontFamily: 'Space Mono, monospace' }}>
                {activeCount} QUEST{activeCount !== 1 ? 'S' : ''} ACTIVE
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Foundation shadow layers */}
      <div style={{ width: '106%', height: 5, background: 'rgba(0,229,255,0.18)', border: '1px solid rgba(0,229,255,0.5)', borderTop: 'none' }} />
      <div style={{ width: '110%', height: 3, background: 'rgba(0,229,255,0.09)' }} />
      <div style={{ width: '112%', height: 2, background: 'rgba(0,229,255,0.04)' }} />
    </div>
  );
}
