import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Plus, X, Rocket, AlertTriangle, Check, Zap, RotateCcw } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { boop } from '../utils/audioEngine';
import { FOUNDER_GRIND, RECOVERY_WEEK } from '../data/loadouts';

const FREQ_COLORS = { Daily: '#39FF14', Weekly: '#00E5FF', Monthly: '#FFA500', Quarterly: '#cc44ff' };

// ── Quest row — shows only the specific ACTIVITY, generous padding ────────────
function QuestCard({ quest, isSelected, isLocked, onToggle, isLast }) {
  const freqColor = FREQ_COLORS[quest.frequency] || '#8B8B8D';
  return (
    <motion.div
      data-testid={`quest-${quest.id}-checkbox`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',                                     // py-3.5 px-4
        cursor: isLocked ? 'default' : 'pointer',
        borderBottom: !isLast ? '1px solid rgba(255,255,255,0.05)' : 'none',  // border-b border-white/5
        background: isSelected ? 'rgba(57,255,20,0.04)' : 'transparent',
        opacity: isLocked ? 0.28 : 1,
        pointerEvents: isLocked ? 'none' : 'auto',
        transition: 'background 0.15s',
      }}
      onClick={() => { if (!isLocked) { boop(); onToggle(quest.id); } }}
      whileHover={!isLocked && !isSelected ? { background: 'rgba(255,255,255,0.02)' } : {}}
      whileTap={!isLocked ? { scale: 0.995 } : {}}
    >
      {/* Activity text — text-gray-300 base */}
      <p style={{
        flex: 1,
        fontSize: 13,
        margin: 0,
        lineHeight: 1.45,
        color: isSelected ? '#ffffff' : '#D1D5DB',                // text-gray-300
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        fontWeight: isSelected ? 500 : 400,
        minWidth: 0,
      }}>
        {quest.text}
      </p>

      {/* Right: freq badge + circle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{
          fontSize: 9, color: freqColor,
          fontFamily: 'Space Mono, monospace',
          border: `1px solid ${freqColor}25`,
          padding: '1px 4px', borderRadius: 3,
        }}>
          {quest.frequency[0]}
        </span>
        <div style={{
          width: 16, height: 16, borderRadius: '50%',
          border: `1.5px solid ${isSelected ? '#39FF14' : 'rgba(255,255,255,0.18)'}`,
          background: isSelected ? '#39FF14' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s', flexShrink: 0,
        }}>
          {isSelected && <Check size={9} color="#000" strokeWidth={3.5} />}
        </div>
      </div>
    </motion.div>
  );
}

// ── Goal group — header + indented quest rows, mb-8 spacing ──────────────────
function GoalGroup({ goal, isLocked, activeSprint, onToggle }) {
  const selectedCount = goal.quests.filter(q => activeSprint.selectedQuestIds.includes(q.id)).length;
  const hasSelection = selectedCount > 0;

  return (
    <div style={{ marginBottom: 32 }}>
      {/* Goal header — uppercase text-xs tracking-wider font-bold text-gray-400 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        paddingBottom: 8,
        marginBottom: 12,
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        {hasSelection && (
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#39FF14', boxShadow: '0 0 4px #39FF14', flexShrink: 0 }} />
        )}
        <span style={{
          flex: 1,
          fontSize: 11,
          fontWeight: 700,
          color: '#9CA3AF',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          lineHeight: 1.3,
        }}>
          {goal.name}
        </span>
        {hasSelection && (
          <span style={{ fontSize: 9, color: '#39FF14', fontFamily: 'Space Mono, monospace', flexShrink: 0 }}>
            {selectedCount}/{goal.quests.length}
          </span>
        )}
        {/* EP Badge — bg-[#39FF14]/10 text-[#39FF14] px-2 py-0.5 rounded text-[10px] */}
        <span style={{
          background: 'rgba(57,255,20,0.1)',
          color: '#39FF14',
          padding: '2px 8px',
          borderRadius: 4,
          fontSize: 10,
          fontFamily: 'Space Mono, monospace',
          flexShrink: 0,
        }}>
          {goal.epCost}EP
        </span>
      </div>

      {/* Quest rows */}
      {goal.quests.map((quest, idx) => (
        <QuestCard
          key={quest.id}
          quest={quest}
          isSelected={activeSprint.selectedQuestIds.includes(quest.id)}
          isLocked={isLocked || goal.tag === 'Locked'}
          onToggle={onToggle}
          isLast={idx === goal.quests.length - 1}
        />
      ))}
    </div>
  );
}

