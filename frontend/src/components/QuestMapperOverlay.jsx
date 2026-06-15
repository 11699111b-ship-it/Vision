import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Check } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { boop } from '../utils/audioEngine';

// ── Single quest row — checks linkedQuestIds, not selectedQuestIds ─────────────
function MapperQuestRow({ quest, isLinked, focusId, isLast }) {
  const { dispatch } = useAppContext();

  const handleToggle = () => {
    boop();
    dispatch({ type: 'TOGGLE_QUEST_IN_FOCUS', focusId, questId: quest.id });
  };

  return (
    <div
      onClick={handleToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 20px',
        borderBottom: !isLast ? '1px solid rgba(255,255,255,0.05)' : 'none',
        background: isLinked ? 'rgba(57,255,20,0.04)' : 'transparent',
        cursor: 'pointer', transition: 'background 0.15s',
      }}
    >
      <p style={{
        flex: 1, fontSize: 13, margin: 0, lineHeight: 1.45,
        color: isLinked ? '#ffffff' : '#D1D5DB',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontWeight: isLinked ? 500 : 400,
        minWidth: 0,
      }}>
        {quest.text}
      </p>
      <div style={{
        width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
        border: `1.5px solid ${isLinked ? '#39FF14' : 'rgba(255,255,255,0.18)'}`,
        background: isLinked ? '#39FF14' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}>
        {isLinked && <Check size={9} color="#000" strokeWidth={3.5} />}
      </div>
    </div>
  );
}

// ── Goal group inside mapper ───────────────────────────────────────────────────
function MapperGoalGroup({ goal, focusId, linkedQuestIds }) {
  const linkedCount = goal.quests.filter(q => linkedQuestIds.includes(q.id)).length;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '0 20px 8px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        marginBottom: 4,
      }}>
        {linkedCount > 0 && (
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#39FF14', boxShadow: '0 0 4px #39FF14', flexShrink: 0 }} />
        )}
        <span style={{
          flex: 1, fontSize: 11, fontWeight: 700, color: '#9CA3AF',
          fontFamily: 'system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          {goal.name}
        </span>
        {linkedCount > 0 && (
          <span style={{ fontSize: 9, color: '#39FF14', fontFamily: 'Space Mono, monospace' }}>
            {linkedCount}/{goal.quests.length}
          </span>
        )}
      </div>
      {goal.quests.map((quest, idx) => (
        <MapperQuestRow
          key={quest.id}
          quest={quest}
          isLinked={linkedQuestIds.includes(quest.id)}
          focusId={focusId}
          isLast={idx === goal.quests.length - 1}
        />
      ))}
    </div>
  );
}

// ── Room accordion inside mapper ───────────────────────────────────────────────
function MapperRoomSection({ room, focusId, linkedQuestIds }) {
  const [open, setOpen] = useState(false);
  const allGoals = [...room.goals, ...(room.customGoals || [])];
  const linkedInRoom = allGoals.flatMap(g => g.quests).filter(q => linkedQuestIds.includes(q.id)).length;
  const ChevronIcon = open ? ChevronDown : ChevronRight;

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 text-left"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '9px 16px' }}
      >
        <span style={{
          fontSize: 12, fontWeight: 600, flex: 1,
          color: linkedInRoom > 0 ? '#39FF14' : 'rgba(255,255,255,0.5)',
          fontFamily: 'system-ui, sans-serif',
        }}>
          {room.name}
        </span>
        {linkedInRoom > 0 && (
          <span style={{ fontSize: 9, color: '#39FF14', fontFamily: 'Space Mono, monospace', flexShrink: 0 }}>
            {linkedInRoom}
          </span>
        )}
        {room.locked && (
          <span style={{ fontSize: 10, color: '#444', fontFamily: 'Space Mono, monospace' }}>LOCKED</span>
        )}
        <ChevronIcon size={12} color="rgba(255,255,255,0.2)" style={{ flexShrink: 0 }} />
      </button>
      {open && !room.locked && (
        <div style={{ padding: '8px 0 4px' }}>
          {allGoals.map(goal => (
            <MapperGoalGroup
              key={goal.id}
              goal={goal}
              focusId={focusId}
              linkedQuestIds={linkedQuestIds}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Floor accordion inside mapper ──────────────────────────────────────────────
function MapperFloorSection({ floor, focusId, linkedQuestIds }) {
  const [open, setOpen] = useState(false);
  const ChevronIcon = open ? ChevronDown : ChevronRight;

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 text-left"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '13px 16px' }}
      >
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', fontFamily: 'Space Mono, monospace', letterSpacing: '0.1em', flexShrink: 0 }}>
          F{floor.number}
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', flex: 1, fontFamily: 'system-ui, sans-serif' }}>
          {floor.name}
        </span>
        <ChevronIcon size={14} color="rgba(255,255,255,0.22)" style={{ flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{ background: 'rgba(0,0,0,0.18)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          {floor.rooms.map(room => (
            <MapperRoomSection
              key={room.id}
              room={room}
              focusId={focusId}
              linkedQuestIds={linkedQuestIds}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Overlay root ───────────────────────────────────────────────────────────────
export default function QuestMapperOverlay({ focusId, onClose }) {
  const { blueprint, focusItems } = useAppContext();
  const focus = focusItems.find(f => f.id === focusId);
  if (!focus) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: '#0d0d0d',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
      }}>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'Space Mono, monospace', fontSize: 11,
            color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: 4,
            padding: 0,
          }}
        >
          ← DONE
        </button>
        <div style={{ flex: 1 }}>
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.14em' }}>
            MAP QUESTS TO
          </span>
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, fontWeight: 700, color: '#39FF14', marginLeft: 8 }}>
            {focus.name}
          </span>
        </div>
        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: 'rgba(57,255,20,0.5)', flexShrink: 0 }}>
          {focus.linkedQuestIds.length} linked
        </span>
      </div>

      {/* Blueprint accordion — scrollable */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {blueprint.floors.map(floor => (
          <MapperFloorSection
            key={floor.id}
            floor={floor}
            focusId={focusId}
            linkedQuestIds={focus.linkedQuestIds}
          />
        ))}
        <div style={{ height: 32 }} />
      </div>
    </div>
  );
}