// ── Mobile-only receipt bar (shows inside CommandCenter on mobile) ─────────────
function MobileReceiptBar() {
  const { activeSprint, questLookup } = useAppContext();
  const { selectedQuestIds } = activeSprint;
  if (selectedQuestIds.length === 0) return null;

  return (
    <div
      data-testid="mobile-receipt-bar"
      className="block sm:hidden"
      style={{
        borderBottom: '1px solid rgba(0,229,255,0.2)',
        padding: '8px 14px 10px',
        background: 'rgba(0,229,255,0.02)',
      }}
    >
      <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'Space Mono, monospace', letterSpacing: '0.14em', marginBottom: 6 }}>
        SELECTED — {selectedQuestIds.length}
      </p>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
        {selectedQuestIds.map(id => {
          const text = questLookup[id]?.quest.text;
          if (!text) return null;
          return (
            <span key={id} style={{
              flexShrink: 0, fontSize: 11, color: '#D1D5DB',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(57,255,20,0.2)',
              borderRadius: 4, padding: '3px 8px',
              whiteSpace: 'nowrap', maxWidth: 160,
              overflow: 'hidden', textOverflow: 'ellipsis',
              fontFamily: 'system-ui, sans-serif',
            }}>
              {text}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ── Custom quest form ──────────────────────────────────────────────────────────
function CustomQuestForm({ floorId, roomId, onAdd, onClose }) {
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState('Daily');
  const [tag, setTag] = useState('Daily Power-Up');
  const { EP_COSTS } = useAppContext();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const ts = Date.now();
    const goalId = `${roomId}-custom-${ts}`;
    onAdd(floorId, roomId, {
      id: goalId,
      name: name.trim(),
      tag,
      epCost: EP_COSTS[tag] || 2,
      isCustom: true,
      quests: [{ id: `${goalId}-q0`, text: name.trim(), frequency }],
    });
    boop();
    onClose();
  };

  const selectStyle = {
    background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)',
    color: '#fff', fontSize: 12, padding: '5px 8px', borderRadius: 7, cursor: 'pointer', flex: 1,
  };

  return (
    <motion.form
      data-testid={`custom-quest-form-${roomId}`}
      onSubmit={handleSubmit}
      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.18 }}
      style={{ overflow: 'hidden', marginBottom: 6 }}
    >
      <div style={{ background: 'rgba(0,229,255,0.025)', borderRadius: 10, border: '1px solid rgba(0,229,255,0.12)', padding: '12px 14px' }}>
        <p style={{ fontSize: 10, color: '#00E5FF', fontFamily: 'Space Mono, monospace', letterSpacing: '0.14em', marginBottom: 10 }}>
          + NEW CUSTOM QUEST
        </p>
        <input
          data-testid="custom-quest-name-input"
          value={name} onChange={e => setName(e.target.value)}
          placeholder="Quest name..."
          required
          style={{
            background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.12)',
            color: '#fff', fontFamily: 'system-ui, sans-serif', fontSize: 13, outline: 'none', padding: '4px 0', width: '100%',
          }}
        />
        <div className="flex gap-2 mt-3">
          <select data-testid="custom-quest-frequency-select" style={selectStyle} value={frequency} onChange={e => setFrequency(e.target.value)}>
            <option>Daily</option><option>Weekly</option><option>Monthly</option>
          </select>
          <select data-testid="custom-quest-tag-select" style={selectStyle} value={tag} onChange={e => setTag(e.target.value)}>
            <option>Daily Power-Up</option><option>Autopilot Bots</option><option>Big Missions</option>
          </select>
        </div>
        <div className="flex gap-2 mt-3">
          <button data-testid="custom-quest-submit-btn" type="submit"
            style={{ background: '#39FF14', border: 'none', borderRadius: 7, color: '#000', fontSize: 12, fontFamily: 'Space Mono, monospace', fontWeight: 700, padding: '6px 14px', cursor: 'pointer' }}>
            ADD
          </button>
          <button type="button" onClick={onClose}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: 'rgba(255,255,255,0.35)', fontSize: 12, padding: '6px 10px', cursor: 'pointer' }}>
            CANCEL
          </button>
        </div>
      </div>
    </motion.form>
  );
}

// ── Room accordion ─────────────────────────────────────────────────────────────
function RoomSection({ floor, room }) {
  const { activeSprint, dispatch, isRoomActive } = useAppContext();
  const [open, setOpen] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const isActive = isRoomActive(room.id);
  const allGoals = [...room.goals, ...(room.customGoals || [])];

  const handleToggle = (questId) => dispatch({ type: 'TOGGLE_SPRINT_QUEST', questId });
  const handleAddCustom = (fId, rId, goal) => dispatch({ type: 'ADD_CUSTOM_GOAL', floorId: fId, roomId: rId, goal });

  return (
    <div>
      <button
        data-testid={`room-${room.id}-accordion`}
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 text-left"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '9px 16px' }}
      >
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: isActive ? '#39FF14' : 'rgba(255,255,255,0.5)',
          flex: 1,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          {room.name}
        </span>
        {isActive && (
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#39FF14', boxShadow: '0 0 4px #39FF14', flexShrink: 0 }} />
        )}
        {room.locked && (
          <span style={{ fontSize: 10, color: '#444', fontFamily: 'Space Mono, monospace' }}>LOCKED</span>
        )}
        {open
          ? <ChevronDown size={12} color="rgba(255,255,255,0.2)" style={{ flexShrink: 0 }} />
          : <ChevronRight size={12} color="rgba(255,255,255,0.15)" style={{ flexShrink: 0 }} />
        }
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: 'hidden', padding: '8px 16px 4px' }}
          >
            {/* Goals grouped with header + indented quests */}
            {allGoals.map(goal => (
              <GoalGroup
                key={goal.id}
                goal={goal}
                isLocked={room.locked}
                activeSprint={activeSprint}
                onToggle={handleToggle}
              />
            ))}

            <AnimatePresence>
              {showCustomForm && (
                <CustomQuestForm
                  floorId={floor.id}
                  roomId={room.id}
                  onAdd={handleAddCustom}
                  onClose={() => setShowCustomForm(false)}
                />
              )}
            </AnimatePresence>

            {!room.locked && (
              <button
                onClick={() => { setShowCustomForm(v => !v); boop(); }}
                className="flex items-center gap-2 w-full"
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  padding: '7px 2px', borderTop: '1px dashed rgba(255,255,255,0.06)',
                }}
              >
                <Plus size={11} color="#00E5FF" />
                <span style={{ fontSize: 11, color: '#00E5FF', fontFamily: 'Space Mono, monospace', letterSpacing: '0.07em' }}>
                  ADD CUSTOM QUEST
                </span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Floor accordion (starts COLLAPSED — fixes Hick's Law violation) ────────────
function FloorSection({ floor }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      data-testid={`floor-${floor.number}-accordion`}
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 text-left"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '13px 16px' }}
      >
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', fontFamily: 'Space Mono, monospace', letterSpacing: '0.1em', flexShrink: 0 }}>
          F{floor.number}
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', flex: 1, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          {floor.name}
        </span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', fontFamily: 'Space Mono, monospace', flexShrink: 0 }}>
          {floor.rooms.length}
        </span>
        {open
          ? <ChevronDown size={14} color="rgba(255,255,255,0.22)" style={{ flexShrink: 0 }} />
          : <ChevronRight size={14} color="rgba(255,255,255,0.18)" style={{ flexShrink: 0 }} />
        }
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden', background: 'rgba(0,0,0,0.18)', borderTop: '1px solid rgba(255,255,255,0.04)' }}
          >
            {floor.rooms.map(room => (
              <RoomSection key={room.id} floor={floor} room={room} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Smart Loadouts panel ───────────────────────────────────────────────────────
function LoadoutsPanel() {
  const { dispatch, lastSprintQuestIds } = useAppContext();
  const hasLastWeek = lastSprintQuestIds && lastSprintQuestIds.length > 0;

  const handleLoad = (questIds) => {
    boop();
    dispatch({ type: 'LOAD_LOADOUT', questIds });
  };

  const pillBtn = (accent, enabled = true) => ({
    padding: '7px 14px',
    borderRadius: 20,
    background: 'transparent',
    border: `1px solid ${accent}40`,
    color: accent,
    fontSize: 11,
    fontFamily: 'Space Mono, monospace',
    letterSpacing: '0.07em',
    cursor: enabled ? 'pointer' : 'not-allowed',
    opacity: enabled ? 1 : 0.35,
    transition: 'background 0.15s, border-color 0.15s',
  });

  return (
    <div style={{ padding: '12px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Zap size={11} color="rgba(255,255,255,0.25)" />
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'Space Mono, monospace', letterSpacing: '0.18em' }}>
          SMART LOADOUTS
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <motion.button
          data-testid="loadout-founder-btn"
          style={pillBtn('#39FF14')}
          onClick={() => handleLoad(FOUNDER_GRIND.questIds)}
          whileHover={{ background: 'rgba(57,255,20,0.08)', borderColor: 'rgba(57,255,20,0.65)' }}
          whileTap={{ scale: 0.96 }}
          title={FOUNDER_GRIND.description}
        >
          {FOUNDER_GRIND.label}
        </motion.button>

        <motion.button
          data-testid="loadout-recovery-btn"
          style={pillBtn('#00E5FF')}
          onClick={() => handleLoad(RECOVERY_WEEK.questIds)}
          whileHover={{ background: 'rgba(0,229,255,0.08)', borderColor: 'rgba(0,229,255,0.65)' }}
          whileTap={{ scale: 0.96 }}
          title={RECOVERY_WEEK.description}
        >
          {RECOVERY_WEEK.label}
        </motion.button>

        <motion.button
          data-testid="loadout-repeat-btn"
          style={pillBtn(hasLastWeek ? '#FFA500' : 'rgba(255,255,255,0.25)', hasLastWeek)}
          onClick={() => hasLastWeek && handleLoad(lastSprintQuestIds)}
          whileHover={hasLastWeek ? { background: 'rgba(255,165,0,0.08)', borderColor: 'rgba(255,165,0,0.65)' } : {}}
          whileTap={hasLastWeek ? { scale: 0.96 } : {}}
          disabled={!hasLastWeek}
          title={hasLastWeek ? 'Repeat your last sprint' : 'No previous sprint saved yet'}
        >
          REPEAT LAST WEEK
        </motion.button>
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function CommandCenter() {
  const { blueprint, totalEP, MAX_EP, activeSprint, launchError, dispatch } = useAppContext();
  const canLaunch = activeSprint.selectedQuestIds.length > 0 && totalEP <= MAX_EP;
  const epPct = Math.min((totalEP / MAX_EP) * 100, 100);
  const hasSelection = activeSprint.selectedQuestIds.length > 0;

  return (
    <div data-testid="command-center" className="flex flex-col h-full">

      {/* Smart Loadouts */}
      <LoadoutsPanel />

      {/* EP budget strip + Reset button */}
      <div
        data-testid="ep-budget-display"
        className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}
      >
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', fontFamily: 'Space Mono, monospace', flexShrink: 0 }}>
          EP
        </span>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', height: 4, borderRadius: 2, overflow: 'hidden' }}>
          <motion.div
            style={{ height: '100%', background: totalEP > MAX_EP * 0.85 ? '#FFA500' : '#39FF14', borderRadius: 2 }}
            animate={{ width: `${epPct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Space Mono, monospace', flexShrink: 0, color: totalEP > MAX_EP * 0.85 ? '#FFA500' : '#39FF14' }}>
          {totalEP}<span style={{ color: '#333', fontSize: 12 }}>/{MAX_EP}</span>
        </span>
        <span style={{ fontSize: 11, color: '#444', fontFamily: 'Space Mono, monospace', flexShrink: 0 }}>
          {activeSprint.selectedQuestIds.length}
        </span>

        {/* Reset Sprint button */}
        <motion.button
          data-testid="reset-sprint-btn"
          onClick={() => { if (hasSelection) { boop(); dispatch({ type: 'RESET_SPRINT' }); } }}
          title="Reset all selections"
          style={{
            background: 'transparent',
            border: `1px solid ${hasSelection ? 'rgba(255,59,48,0.3)' : 'rgba(255,255,255,0.06)'}`,
            borderRadius: 6,
            padding: '3px 8px',
            cursor: hasSelection ? 'pointer' : 'not-allowed',
            opacity: hasSelection ? 1 : 0.35,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            flexShrink: 0,
          }}
          whileHover={hasSelection ? { background: 'rgba(255,59,48,0.1)', borderColor: 'rgba(255,59,48,0.6)' } : {}}
          whileTap={hasSelection ? { scale: 0.94 } : {}}
        >
          <RotateCcw size={10} color={hasSelection ? '#FF3B30' : '#333'} />
          <span style={{ fontSize: 10, color: hasSelection ? '#FF3B30' : '#333', fontFamily: 'Space Mono, monospace' }}>
            RESET
          </span>
        </motion.button>
      </div>

      {/* Blueprint — all floors collapsed by default */}
      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        {/* Mobile receipt bar (replaces building panel on small screens) */}
        <MobileReceiptBar />

        {blueprint.floors.map(floor => (
          <FloorSection key={floor.id} floor={floor} />
        ))}
        <div style={{ height: 20 }} />
      </div>

      {/* Launch footer */}
      <div className="px-4 py-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <AnimatePresence>
          {launchError && (
            <motion.div
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-start gap-2 mb-3 p-3"
              style={{ background: 'rgba(239,68,68,0.08)', borderRadius: 10, border: '1px solid rgba(239,68,68,0.28)' }}
            >
              <AlertTriangle size={14} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: '#ef4444', margin: 0, lineHeight: 1.5, fontFamily: 'Space Mono, monospace' }}>{launchError}</p>
              <button onClick={() => dispatch({ type: 'CLEAR_ERROR' })} style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                <X size={12} color="#555" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          data-testid="launch-mission-btn"
          onClick={() => { boop(); dispatch({ type: 'LAUNCH_MISSION' }); }}
          disabled={!canLaunch}
          className="w-full flex items-center justify-center gap-3 py-4 font-orbitron font-black"
          style={{
            background: canLaunch ? '#39FF14' : 'rgba(255,255,255,0.04)',
            border: `1.5px solid ${canLaunch ? '#39FF14' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 12,
            color: canLaunch ? '#000' : '#333',
            fontSize: 14,
            letterSpacing: '0.18em',
            cursor: canLaunch ? 'pointer' : 'not-allowed',
            boxShadow: canLaunch ? '0 0 24px rgba(57,255,20,0.28)' : 'none',
          }}
          whileHover={canLaunch ? { boxShadow: '0 0 40px rgba(57,255,20,0.45)', scale: 1.01 } : {}}
          whileTap={canLaunch ? { scale: 0.97 } : {}}
        >
          <Rocket size={16} />
          LAUNCH MISSION
        </motion.button>
      </div>
    </div>
  );
}
